module Api
  module V1
    class WorkersController < BaseController
      before_action :set_worker, only: [:show, :update, :destroy]

      def index
        workers = Worker.includes(:worker_certifications)
        render json: { status: 'success', data: workers.map { |w| serialize_worker(w) } }
      end

      def show
        render json: { status: 'success', data: { worker: serialize_worker(@worker) } }
      end

      def create
        @worker = Worker.new(worker_params)
        attach_photo(@worker)
        if @worker.save
          render json: { status: 'success', data: { worker: serialize_worker(@worker) } }, status: :created
        else
          render json: { status: 'error', errors: @worker.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        attach_photo(@worker)
        if @worker.update(worker_params)
          render json: { status: 'success', data: { worker: serialize_worker(@worker) } }
        else
          render json: { status: 'error', errors: @worker.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @worker.destroy
        render_success
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
        expires_at = if params[:expires_at].present?
          Time.zone.parse(params[:expires_at])
        elsif params[:expires_at_utc].present?
          Time.zone.parse(params[:expires_at_utc])
        else
          1.year.from_now
        end
        
        worker_certification = worker.worker_certifications.build(
          certification: certification,
          expires_at_utc: expires_at
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

      def set_worker
        @worker = Worker.find(params[:id])
      end

      def worker_params
        params.require(:worker).permit(
          :first_name,
          :last_name,
          :email,
          :phone,
          :address_line1,
          :address_line2,
          :notes,
          :active,
          skills_json: [],
          certification_ids: [],
          worker_certifications_attributes: [:id, :certification_id, :expires_at_utc, :_destroy]
        )
      end

      def attach_photo(worker)
        return unless params[:profile_photo].present?
        worker.profile_photo.purge if worker.profile_photo.attached?
        worker.profile_photo.attach(params[:profile_photo])
      end

      def serialize_worker(worker)
        {
          id: worker.id,
          first_name: worker.first_name,
          last_name: worker.last_name,
          email: worker.email,
          phone: worker.phone,
          address_line1: worker.try(:address_line1),
          address_line2: worker.try(:address_line2),
          active: worker.active,
          skills_json: worker.try(:skills_json),
          worker_certifications: worker.worker_certifications.as_json,
          profile_photo_url: worker.profile_photo_url,
          profile_photo_thumb_url: worker.profile_photo_thumb_url
        }
      end
    end
  end
end
