module Api
  module V1
    class ShiftsController < BaseController
      def index
        shifts = Shift.includes(:workers, :assignments)
        
        # Filter by status if provided
        if params[:status].present?
          shifts = shifts.where(status: params[:status])
        end
        
        # Filter by timeframe
        shifts = apply_timeframe_filter(shifts)
        
        # Filter by fill status
        if params[:fill_status].present?
          shifts = apply_fill_status_filter(shifts)
          # Fill status filter returns an Array, so sort it manually
          shifts = shifts.sort_by { |s| s.start_time_utc }
        else
          # Order by start time for ActiveRecord relations
          shifts = shifts.order(start_time_utc: :asc)
        end
        
        render_success({
          shifts: shifts.as_json(
            include: {
              workers: { only: [:id, :first_name, :last_name] },
              assignments: { only: [:id, :status, :worker_id] }
            },
            methods: [:assigned_count, :available_slots]
          )
        })
      end
      
      def show
        shift = Shift.includes(:workers, :assignments, :created_by).find(params[:id])
        
        render_success({
          shift: shift.as_json(
            include: {
              workers: { only: [:id, :first_name, :last_name] },
              assignments: { only: [:id, :status, :worker_id, :assigned_at_utc] },
              created_by: { only: [:id, :email] }
            },
            methods: [:assigned_count, :available_slots]
          )
        })
      end
      
      def create
        shift = Shift.new(shift_params)
        shift.created_by = current_user
        
        if shift.save
          render_success({ shift: shift }, status: :created)
        else
          render_validation_errors(shift.errors.messages)
        end
      end
      
      def update
        shift = Shift.find(params[:id])
        
        if shift.update(shift_params)
          render_success({ shift: shift })
        else
          render_validation_errors(shift.errors.messages)
        end
      end
      
      def destroy
        shift = Shift.find(params[:id])
        
        if shift.assignments.any?
          render_error("Cannot delete shift with assignments", status: :unprocessable_entity)
        else
          shift.destroy
          render_success({ message: "Shift deleted successfully" })
        end
      end
      
      private
      
      def shift_params
        params.require(:shift).permit(
          :client_name,
          :role_needed,
          :location,
          :start_time_utc,
          :end_time_utc,
          :pay_rate,
          :capacity,
          :status,
          :notes,
          :required_cert_id
        )
      end
      
      def apply_timeframe_filter(scope)
        case params[:timeframe]
        when 'past'
          scope.where('end_time_utc < ?', Time.current)
        when 'today'
          scope.where('DATE(start_time_utc) = ?', Time.current.utc.to_date)
        when 'upcoming'
          scope.where('start_time_utc > ?', Time.current)
        else
          scope
        end
      end
      
      def apply_fill_status_filter(scope)
        # This requires loading shifts to calculate, so do it after other filters
        all_shifts = scope.to_a
        
        case params[:fill_status]
        when 'unfilled'
          all_shifts.select { |s| s.assigned_count == 0 }
        when 'partial'
          all_shifts.select { |s| s.assigned_count > 0 && s.assigned_count < s.capacity }
        when 'covered'
          all_shifts.select { |s| s.assigned_count >= s.capacity }
        else
          all_shifts
        end
      end
    end
  end
end
