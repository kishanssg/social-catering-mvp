module Api
  module V1
    class StaffingController < BaseController
      before_action :authenticate_user!
      before_action :set_assignment, only: [:show, :update, :destroy]
      
      # GET /api/v1/staffing
      # Query params: event_id, worker_id, status, start_date, end_date
      def index
        assignments = Assignment.includes(worker: [], shift: [:event, :skill_requirement])
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
      
      # POST /api/v1/staffing/bulk_create
      # Assign one worker to multiple shifts
      def bulk_create
        worker = Worker.find_by(id: params[:worker_id])
        
        unless worker
          return render json: {
            status: 'error',
            message: 'Worker not found'
          }, status: :not_found
        end
        
        shift_ids = params[:shift_ids] || []
        
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
        
        # Check for conflicts (worker already assigned to overlapping shifts)
        conflicts = check_scheduling_conflicts(worker, shifts)
        
        if conflicts.any?
          conflict_details = conflicts.map do |c|
            new_shift = c[:new_shift]
            conflicting_shifts = c[:conflicting_shifts]
            
            conflict_messages = conflicting_shifts.map do |s|
              "#{s.event&.title} (#{s.start_time_utc.strftime('%m/%d at %I:%M %p')} - #{s.end_time_utc.strftime('%I:%M %p')})"
            end
            
            "#{new_shift.event&.title} (#{new_shift.start_time_utc.strftime('%m/%d at %I:%M %p')} - #{new_shift.end_time_utc.strftime('%I:%M %p')}) conflicts with: #{conflict_messages.join(', ')}"
          end
          
          return render json: {
            status: 'error',
            message: 'Scheduling conflicts detected',
            details: conflict_details,
            conflicts: conflicts.map { |c|
              {
                new_shift: {
                  id: c[:new_shift].id,
                  event: c[:new_shift].event&.title,
                  start_time: c[:new_shift].start_time_utc,
                  end_time: c[:new_shift].end_time_utc
                },
                conflicting_with: c[:conflicting_shifts].map { |s|
                  {
                    id: s.id,
                    event: s.event&.title,
                    start_time: s.start_time_utc,
                    end_time: s.end_time_utc
                  }
                }
              }
            }
          }, status: :unprocessable_entity
        end
        
        # Create assignments in a transaction
        assignments = []
        errors = []
        
        ActiveRecord::Base.transaction do
          shifts.each do |shift|
            # Check for conflicts using the shift's conflict_reason method
            conflict_reason = shift.conflict_reason(worker)
            if conflict_reason.present?
              errors << {
                shift_id: shift.id,
                event: shift.event&.title,
                errors: [conflict_reason]
              }
              next
            end
            
            assignment = Assignment.new(
              worker: worker,
              shift: shift,
              status: 'confirmed',
              assigned_by_id: current_user.id,
              assigned_at_utc: Time.current,
              hourly_rate: shift.pay_rate
            )
            
            if assignment.save
              assignments << assignment
              
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
          end
          
          # Rollback if any errors
          raise ActiveRecord::Rollback if errors.any?
        end
        
        if errors.any?
          # Create user-friendly error messages
          error_messages = errors.map do |error|
            shift_info = "Shift #{error[:shift_id]} (#{error[:event]})"
            error_details = error[:errors].join(', ')
            "#{shift_info}: #{error_details}"
          end
          
          render json: {
            status: 'error',
            message: 'Some assignments could not be created',
            details: error_messages,
            errors: errors
          }, status: :unprocessable_entity
        else
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
            location: assignment.shift.location
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
            location: assignment.shift.location,
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
