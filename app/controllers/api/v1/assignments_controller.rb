module Api
  module V1
    class AssignmentsController < BaseController
      def index
        assignments = Assignment.includes(:worker, :shift, :assigned_by)
        
        # Filter by status if provided
        if params[:status].present?
          assignments = assignments.where(status: params[:status])
        end
        
        # Filter by worker if provided
        if params[:worker_id].present?
          assignments = assignments.where(worker_id: params[:worker_id])
        end
        
        # Filter by shift if provided
        if params[:shift_id].present?
          assignments = assignments.where(shift_id: params[:shift_id])
        end
        
        # Filter by timeframe
        assignments = apply_timeframe_filter(assignments)
        
        # Order by assigned_at_utc descending (most recent first)
        assignments = assignments.order(assigned_at_utc: :desc)
        
        render_success({
          assignments: assignments.as_json(
            include: {
              worker: { only: [:id, :first_name, :last_name, :email, :phone] },
              shift: { 
                only: [:id, :client_name, :role_needed, :location, :start_time_utc, :end_time_utc, :pay_rate, :status],
                methods: [:assigned_count, :available_slots]
              },
              assigned_by: { only: [:id, :email] }
            }
          )
        })
      end
      
      def create
        assignment_params = params.require(:assignment).permit(:shift_id, :worker_id, :status)
        shift = Shift.find(assignment_params[:shift_id])
        worker = Worker.find(assignment_params[:worker_id])
        
        result = AssignWorkerToShift.call(shift, worker, current_user)
        
        if result[:success]
          render_success(result[:data], status: :created)
        else
          status = result[:status] || :unprocessable_entity
          render_error(result[:error], status: status)
        end
      end
      
      def update
        assignment = Assignment.find(params[:id])
        
        if assignment.update(assignment_params)
          render_success({
            assignment: assignment.as_json(
              include: {
                worker: { only: [:id, :first_name, :last_name, :email, :phone] },
                shift: { 
                  only: [:id, :client_name, :role_needed, :location, :start_time_utc, :end_time_utc, :pay_rate, :status],
                  methods: [:assigned_count, :available_slots]
                },
                assigned_by: { only: [:id, :email] }
              }
            )
          })
        else
          render_validation_errors(assignment.errors.messages)
        end
      end
      
      def destroy
        assignment = Assignment.find(params[:id])
        
        result = UnassignWorkerFromShift.call(assignment, current_user)
        
        if result[:success]
          render_success(result[:data])
        else
          render_error(result[:error])
        end
      end
      
      private
      
      def assignment_params
        params.require(:assignment).permit(:status)
      end
      
      def apply_timeframe_filter(scope)
        case params[:timeframe]
        when 'past'
          scope.joins(:shift).where('shifts.end_time_utc < ?', Time.current)
        when 'today'
          scope.joins(:shift).where('DATE(shifts.start_time_utc) = ?', Time.current.utc.to_date)
        when 'upcoming'
          scope.joins(:shift).where('shifts.start_time_utc > ?', Time.current)
        else
          scope
        end
      end
    end
  end
end
