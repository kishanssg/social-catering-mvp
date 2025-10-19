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
      def bulk_create
        worker_id = params[:worker_id]
        shift_ids = params[:shift_ids] || []
        hours_worked = params[:hours_worked]
        
        unless worker_id.present? && shift_ids.any?
          return render json: {
            status: 'error',
            message: 'worker_id and shift_ids are required'
          }, status: :bad_request
        end
        
        worker = Worker.find(worker_id)
        results = { successful: [], failed: [] }
        
        shift_ids.each do |shift_id|
          shift = Shift.find(shift_id)
          staffing = Staffing.new(
            worker: worker,
            shift: shift,
            hours_worked: hours_worked,
            assigned_by_id: current_user.id,
            assigned_at_utc: Time.current,
            status: 'assigned'
          )
          
          if staffing.save
            results[:successful] << {
              shift_id: shift.id,
              event_title: shift.event&.title,
              assignment_id: staffing.id
            }
          else
            results[:failed] << {
              shift_id: shift.id,
              event_title: shift.event&.title,
              errors: staffing.errors.full_messages
            }
          end
        end
        
        render json: {
          status: 'success',
          message: "Assigned to #{results[:successful].count} shifts. #{results[:failed].count} failed.",
          data: results
        }
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
    end
  end
end
