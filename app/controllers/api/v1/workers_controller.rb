      def worker_certifications_payload(worker, worker_certs)
        worker_certs.map do |wc|
          {
            id: wc.id,
            certification_id: wc.certification_id,
            certification_name: wc.certification&.name,
            expires_at_utc: wc.expires_at_utc,
            expired: wc.expires_at_utc.present? ? wc.expires_at_utc < Time.current : false
          }
        end
      end

      def certifications_payload(worker, worker_certs)
        worker.certifications.map do |cert|
          wc = worker_certs.find { |row| row.certification_id == cert.id }
          {
            id: cert.id,
            name: cert.name,
            expires_at_utc: wc&.expires_at_utc,
            expired: wc&.expires_at_utc.present? ? wc.expires_at_utc < Time.current : false,
            worker_certification_id: wc&.id
          }
        end
      end
require 'set'

module Api
  module V1
    class WorkersController < BaseController
      before_action :set_worker, only: [:show, :update, :destroy]
      before_action :normalize_cert_params!, only: [:create, :update]

      def index
        # Check if we can use cached active workers list (no filters applied AND explicitly requesting active only)
        use_cache = params[:search].blank? && 
                   params[:skills].blank? && 
                   params[:certification_id].blank? &&
                   params[:active] == 'true' &&
                   (params[:status].blank? || params[:status].downcase == 'active')
        
        if use_cache
          # Cache active workers list for 5 minutes (changes infrequently)
          workers = Rails.cache.fetch('active_workers_list', expires_in: 5.minutes) do
            # NOTE: Worker does not have a separate :skills association; skills are in skills_json.
            # Including a non-existent association raises and caused 500s in staging.
            Worker.where(active: true)
              .includes(worker_certifications: :certification)
              .order(:last_name, :first_name)
              .to_a
          end
        else
          # Start with all workers (no cache for filtered queries or when showing all workers)
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
          workers = workers.order(active: :desc).order(:last_name, :first_name).to_a
        end
        
        render json: { 
          status: 'success', 
          data: workers.map { |w| serialize_worker(w) },
          meta: {
            total: workers.size,
            search: params[:search],
            skills: params[:skills],
            status: params[:status],
            cached: use_cache
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
          return render_duplicate_cert_errors if duplicate_cert_errors.present?
          if @worker.save
            render json: {
              status: 'success',
              data: {
                worker: serialize_worker(@worker)
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
          
          # Reload worker to ensure we have fresh associations before update
          @worker.reload
          
          return render_duplicate_cert_errors if duplicate_cert_errors.present?
          if @worker.update(worker_params)
            render json: {
              status: 'success',
              data: {
                worker: serialize_worker(@worker.reload)
              }
            }
          else
            render json: { status: 'validation_error', errors: @worker.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveRecord::RecordInvalid => e
          render json: { status: 'validation_error', errors: [e.message] }, status: :unprocessable_entity
        rescue PG::UniqueViolation => e
          # Try to provide a more helpful error message
          error_msg = if e.message.include?('worker_certifications')
            "This worker already has one of the certifications you're trying to add. Please remove duplicates and try again."
          else
            "Duplicate entry detected: #{e.message}"
          end
          render json: { status: 'error', errors: [error_msg], message: e.message }, status: :unprocessable_entity
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
        includes = [:certifications, { worker_certifications: :certification }]
        includes << :worker_skills if Worker.reflect_on_association(:worker_skills)
        @worker = Worker.includes(*includes).find(params[:id])
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
        worker_params_hash = params[:worker]
        return unless worker_params_hash
        attrs = worker_params_hash[:worker_certifications_attributes]
        return if attrs.blank?

        normalized_attrs = normalize_cert_array(attrs)
        Rails.logger.debug { "[WorkersController] raw worker_certifications_attributes=#{normalized_attrs.inspect}" } if Rails.env.development?

        existing_by_cert = if defined?(@worker) && @worker.present?
                             @worker.worker_certifications.index_by(&:certification_id)
                           else
                             {}
                           end

        deduped = {}

        normalized_attrs.each do |_key, cert|
          next unless cert

          cert_id = cert[:certification_id] || cert['certification_id']
          if cert_id.blank?
            cert[:_destroy] = true
            next
          end

          cert_id = cert_id.to_i
          next if cert_id <= 0

          cert[:certification_id] = cert_id
          deduped[cert_id] = cert # keep latest occurrence
        end

        final_attrs = deduped.values
        final_attrs.each do |cert|
          normalize_expiration!(cert)

          boolean_destroy = ActiveModel::Type::Boolean.new.cast(cert[:_destroy])
          cert[:_destroy] = boolean_destroy ? 'true' : nil
          cert.delete(:_destroy) unless cert[:_destroy]

          next unless @worker&.persisted?

          existing = existing_by_cert[cert[:certification_id]]
          next unless existing

          cert[:id] ||= existing.id
        end

        final_attrs_hash = final_attrs.each_with_index.each_with_object({}) do |(attr, idx), memo|
          memo[idx.to_s] = attr.compact
        end

        Rails.logger.info("[WorkersController] normalized worker_certifications_attributes=#{final_attrs_hash.inspect}") if Rails.env.development?

        worker_params_hash[:worker_certifications_attributes] = final_attrs_hash
      end

      def normalize_cert_array(attrs)
        case attrs
        when ActionController::Parameters
          normalize_cert_array(attrs.to_unsafe_h)
        when Array
          attrs.each_with_index.each_with_object({}) do |(value, idx), hash|
            hash[idx.to_s] = value.is_a?(ActionController::Parameters) ? value.to_unsafe_h : value
          end
        when Hash
          attrs.transform_values do |value|
            value.is_a?(ActionController::Parameters) ? value.to_unsafe_h : value
          end
        else
          {}
        end
      end

      def normalize_expiration!(cert)
        val = cert[:expires_at_utc] || cert['expires_at_utc']
        return if val.blank?

        if val.is_a?(String) && val.match?(/^\d{4}-\d{2}-\d{2}$/)
          begin
            t = Time.zone.parse(val).end_of_day.utc
            cert[:expires_at_utc] = t.iso8601
          rescue
            # leave original format; model validation will handle invalid value
          end
        end
      end

      def attach_photo(worker)
        return unless params[:profile_photo].present?
        worker.profile_photo.purge if worker.profile_photo.attached?
        worker.profile_photo.attach(params[:profile_photo])
      end

      def duplicate_cert_errors
        @duplicate_cert_errors ||= []
      end

      def render_duplicate_cert_errors
        render json: {
          status: 'validation_error',
          errors: duplicate_cert_errors.presence || ['Duplicate certification detected for this worker']
        }, status: :unprocessable_entity
      end

      def serialize_worker(worker)
        worker_certs = worker.worker_certifications.includes(:certification)

        certifications_payload = build_certifications_payload(worker, worker_certs)
        worker_certs_payload = build_worker_certifications_payload(worker_certs)

        worker_skills_payload =
          if worker.respond_to?(:worker_skills)
            worker.worker_skills.map do |ws|
              {
                id: ws.id,
                skill_id: ws.try(:skill_id),
                skill_name: ws.respond_to?(:skill) ? ws.skill&.name : nil
              }
            end
          else
            []
          end

        {
          id: worker.id,
          first_name: worker.first_name,
          last_name: worker.last_name,
          email: worker.email,
          phone: worker.phone,
          phone_formatted: worker.phone_formatted,
          address_line1: worker.try(:address_line1),
          address_line2: worker.try(:address_line2),
          active: worker.active,
          hourly_rate: worker.hourly_rate,
          skills_json: worker.try(:skills_json) || [],
          certifications: certifications_payload,
          worker_certifications: worker_certs_payload,
          worker_skills: worker_skills_payload,
          profile_photo_url: worker.profile_photo_url,
          profile_photo_thumb_url: worker.profile_photo_thumb_url,
          created_at: worker.created_at,
          updated_at: worker.updated_at
        }
      end

      def build_worker_certifications_payload(worker_certs)
        worker_certs.map do |wc|
          {
            id: wc.id,
            certification_id: wc.certification_id,
            certification_name: wc.certification&.name,
            expires_at_utc: wc.expires_at_utc,
            expired: wc.expires_at_utc.present? ? wc.expires_at_utc < Time.current : false
          }
        end
      end

      def build_certifications_payload(worker, worker_certs)
        worker.certifications.map do |cert|
          wc = worker_certs.find { |row| row.certification_id == cert.id }
          {
            id: cert.id,
            name: cert.name,
            expires_at_utc: wc&.expires_at_utc,
            expired: wc&.expires_at_utc.present? ? wc.expires_at_utc < Time.current : false,
            worker_certification_id: wc&.id
          }
        end
      end
    end
  end
end
