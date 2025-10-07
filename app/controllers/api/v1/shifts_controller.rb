module Api
  module V1
    class ShiftsController < BaseController
      def index
        shifts = Shift.includes(:workers, :assignments)
          .order(start_time_utc: :asc)
        
        # Filter by status if provided
        shifts = shifts.where(status: params[:status]) if params[:status].present?
        
        # Filter by timeframe
        shifts = apply_timeframe_filter(shifts)
        
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
          :notes
        )
      end
      
      def apply_timeframe_filter(scope)
        case params[:timeframe]
        when 'past'
          scope.past
        when 'today'
          scope.today
        when 'upcoming'
          scope.upcoming
        else
          scope
        end
      end
    end
  end
end
