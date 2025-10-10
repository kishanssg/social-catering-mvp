module Api
  module V1
    class WorkersController < BaseController
      def index
        result = SearchWorkers.call(
          params[:query],
          { 
            certification_id: params[:certification_id],
            available_for_shift_id: params[:available_for_shift_id]
          }
        )
        
        workers = result[:data][:workers].includes(:certifications)
        
        # Apply status filter if provided
        if params[:status].present? && params[:status] != 'all'
          if params[:status] == 'active'
            workers = workers.where(active: true)
          elsif params[:status] == 'inactive'
            workers = workers.where(active: false)
          end
        end
        
        render_success({
          workers: workers.as_json(
            include: {
              certifications: {
                only: [:id, :name]
              },
              worker_certifications: {
                only: [:expires_at_utc]
              }
            }
          )
        })
      end
      
      def show
        worker = Worker.includes(:certifications, :worker_certifications).find(params[:id])
        
        render_success({
          worker: worker.as_json(
            include: {
              certifications: { only: [:id, :name] },
              worker_certifications: { only: [:expires_at_utc, :certification_id] }
            }
          )
        })
      end
      
      def create
        worker = Worker.new(worker_params)
        
        if worker.save
          render_success({ worker: worker }, status: :created)
        else
          render_validation_errors(worker.errors.messages)
        end
      end
      
      def update
        worker = Worker.find(params[:id])
        
        if worker.update(worker_params)
          render_success({ worker: worker })
        else
          render_validation_errors(worker.errors.messages)
        end
      end
      
      private
      
      def worker_params
        params.require(:worker).permit(
          :first_name,
          :last_name,
          :email,
          :phone,
          :notes,
          :active,
          skills_json: []
        )
      end
    end
  end
end
