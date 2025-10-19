module Api
  module V1
    class AssignmentsController < BaseController
      before_action :set_assignment, only: [:show, :update, :destroy]

      def index
        assignments = Assignment.includes(:worker, shift: :event)
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

      def bulk_create
        worker_id = params[:worker_id]
        shift_ids = params[:shift_ids] || []
        hours_worked = params[:hours_worked]

        unless worker_id.present? && shift_ids.any?
          return render json: { status: 'error', message: 'worker_id and shift_ids are required' }, status: :bad_request
        end

        worker = Worker.find(worker_id)
        results = { successful: [], failed: [] }

        shift_ids.each do |shift_id|
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
        end

        render json: { status: 'success', message: "Assigned to #{results[:successful].count} shifts. #{results[:failed].count} failed.", data: results }
      end

      def update
        if @assignment.update(assignment_params)
          render json: { status: 'success', data: serialize_assignment(@assignment) }
        else
          render json: { status: 'error', errors: @assignment.errors.full_messages }, status: :unprocessable_entity
        end
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
        @assignment = Assignment.includes(:worker, shift: :job).find(params[:id])
      end

      def assignment_params
        params.require(:assignment).permit(
          :worker_id, :shift_id, :hours_worked, :status, :hourly_rate,
          :notes, :break_duration_minutes, :overtime_hours, :performance_rating
        )
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
            location: assignment.shift.location,
            job_id: assignment.shift.job_id,
            job_title: assignment.shift.job&.title
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
