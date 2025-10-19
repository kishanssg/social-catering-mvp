module Api
  module V1
    class WorkersController < BaseController
      def index
        result = SearchWorkers.call(
          params[:search] || params[:query],
          {
            certification_id: params[:certification_id],
            available_for_shift_id: params[:available_for_shift_id]
          }
        )

        workers = result[:data][:workers].includes(:certifications)

        # Apply status filter if provided
        if params[:status].present? && params[:status] != "all"
          if params[:status] == "active"
            workers = workers.where(active: true)
          elsif params[:status] == "inactive"
            workers = workers.where(active: false)
          end
        end

        render_success({
          workers: workers.as_json(
            include: {
              certifications: {
                only: [ :id, :name ]
              },
              worker_certifications: {
                only: [ :expires_at_utc ]
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
              certifications: { only: [ :id, :name ] },
              worker_certifications: { only: [ :expires_at_utc, :certification_id ] }
            }
          )
        })
      end

      def create
        worker = Worker.new(worker_params)

        if worker.save
          # Add certifications if provided
          if params[:worker][:certification_ids].present?
            params[:worker][:certification_ids].each do |cert_id|
              worker.worker_certifications.create!(
                certification_id: cert_id,
                expires_at_utc: 1.year.from_now
              )
            end
          end
          
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

      # Add certification to worker
      def add_certification
        worker = Worker.find(params[:id])
        certification = Certification.find(params[:certification_id])

        # Check if worker already has this certification
        existing_cert = worker.worker_certifications.find_by(certification: certification)
        if existing_cert
          return render_error("Worker already has this certification", status: :unprocessable_entity)
        end

        # Create worker certification
        worker_certification = worker.worker_certifications.build(
          certification: certification,
          expires_at_utc: params[:expires_at_utc] || 1.year.from_now
        )

        if worker_certification.save
          render_success({
            worker_certification: worker_certification.as_json(
              include: {
                certification: { only: [ :id, :name ] }
              }
            )
          }, status: :created)
        else
          render_validation_errors(worker_certification.errors.messages)
        end
      end

      # Remove certification from worker
      def remove_certification
        worker = Worker.find(params[:id])
        worker_certification = worker.worker_certifications.find_by(certification_id: params[:certification_id])

        if worker_certification
          worker_certification.destroy
          render_success({ message: "Certification removed from worker" })
        else
          render_error("Certification not found for this worker", status: :not_found)
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
          skills_json: [],
          certification_ids: []
        )
      end
    end
  end
end
