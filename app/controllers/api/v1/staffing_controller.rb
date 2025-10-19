module Api
  module V1
    class StaffingController < BaseController
      before_action :authenticate_user!
      before_action :set_staffing, only: [:show, :update, :destroy]
      
      # GET /api/v1/staffing
      # Query params: event_id, worker_id, status, start_date, end_date
      def index
        staffing = Staffing.includes(worker: [], shift: [:event, :skill_requirement])
                           .order(created_at: :desc)
        
        # Filter by event
        if params[:event_id].present?
          staffing = staffing.for_event(params[:event_id])
        end
        
        # Filter by worker
        if params[:worker_id].present?
          staffing = staffing.where(worker_id: params[:worker_id])
        end
        
        # Filter by date range
        if params[:start_date].present? && params[:end_date].present?
          staffing = staffing.for_date_range(
            Date.parse(params[:start_date]),
            Date.parse(params[:end_date])
          )
        end
        
        # Filter by status
        case params[:status]
        when 'completed'
          staffing = staffing.completed
        when 'upcoming'
          staffing = staffing.upcoming
        end
        
        render json: {
          status: 'success',
          data: staffing.map { |s| serialize_staffing(s) }
        }
      end
      
      # GET /api/v1/staffing/:id
      def show
        render json: {
          status: 'success',
          data: serialize_staffing_detailed(@staffing)
        }
      end
      
      # POST /api/v1/staffing
      def create
        @staffing = Staffing.new(staffing_params)
        @staffing.assigned_by_id = current_user.id
        @staffing.assigned_at_utc ||= Time.current
        @staffing.status ||= 'assigned'
        
        if @staffing.save
          render json: {
            status: 'success',
            message: 'Worker assigned successfully',
            data: serialize_staffing(@staffing)
          }, status: :created
        else
          render json: {
            status: 'error',
            errors: @staffing.errors.full_messages
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
          return render json: {
            status: 'error',
            message: 'Worker has conflicting shift times',
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
            assignment = Staffing.new(
              worker: worker,
              shift: shift,
              status: 'confirmed'
            )
            
            if assignment.save
              assignments << assignment
              
              # Log activity
              ActivityLog.create(
                action: 'staffing_created',
                resource_type: 'Staffing',
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
          render json: {
            status: 'error',
            message: 'Failed to create some assignments',
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
        if @staffing.update(staffing_params)
          render json: {
            status: 'success',
            data: serialize_staffing(@staffing)
          }
        else
          render json: {
            status: 'error',
            errors: @staffing.errors.full_messages
          }, status: :unprocessable_entity
        end
      end
      
      # DELETE /api/v1/staffing/:id
      def destroy
        @staffing.destroy
        
        render json: {
          status: 'success',
          message: 'Worker assignment removed successfully'
        }
      end
      
      private
      
      def set_staffing
        @staffing = Staffing.includes(worker: [], shift: [:event]).find(params[:id])
      end
      
      def staffing_params
        params.require(:staffing).permit(
          :worker_id, :shift_id, :hours_worked, :status, :notes, 
          :clock_in_time, :clock_out_time, :break_duration_minutes, 
          :overtime_hours, :performance_rating, :hourly_rate
        )
      end
      
      def serialize_staffing(staffing)
        {
          id: staffing.id,
          worker: {
            id: staffing.worker.id,
            first_name: staffing.worker.first_name,
            last_name: staffing.worker.last_name,
            email: staffing.worker.email,
            phone: staffing.worker.phone
          },
          shift: {
            id: staffing.shift.id,
            role_needed: staffing.shift.role_needed,
            start_time_utc: staffing.shift.start_time_utc,
            end_time_utc: staffing.shift.end_time_utc,
            location: staffing.shift.location
          },
          event: staffing.event ? {
            id: staffing.event.id,
            title: staffing.event.title,
            supervisor_name: staffing.event.supervisor_name
          } : nil,
          hours_worked: staffing.hours_worked,
          hourly_rate: staffing.hourly_rate,
          total_pay: staffing.total_pay,
          status: staffing.status,
          is_completed: staffing.is_completed?,
          created_at: staffing.created_at
        }
      end
      
      def serialize_staffing_detailed(staffing)
        serialize_staffing(staffing).merge(
          notes: staffing.notes,
          clock_in_time: staffing.clock_in_time,
          clock_out_time: staffing.clock_out_time,
          break_duration_minutes: staffing.break_duration_minutes,
          overtime_hours: staffing.overtime_hours,
          performance_rating: staffing.performance_rating
        )
      end
      
      # Check if worker has any shifts that overlap with the new shifts
      def check_scheduling_conflicts(worker, new_shifts)
        conflicts = []
        
        # Get all existing confirmed assignments for this worker
        existing_assignments = worker.assignments
                                    .where(status: ['confirmed', 'completed'])
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
          created_at: assignment.created_at_utc,
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
