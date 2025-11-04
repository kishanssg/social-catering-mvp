require 'set'

module Api
  module V1
    class WorkersController < BaseController
      before_action :set_worker, only: [:show, :update, :destroy]
      before_action :normalize_cert_params!, only: [:create, :update]

      def index
        # Start with all workers
        workers = Worker.includes(worker_certifications: :certification)
        
        # Apply search filter (name, email, phone)
        if params[:search].present?
          search_term = "%#{params[:search].downcase}%"
          workers = workers.where(
            "LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?",
            search_term, search_term, search_term, search_term
          )
        end
        
        # Apply skills filter (must have ALL selected skills)
        if params[:skills].present?
          skills = params[:skills].is_a?(Array) ? params[:skills] : [params[:skills]]
          skills.each do |skill|
            workers = workers.where("skills_json @> ?", [skill].to_json)
          end
        end
        
        # Apply explicit active boolean filter (supports ?active=true|false)
        if params.key?(:active)
          active_bool = ActiveModel::Type::Boolean.new.cast(params[:active])
          workers = workers.where(active: active_bool)
        end

        # Apply status filter (legacy: accepts status=active|inactive)
        if params[:status].present?
          case params[:status].downcase
          when 'active'
            workers = workers.where(active: true)
          when 'inactive'
            workers = workers.where(active: false)
          end
        end
        
        # Apply certification filter
        if params[:certification_id].present?
          certified_worker_ids = WorkerCertification
            .where(certification_id: params[:certification_id])
            .where("expires_at_utc >= ?", Time.current)
            .pluck(:worker_id)
          workers = workers.where(id: certified_worker_ids)
        end
        
        # Order by name
        workers = workers.order(:first_name, :last_name)
        
        render json: { 
          status: 'success', 
          data: workers.map { |w| serialize_worker(w) },
          meta: {
            total: workers.count,
            search: params[:search],
            skills: params[:skills],
            status: params[:status]
          }
        }
      end

      def show
        render json: {
          status: 'success',
          data: {
            worker: serialize_worker(@worker)
          }
        }
      end

      def create
        begin
          @worker = Worker.new(worker_params)
          attach_photo(@worker)
          if @worker.save
            render json: {
              status: 'success',
              data: {
                worker: @worker.as_json(
                  include: {
                    worker_certifications: {
                      include: { certification: { only: [:id, :name] } }
                    }
                  }
                )
              }
            }, status: :created
          else
            render json: { status: 'validation_error', errors: @worker.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveRecord::RecordInvalid => e
          render json: { status: 'validation_error', errors: [e.message] }, status: :unprocessable_entity
        rescue PG::UniqueViolation => e
          render json: { status: 'error', errors: ["Duplicate certification detected for this worker"], message: e.message }, status: :unprocessable_entity
        rescue => e
          Rails.logger.error "Workers#create failed: #{e.class}: #{e.message}\n#{e.backtrace&.first(10)&.join("\n")}"
          render json: { status: 'error', message: 'Unable to save worker', errors: [e.message] }, status: :unprocessable_entity
        end
      end

      def update
        begin
          attach_photo(@worker)
          if @worker.update(worker_params)
            render json: {
              status: 'success',
              data: {
                worker: @worker.as_json(
                  include: {
                    worker_certifications: {
                      include: { certification: { only: [:id, :name] } }
                    }
                  }
                )
              }
            }
          else
            render json: { status: 'validation_error', errors: @worker.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveRecord::RecordInvalid => e
          render json: { status: 'validation_error', errors: [e.message] }, status: :unprocessable_entity
        rescue PG::UniqueViolation => e
          render json: { status: 'error', errors: ["Duplicate certification detected for this worker"], message: e.message }, status: :unprocessable_entity
        rescue => e
          Rails.logger.error "Workers#update failed: #{e.class}: #{e.message}\n#{e.backtrace&.first(10)&.join("\n")}"
          render json: { status: 'error', message: 'Unable to update worker', errors: [e.message] }, status: :unprocessable_entity
        end
      end

      def destroy
        begin
          # Check if worker has assignments
          if @worker.assignments.any?
            assignment_count = @worker.assignments.count
            return render_error(
              "Cannot delete worker. This worker has #{assignment_count} #{'assignment'.pluralize(assignment_count)} and cannot be deleted to preserve historical data. You can deactivate the worker instead.",
              status: :unprocessable_entity
            )
          end
          
          @worker.destroy!
          render_success
        rescue ActiveRecord::RecordNotDestroyed => e
          render_error(e.record.errors.full_messages.join(', '), status: :unprocessable_entity)
        rescue => e
          Rails.logger.error "Failed to delete worker #{params[:id]}: #{e.message}"
          render_error("Cannot delete worker: #{e.message}", status: :unprocessable_entity)
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
          :hourly_rate,
          skills_json: [],
          certification_ids: [],
          worker_certifications_attributes: [:id, :certification_id, :expires_at_utc, :_destroy]
        )
      end

      # Accept dates like "YYYY-MM-DD" from the UI and coerce to UTC ISO8601
      # so TIMESTAMPTZ columns are set correctly. Also drop empty rows.
      def normalize_cert_params!
        w = params[:worker]
        return unless w
        attrs = w[:worker_certifications_attributes]
        return unless attrs.is_a?(ActionController::Parameters) || attrs.is_a?(Hash)
        seen = Set.new
        attrs.each do |_k, cert|
          next unless cert
          # Remove entirely if missing certification_id
          if cert[:certification_id].blank?
            cert[:_destroy] = true
            next
          end
          # De-duplicate within the same payload
          if seen.include?(cert[:certification_id].to_s)
            cert[:_destroy] = true
            next
          end
          seen << cert[:certification_id].to_s

          # On update: convert create into update when the worker already has this cert
          if defined?(@worker) && @worker&.persisted?
            begin
              existing = @worker.worker_certifications.find_by(certification_id: cert[:certification_id])
              cert[:id] = existing.id if existing && cert[:id].blank?
            rescue => _e
              # ignore lookup issues; validation will handle
            end
          end
          val = cert[:expires_at_utc]
          next if val.blank?
          if val.is_a?(String) && val.match?(/^\d{4}-\d{2}-\d{2}$/)
            # Interpret as local date end-of-day UTC
            begin
              t = Time.zone.parse(val).end_of_day.utc
              cert[:expires_at_utc] = t.iso8601
            rescue
              # leave as-is; model validation will handle
            end
          end
        end
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
          hourly_rate: worker.hourly_rate,
          skills_json: worker.try(:skills_json) || [],
          certifications: worker.worker_certifications.includes(:certification).map { |wc|
            next unless wc.certification
            {
              id: wc.certification.id,
              name: wc.certification.name,
              expires_at_utc: wc.expires_at_utc,
              expired: wc.expires_at_utc && wc.expires_at_utc < Time.current
            }
          }.compact,
          profile_photo_url: worker.profile_photo_url,
          profile_photo_thumb_url: worker.profile_photo_thumb_url,
          created_at: worker.created_at,
          updated_at: worker.updated_at
        }
      end
    end
  end
end
