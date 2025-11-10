module Api
  module V1
    class StaffingController < BaseController
      before_action :authenticate_user!
      before_action :set_assignment, only: [:show, :update, :destroy]
      
      # GET /api/v1/staffing
      # Query params: event_id, worker_id, status, start_date, end_date
      def index
        # Filter out orphaned assignments (deleted events, archived shifts, blank event titles)
        # Use eager_load instead of includes when we have joins in valid scope
        assignments = Assignment
                           .joins(:shift)
                           .left_joins(shift: :event)
                           .where.not(shifts: { status: 'archived' })
                           .where("shifts.event_id IS NULL OR (
                             events.id IS NOT NULL 
                             AND events.status != 'deleted'
                             AND events.title IS NOT NULL
                             AND events.title != ''
                             AND TRIM(events.title) != ''
                           )")
                           .eager_load(worker: [], shift: [:event, :skill_requirement])
                           .order(created_at: :desc)
        
        # Filter by event
        if params[:event_id].present?
          assignments = assignments.for_event(params[:event_id])
        end
        
        # Filter by worker
        if params[:worker_id].present?
          assignments = assignments.where(worker_id: params[:worker_id])
        end
        
        # Filter by date range
        if params[:start_date].present? && params[:end_date].present?
          assignments = assignments.for_date_range(
            Date.parse(params[:start_date]),
            Date.parse(params[:end_date])
          )
        end
        
        # Filter by status
        case params[:status]
        when 'completed'
          assignments = assignments.completed
        when 'upcoming'
          assignments = assignments.upcoming
        end
        
        render json: {
          status: 'success',
          data: assignments.map { |a| serialize_assignment(a) }
        }
      end
      
      # GET /api/v1/staffing/:id
      def show
        render json: {
          status: 'success',
          data: serialize_assignment_detailed(@assignment)
        }
      end
      
      # POST /api/v1/staffing
      def create
        @assignment = Assignment.new(assignment_params)
        
        # Prevent assigning inactive workers
        unless @assignment.worker&.active?
          return render json: {
            status: 'error',
            message: 'Cannot assign inactive worker. Please activate the worker first.'
          }, status: :unprocessable_entity
        end
        
        @assignment.assigned_by_id = current_user.id
        @assignment.assigned_at_utc ||= Time.current
        @assignment.status ||= 'assigned'
        
        # Use provided hourly_rate, or fall back to shift's pay_rate
        if @assignment.hourly_rate.blank? && @assignment.shift
          @assignment.hourly_rate = @assignment.shift.pay_rate
        end
        
        if @assignment.save
          render json: {
            status: 'success',
            message: 'Worker assigned successfully',
            data: serialize_assignment(@assignment)
          }, status: :created
        else
          render json: {
            status: 'error',
            errors: @assignment.errors.full_messages
          }, status: :unprocessable_entity
        end
      end
      
      # POST /api/v1/staffing/validate_bulk
      # Pre-validate worker assignments before submission
      def validate_bulk
        worker_id = params[:worker_id]
        shift_ids = params[:shift_ids] || []
        
        worker = Worker.find_by(id: worker_id)
        
        unless worker
          return render json: {
            status: 'error',
            message: 'Worker not found'
          }, status: :not_found
        end
        
        if shift_ids.empty?
          return render json: {
            status: 'error',
            message: 'No shifts provided'
          }, status: :unprocessable_entity
        end
        
        shifts = Shift.where(id: shift_ids).includes(:event, :assignments)
        
        if shifts.count != shift_ids.count
          return render json: {
            status: 'error',
            message: 'Some shifts not found'
          }, status: :not_found
        end
        
        valid_shifts = []
        invalid_shifts = []
        
        # Get existing assignments for conflict checking
        existing_assignments = worker.assignments
                                     .where(status: ['assigned', 'confirmed', 'completed'])
                                     .joins(:shift)
                                     .select('assignments.*, shifts.start_time_utc, shifts.end_time_utc, shifts.client_name')
                                     .to_a
        
        # Check each shift
        shifts.each do |shift|
          errors = []
          
          # Check time overlap with existing assignments
          conflicting = existing_assignments.find do |assignment|
            shift_start = shift.start_time_utc
            shift_end = shift.end_time_utc
            
            shift_start < assignment.end_time_utc && shift_end > assignment.start_time_utc
          end
          
          if conflicting
            start_time = conflicting.start_time_utc.strftime('%I:%M %p')
            end_time = conflicting.end_time_utc.strftime('%I:%M %p')
            errors << {
              type: 'time_conflict',
              message: "Conflicts with '#{conflicting.client_name}' (#{start_time} - #{end_time})"
            }
          end
          
          # Check capacity
          active_count = shift.assignments.where.not(status: ['cancelled', 'no_show']).count
          if active_count >= shift.capacity
            errors << {
              type: 'capacity',
              message: "Shift is at full capacity (#{active_count}/#{shift.capacity})"
            }
          end
          
          # Check skills
          if shift.role_needed.present?
            worker_skills = case worker.skills_json
                           when String then JSON.parse(worker.skills_json) rescue []
                           when Array then worker.skills_json
                           else []
                           end
            
            unless worker_skills.include?(shift.role_needed)
              errors << {
                type: 'skill_mismatch',
                message: "Worker does not have required skill: #{shift.role_needed}"
              }
            end
          end
          
          if errors.empty?
            valid_shifts << shift.id
          else
            invalid_shifts << {
              shift_id: shift.id,
              event_title: shift.event&.title || shift.client_name,
              errors: errors
            }
          end
        end
        
        render json: {
          status: 'success',
          data: {
            valid_shifts: valid_shifts,
            invalid_shifts: invalid_shifts
          }
        }
      end
      
      # POST /api/v1/staffing/bulk_create
      # Assign one worker to multiple shifts
      # Supports two formats:
      # 1. worker_id + shift_ids (newer)
      # 2. assignments array with shift_id and worker_id (legacy)
      def bulk_create
        # Support both formats
        if params[:worker_id].present? && params[:shift_ids].present?
          # Format 1: worker_id + shift_ids array
        worker = Worker.find_by(id: params[:worker_id])
          shift_ids = params[:shift_ids] || []
          hourly_rates = {} # Not provided in format 1
        elsif params[:assignments].present?
          # Format 2: assignments array with shift_id and worker_id
          first_assignment = params[:assignments].first
          worker_id = first_assignment[:worker_id] || first_assignment['worker_id']
          worker = Worker.find_by(id: worker_id)
          
          if worker_id.blank? || !worker
            return render json: {
              status: 'error',
              message: 'Worker not found in assignments'
            }, status: :not_found
          end
          
          shift_ids = params[:assignments].map { |a| a[:shift_id] || a['shift_id'] }.compact
          
          # Extract hourly_rates by shift_id for later use
          hourly_rates = {}
          params[:assignments].each do |a|
            shift_id = a[:shift_id] || a['shift_id']
            hourly_rate = a[:hourly_rate] || a['hourly_rate']
            hourly_rates[shift_id] = hourly_rate if shift_id && hourly_rate
          end
        else
          return render json: {
            status: 'error',
            message: 'Worker ID and shifts required'
          }, status: :unprocessable_entity
        end
        
        unless worker
          return render json: {
            status: 'error',
            message: 'Worker not found'
          }, status: :not_found
        end
        
        shift_ids = shift_ids.compact.reject(&:blank?)
        
        if shift_ids.empty?
          return render json: {
            status: 'error',
            message: 'No shifts provided'
          }, status: :unprocessable_entity
        end
        
        shifts = Shift.where(id: shift_ids).includes(:event)
        
        if shifts.count != shift_ids.count
          return render json: {
            status: 'error',
            message: 'Some shifts not found'
          }, status: :not_found
        end
        
        # CRITICAL FIX: Check intra-batch overlaps first (shifts in batch against each other)
        # Sort shifts by start time for efficient overlap checking
        sorted_shifts = shifts.sort_by(&:start_time_utc)
        
        # Check each shift against every other shift in the batch for time overlaps
        (0...sorted_shifts.length).each do |i|
          ((i+1)...sorted_shifts.length).each do |j|
            shift_a = sorted_shifts[i]
            shift_b = sorted_shifts[j]
            
            # DEBUG: Log the shift details
            Rails.logger.info("DEBUG: Comparing shifts:")
            Rails.logger.info("  Shift A: #{shift_a.event&.title} - #{shift_a.start_time_utc} to #{shift_a.end_time_utc}")
            Rails.logger.info("  Shift B: #{shift_b.event&.title} - #{shift_b.start_time_utc} to #{shift_b.end_time_utc}")
            
            # Skip if same shift ID (duplicate selection in batch)
            if shift_a.id == shift_b.id
              Rails.logger.info("  Skipping: Same shift ID")
              next
            end
            
            # STRICT RULE: No worker can be assigned to multiple roles at overlapping times
            # This prevents same person working different roles simultaneously (physically impossible)
            
            # Check if they overlap: (startA < endB) AND (endA > startB)
            check1 = shift_a.start_time_utc < shift_b.end_time_utc
            check2 = shift_a.end_time_utc > shift_b.start_time_utc
            Rails.logger.info("  Check1 (A.start < B.end): #{check1}")
            Rails.logger.info("  Check2 (A.end > B.start): #{check2}")
            Rails.logger.info("  Overlaps: #{check1 && check2}")
            
            if check1 && check2
              start_a = shift_a.start_time_utc.strftime('%I:%M %p')
              end_a = shift_a.end_time_utc.strftime('%I:%M %p')
              start_b = shift_b.start_time_utc.strftime('%I:%M %p')
              end_b = shift_b.end_time_utc.strftime('%I:%M %p')
          
          return render json: {
            status: 'error',
                message: 'Cannot assign to overlapping shifts in the same batch',
                errors: [{
                  type: 'batch_overlap',
                  message: "'#{shift_a.event&.title || 'Unknown Event'}' (#{start_a} - #{end_a}) overlaps with '#{shift_b.event&.title || 'Unknown Event'}' (#{start_b} - #{end_b})"
                }]
          }, status: :unprocessable_entity
            end
          end
        end
        
      # Now proceed with individual assignment processing (NO transaction wrap for partial success)
        assignments = []
        errors = []
        
      # Get all existing assignments for the worker to check conflicts
      existing_assignments = worker.assignments
                                   .where(status: ['assigned', 'confirmed', 'completed'])
                                   .includes(:shift)
                                   .to_a
      
          shifts.each do |shift|
        begin
          # Check for conflicts with EXISTING assignments
          conflict_with_existing = existing_assignments.any? do |existing_assignment|
            existing_shift = existing_assignment.shift
            # Two shifts overlap if: (startA < endB) AND (endA > startB)
            (shift.start_time_utc < existing_shift.end_time_utc) &&
            (shift.end_time_utc > existing_shift.start_time_utc)
          end
            
          if conflict_with_existing
            conflicting_assignment = existing_assignments.find do |existing_assignment|
              existing_shift = existing_assignment.shift
              (shift.start_time_utc < existing_shift.end_time_utc) &&
              (shift.end_time_utc > existing_shift.start_time_utc)
            end
            
            conflicting_shift = conflicting_assignment.shift
            start_time = conflicting_shift.start_time_utc.strftime('%I:%M %p')
            end_time = conflicting_shift.end_time_utc.strftime('%I:%M %p')
            
            errors << {
              shift_id: shift.id,
              event: shift.event&.title,
              errors: ["Worker has conflicting shift '#{conflicting_shift.client_name}' (#{start_time} - #{end_time})"]
            }
            next
          end
            
          # Check skill requirements
          if shift.role_needed.present?
            worker_skills = case worker.skills_json
                           when String then JSON.parse(worker.skills_json) rescue []
                           when Array then worker.skills_json
                           else []
                           end
              
            unless worker_skills.include?(shift.role_needed)
              errors << {
                shift_id: shift.id,
                event: shift.event&.title,
                errors: ["Worker does not have required skill: #{shift.role_needed}"]
              }
              next
            end
          end
            
          # Check capacity
          active_assignments_count = shift.assignments
                                         .where.not(status: ['cancelled', 'no_show'])
                                         .count
            
          if active_assignments_count >= shift.capacity
            errors << {
              shift_id: shift.id,
              event: shift.event&.title,
              errors: ["Shift is already at full capacity (#{active_assignments_count}/#{shift.capacity} workers assigned)"]
            }
            next
          end
          
          # CRITICAL FIX: Hourly rate fallback chain
          # 1. Try hourly_rate from params hash
          # 2. Fall back to shift.pay_rate
          # 3. Fall back to default pay rate (AppConstants::DEFAULT_PAY_RATE)
          assignment_hourly_rate = if hourly_rates[shift.id].present? && hourly_rates[shift.id] > 0
            hourly_rates[shift.id]
          elsif shift.pay_rate.present? && shift.pay_rate > 0
            shift.pay_rate
          else
            AppConstants::DEFAULT_PAY_RATE # Default minimum wage
            end
            
            assignment = Assignment.new(
              worker: worker,
              shift: shift,
              status: 'confirmed',
              assigned_by_id: current_user.id,
            assigned_at_utc: Time.current,
            hourly_rate: assignment_hourly_rate
            )
            
            if assignment.save
              assignments << assignment
              
            # Add to existing_assignments to check against in next iteration
            existing_assignments << assignment
              
              # Log activity
              ActivityLog.create(
                action: 'staffing_created',
                resource_type: 'Assignment',
                resource_id: assignment.id,
                details: {
                  worker_id: worker.id,
                  worker_name: "#{worker.first_name} #{worker.last_name}",
                  shift_id: shift.id,
                  event_title: shift.event&.title,
                  bulk_assignment: true
                }
              ) rescue nil
            else
              errors << {
                shift_id: shift.id,
                event: shift.event&.title,
                errors: assignment.errors.full_messages
              }
            end
        rescue => e
          errors << {
            shift_id: shift.id,
            event: shift.event&.title,
            errors: [e.message]
          }
        end
      end
        
      # CRITICAL FIX: Partial success mode - return results for both successful and failed
      if assignments.empty? && errors.any?
        # All failed
          error_messages = errors.map do |error|
            shift_info = "Shift #{error[:shift_id]} (#{error[:event]})"
            error_details = error[:errors].join(', ')
            "#{shift_info}: #{error_details}"
          end
          
          render json: {
            status: 'error',
          message: 'All assignments failed',
            details: error_messages,
          successful: [],
          failed: errors.map do |e|
            {
              shift_id: e[:shift_id],
              event: e[:event],
              reasons: e[:errors]
            }
          end
          }, status: :unprocessable_entity
      elsif assignments.any? && errors.any?
        # Partial success
        render json: {
          status: 'partial_success',
          message: "Successfully scheduled #{worker.first_name} #{worker.last_name} for #{assignments.count} of #{shifts.count} shift#{shifts.count != 1 ? 's' : ''}",
          data: {
            successful: assignments.map { |a| serialize_assignment(a) },
            failed: errors.map do |e|
              {
                shift_id: e[:shift_id],
                event: e[:event],
                reasons: e[:errors]
              }
            end,
            total_requested: shifts.count,
            total_successful: assignments.count,
            total_failed: errors.count
          }
        }, status: :multi_status
      else
        # All succeeded
          render json: {
            status: 'success',
            message: "Successfully scheduled #{worker.first_name} #{worker.last_name} for #{assignments.count} shift#{assignments.count != 1 ? 's' : ''}",
            data: {
              created: assignments.count,
              assignments: assignments.map { |a| serialize_assignment(a) }
            }
          }
        end
      end
      
      # PATCH /api/v1/staffing/:id
      def update
        if @assignment.update(assignment_params)
          render json: {
            status: 'success',
            data: serialize_assignment(@assignment)
          }
        else
          render json: {
            status: 'error',
            errors: @assignment.errors.full_messages
          }, status: :unprocessable_entity
        end
      end
      
      # DELETE /api/v1/staffing/:id
      def destroy
        @assignment.destroy
        
        render json: {
          status: 'success',
          message: 'Worker assignment removed successfully'
        }
      end
      
      private
      
      def set_assignment
        @assignment = Assignment.includes(worker: [], shift: [:event]).find(params[:id])
      end
      
      def assignment_params
        params.require(:assignment).permit(
          :worker_id, :shift_id, :hours_worked, :status, :notes, 
          :clock_in_time, :clock_out_time, :break_duration_minutes, 
          :overtime_hours, :performance_rating, :hourly_rate
        )
      end
      
      def serialize_assignment(assignment)
        {
          id: assignment.id,
          worker: {
            id: assignment.worker.id,
            first_name: assignment.worker.first_name,
            last_name: assignment.worker.last_name,
            email: assignment.worker.email,
            phone: assignment.worker.phone
          },
          shift: {
            id: assignment.shift.id,
            role_needed: assignment.shift.role_needed,
            start_time_utc: assignment.shift.start_time_utc,
            end_time_utc: assignment.shift.end_time_utc,
            location: assignment.shift.location&.display_name || assignment.shift.location&.name || nil
          },
          event: assignment.event ? {
            id: assignment.event.id,
            title: assignment.event.title,
            supervisor_name: assignment.event.supervisor_name
          } : nil,
          hours_worked: assignment.hours_worked,
          hourly_rate: assignment.hourly_rate,
          total_pay: assignment.total_pay,
          status: assignment.status,
          is_completed: assignment.is_completed?,
          created_at: assignment.created_at
        }
      end
      
      def serialize_assignment_detailed(assignment)
        serialize_assignment(assignment).merge(
          notes: assignment.notes,
          clock_in_time: assignment.clock_in_time,
          clock_out_time: assignment.clock_out_time,
          break_duration_minutes: assignment.break_duration_minutes,
          overtime_hours: assignment.overtime_hours,
          performance_rating: assignment.performance_rating
        )
      end
      
      # Check if worker has any shifts that overlap with the new shifts
      def check_scheduling_conflicts(worker, new_shifts)
        conflicts = []
        
        # Get all existing confirmed assignments for this worker
        existing_assignments = worker.assignments
                                    .where(status: ['assigned', 'confirmed', 'completed'])
                                    .where.not(worker_id: nil, shift_id: nil)
                                    .joins(:shift)
                                    .where('shifts.start_time_utc >= ?', Time.current)
                                    .includes(:shift)
        
        new_shifts.each do |new_shift|
          # Find any existing shifts that overlap with this new shift
          overlapping = existing_assignments.select do |assignment|
            existing_shift = assignment.shift
            
            # Two shifts overlap if:
            # (StartA < EndB) AND (EndA > StartB)
            (new_shift.start_time_utc < existing_shift.end_time_utc) &&
            (new_shift.end_time_utc > existing_shift.start_time_utc)
          end
          
          if overlapping.any?
            conflicts << {
              new_shift: new_shift,
              conflicting_shifts: overlapping.map(&:shift)
            }
          end
        end
        
        conflicts
      end
      
      # Serialize assignment for API response
      def serialize_assignment(assignment)
        {
          id: assignment.id,
          worker_id: assignment.worker_id,
          shift_id: assignment.shift_id,
          status: assignment.status,
          created_at: assignment.created_at,
          shift: {
            id: assignment.shift.id,
            role_needed: assignment.shift.role_needed,
            start_time_utc: assignment.shift.start_time_utc,
            end_time_utc: assignment.shift.end_time_utc,
            location: assignment.shift.location&.display_name || assignment.shift.location&.name || nil,
            event: {
              id: assignment.shift.event&.id,
              title: assignment.shift.event&.title
            }
          }
        }
      end
    end
  end
end
