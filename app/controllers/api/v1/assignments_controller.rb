module Api
  module V1
    class AssignmentsController < BaseController
      def create
        shift = Shift.find(params[:shift_id])
        worker = Worker.find(params[:worker_id])
        
        result = AssignWorkerToShift.call(shift, worker, current_user)
        
        if result[:success]
          render_success(result[:data], status: :created)
        else
          status = result[:status] || :unprocessable_entity
          render_error(result[:error], status: status)
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
    end
  end
end
