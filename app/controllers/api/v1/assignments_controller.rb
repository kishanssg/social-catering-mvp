module Api
  module V1
    class AssignmentsController < BaseController
      before_action :set_assignment, only: [:show, :update, :destroy]

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
                                .eager_load(:worker, shift: [:event, :location])
                                .eager_load(shift: { event: [:venue] })
                                .order(created_at: :desc)

        # Filter by date range
        if params[:start_date].present? && params[:end_date].present?
          assignments = assignments.for_date_range(
            Date.parse(params[:start_date]),
            Date.parse(params[:end_date])
          )
        end

        # Filter by worker, shift, or event
        assignments = assignments.where(worker_id: params[:worker_id]) if params[:worker_id]
        assignments = assignments.where(shift_id: params[:shift_id]) if params[:shift_id]
        if params[:event_id].present?
          assignments = assignments.joins(:shift).where(shifts: { event_id: params[:event_id] })
        end

        # Filter by reporting fields
        assignments = assignments.clocked_in if params[:clocked_in] == 'true'
        assignments = assignments.clocked_out if params[:clocked_out] == 'true'
        assignments = assignments.with_overtime if params[:with_overtime] == 'true'
        assignments = assignments.rated if params[:rated] == 'true'
        assignments = assignments.high_performance if params[:high_performance] == 'true'

        render json: { status: 'success', data: assignments.map { |a| serialize_assignment(a) } }
      end

      def show
        render json: { status: 'success', data: serialize_assignment_detailed(@assignment) }
      end

      def create
        # Only load what we need for conflict check
        shift = Shift.includes(:event).find(assignment_params[:shift_id])
        worker = Worker.find(assignment_params[:worker_id])
        
        # Prevent assigning inactive workers
        unless worker.active?
          return render json: {
            status: 'error',
            message: 'Cannot assign inactive worker. Please activate the worker first.'
          }, status: :unprocessable_entity
        end
        
        # Fast conflict check (scoped to time window)
        conflicts = check_conflicts_optimized(shift, worker)
        
        if conflicts.any?
          return render json: {
            status: 'error',
            message: 'Assignment conflicts detected',
            conflicts: conflicts
          }, status: :unprocessable_entity
        end
        
        # Create assignment
        ActiveRecord::Base.transaction do
          @assignment = Assignment.new(assignment_params)
          @assignment.assigned_by = current_user
          @assignment.assigned_at_utc ||= Time.current
          @assignment.status ||= 'assigned'
          
          if @assignment.save
            render json: { status: 'success', message: 'Worker assigned successfully', data: serialize_assignment(@assignment) }, status: :created
          else
            render json: { status: 'error', errors: @assignment.errors.full_messages }, status: :unprocessable_entity
          end
        end
      rescue ActiveRecord::RecordNotFound => e
        render json: { status: 'error', message: e.message }, status: :not_found
      end

      def bulk_create
        worker_id = params[:worker_id]
        shift_ids = params[:shift_ids] || []
        hours_worked = params[:hours_worked]

        unless worker_id.present?
          return render json: { status: 'error', message: 'worker_id is required' }, status: :bad_request
        end

        # Handle empty shift_ids array gracefully
        if shift_ids.empty?
          return render json: { 
            status: 'success', 
            message: 'No shifts to assign', 
            data: { successful: [], failed: [] } 
          }
        end

        worker = Worker.find(worker_id)
        
        # Prevent assigning inactive workers
        unless worker.active?
          return render json: {
            status: 'error',
            message: 'Cannot assign inactive worker. Please activate the worker first.'
          }, status: :unprocessable_entity
        end
        
        results = { successful: [], failed: [] }

        shift_ids.each do |shift_id|
          begin
            shift = Shift.find(shift_id)
            assignment = Assignment.new(worker: worker, shift: shift, hours_worked: hours_worked)
            assignment.assigned_by = current_user
            assignment.assigned_at_utc ||= Time.current
            assignment.status ||= 'assigned'
            if assignment.save
              results[:successful] << { shift_id: shift.id, shift_name: shift.client_name, assignment_id: assignment.id }
            else
              results[:failed] << { shift_id: shift.id, shift_name: shift.client_name, errors: assignment.errors.full_messages }
            end
          rescue ActiveRecord::RecordNotFound
            results[:failed] << { shift_id: shift_id, shift_name: "Shift #{shift_id}", errors: ["Shift not found"] }
          end
        end

        render json: { status: 'success', message: "Assigned to #{results[:successful].count} shifts. #{results[:failed].count} failed.", data: results }
      end

      def update
        ActiveRecord::Base.transaction do
          if @assignment.update!(assignment_params)
            # Callbacks will update event totals automatically
            render json: { status: 'success', data: serialize_assignment(@assignment) }
          end
        end
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: 'error', errors: e.record.errors.full_messages }, status: :unprocessable_entity
      rescue => e
        render json: { status: 'error', errors: [e.message] }, status: :unprocessable_entity
      end

      def destroy
        @assignment.destroy
        render json: { status: 'success', message: 'Assignment removed successfully' }
      end

      # Time tracking endpoints
      def clock_in
        if @assignment.clock_in!
          render json: { 
            status: 'success', 
            message: 'Clocked in successfully',
            data: { clock_in_time: @assignment.clock_in_time }
          }
        else
          render json: { 
            status: 'error', 
            message: 'Failed to clock in' 
          }, status: :unprocessable_entity
        end
      end

      def clock_out
        if @assignment.clock_out!
          render json: { 
            status: 'success', 
            message: 'Clocked out successfully',
            data: { 
              clock_out_time: @assignment.clock_out_time,
              hours_worked: @assignment.hours_worked,
              overtime_hours: @assignment.overtime_hours
            }
          }
        else
          render json: { 
            status: 'error', 
            message: 'Failed to clock out' 
          }, status: :unprocessable_entity
        end
      end

      def update_break
        break_minutes = params[:break_duration_minutes].to_i
        if @assignment.update(break_duration_minutes: break_minutes)
          render json: { 
            status: 'success', 
            message: 'Break duration updated',
            data: { break_duration_minutes: @assignment.break_duration_minutes }
          }
        else
          render json: { 
            status: 'error', 
            message: 'Failed to update break duration' 
          }, status: :unprocessable_entity
        end
      end

      def export
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today

        assignments = Assignment.includes(worker: [], shift: [:job])
                                .for_date_range(start_date, end_date)
        assignments = assignments.joins(:shift).where(shifts: { job_id: params[:job_id] }) if params[:job_id].present?

        csv_data = generate_csv(assignments)
        send_data csv_data,
                  filename: "assignments_#{start_date.strftime('%Y%m%d')}_#{end_date.strftime('%Y%m%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      end

      private

      def set_assignment
        @assignment = Assignment.includes(:worker, shift: :event).find(params[:id])
      end

      def assignment_params
        params.require(:assignment).permit(
          :worker_id, :shift_id, :hours_worked, :status, :hourly_rate,
          :notes, :break_duration_minutes, :overtime_hours, :performance_rating
        )
      end

      # Optimized conflict check - only queries relevant time window
      def check_conflicts_optimized(shift, worker)
        conflicts = []
        
        # Only check assignments in a reasonable time window (not ALL assignments)
        # This dramatically reduces query size
        time_window_start = shift.start_time_utc - 1.day
        time_window_end = shift.end_time_utc + 1.day
        
        # Scoped query - much faster than checking all assignments
        existing_assignments = worker.assignments
          .joins(:shift)
          .where.not(status: ['cancelled', 'no_show'])
          .where('shifts.start_time_utc < ? AND shifts.end_time_utc > ?',
                 time_window_end, time_window_start)
          .includes(:shift)
        
        existing_assignments.each do |existing|
          if times_overlap?(shift, existing.shift)
            conflicts << {
              type: 'time_overlap',
              message: "Worker already assigned to #{existing.shift.event&.title || existing.shift.client_name}",
              conflicting_shift_id: existing.shift_id
            }
          end
        end
        
        # Capacity check
        assigned_count = Assignment.where(shift_id: shift.id, status: 'assigned').count
        if assigned_count >= shift.capacity
          conflicts << {
            type: 'capacity_exceeded',
            message: "Shift is at full capacity (#{shift.capacity} workers)",
            current_count: assigned_count
          }
        end
        
        # Certification check (if required)
        if shift.required_cert_id
          cert_ok = worker.worker_certifications
            .where(cert_id: shift.required_cert_id)
            .where('expires_at_utc >= ?', shift.end_time_utc)
            .exists?
          
          unless cert_ok
            conflicts << {
              type: 'certification_expired',
              message: "Worker's certification expires before shift ends or is missing",
              required_cert_id: shift.required_cert_id
            }
          end
        end
        
        conflicts
      end

      def times_overlap?(shift1, shift2)
        shift1.start_time_utc < shift2.end_time_utc &&
        shift1.end_time_utc > shift2.start_time_utc
      end

      def serialize_assignment(assignment)
        {
          id: assignment.id,
          worker: {
            id: assignment.worker.id,
            first_name: assignment.worker.first_name,
            last_name: assignment.worker.last_name,
            email: assignment.worker.email
          },
          shift: {
            id: assignment.shift.id,
            client_name: assignment.shift.client_name,
            role_needed: assignment.shift.role_needed,
            start_time_utc: assignment.shift.start_time_utc,
            end_time_utc: assignment.shift.end_time_utc,
            location: assignment.shift.location&.display_name || assignment.shift.location&.name || nil,
            event_id: assignment.shift.event_id,
            event_title: assignment.shift.event&.title,
            event: assignment.shift.event ? {
              id: assignment.shift.event.id,
              title: assignment.shift.event.title,
              venue_name: assignment.shift.event.venue&.name
            } : nil
          },
          hours_worked: assignment.hours_worked,
          hourly_rate: assignment.hourly_rate,
          status: assignment.status,
          notes: assignment.notes,
          clock_in_time: assignment.clock_in_time,
          clock_out_time: assignment.clock_out_time,
          break_duration_minutes: assignment.break_duration_minutes,
          overtime_hours: assignment.overtime_hours,
          performance_rating: assignment.performance_rating,
          is_clocked_in: assignment.is_clocked_in?,
          created_at: assignment.created_at
        }
      end

      def serialize_assignment_detailed(assignment)
        serialize_assignment(assignment).merge(
          shift_details: {
            pay_rate: assignment.shift.pay_rate,
            notes: assignment.shift.notes,
            supervisor_name: assignment.shift.job&.supervisor_name,
            supervisor_phone: assignment.shift.job&.supervisor_phone
          }
        )
      end

      def generate_csv(assignments)
        require 'csv'
        CSV.generate(headers: true) do |csv|
          csv << ['Date','Event/Client','Location','Role','Worker','Hours','Rate','Total']
          assignments.each do |assignment|
            shift = assignment.shift
            worker = assignment.worker
            csv << [
              shift.start_time_utc.strftime('%Y-%m-%d'),
              shift.job&.title || shift.client_name,
              shift.location,
              shift.role_needed,
              "#{worker.first_name} #{worker.last_name}",
              assignment.hours_worked || 0,
              shift.pay_rate || 0,
              (assignment.hours_worked || 0) * (shift.pay_rate || 0)
            ]
          end
        end
      end
    end
  end
end
