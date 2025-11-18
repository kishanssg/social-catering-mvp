class Worker < ApplicationRecord
  include Auditable
  include PhoneNormalizable

  has_many :worker_certifications, dependent: :destroy
  has_many :certifications, through: :worker_certifications
  has_many :assignments, dependent: :restrict_with_error
  has_many :shifts, through: :assignments

  accepts_nested_attributes_for :worker_certifications, allow_destroy: true

  validates :first_name, :last_name, presence: true
  validates :email,
            presence: true,
            uniqueness: { case_sensitive: false },
            format: { with: URI::MailTo::EMAIL_REGEXP, message: "must be a valid email address" }
  validates :phone, 
            presence: true,
            format: { 
              with: /\A\d{10,15}\z/, 
              message: "must be 10-15 digits only (no hyphens, spaces, or special characters)"
            }

  scope :active, -> { where(active: true) }
  scope :with_skill, ->(skill) {
    skill.present? ? where("skills_json @> ?", [skill].to_json) : all
  }
  scope :with_certification, ->(cert_id, as_of_time = Time.current) {
    cert_id.present? ? joins(:worker_certifications)
                        .merge(WorkerCertification.valid_on(as_of_time))
                        .where(worker_certifications: { certification_id: cert_id })
                        .distinct : all
  }
  scope :without_conflicts, ->(shift_start_utc:, shift_end_utc:, exclude_shift_id: nil) {
    if shift_start_utc.present? && shift_end_utc.present?
      conflicting = Assignment
                      .joins(:shift)
                      .where.not(assignments: { status: %w[cancelled no_show] })
                      .where("shifts.start_time_utc < ? AND shifts.end_time_utc > ?", shift_end_utc, shift_start_utc)
      conflicting = conflicting.where.not(shifts: { id: exclude_shift_id }) if exclude_shift_id.present?
      where.not(id: conflicting.select(:worker_id))
    else
      all
    end
  }

  before_save :sync_skills_tsvector
  before_save :normalize_phone
  after_save :clear_workers_cache
  after_destroy :clear_workers_cache
  after_commit :unassign_from_active_events_if_deactivated, on: :update

  # Attach profile photo via Active Storage
  has_one_attached :profile_photo

  def profile_photo_url
    return nil unless profile_photo.attached?
    Rails.application.routes.url_helpers.rails_blob_url(profile_photo, host: Rails.application.config.action_controller.default_url_options[:host])
  end

  def profile_photo_thumb_url
    return nil unless profile_photo.attached?
    variant = profile_photo.variant(resize_to_limit: [100, 100])
    Rails.application.routes.url_helpers.rails_representation_url(variant.processed, host: Rails.application.config.action_controller.default_url_options[:host])
  end

  def full_name
    "#{first_name} #{last_name}"
  end

  def skills
    case skills_json
    when String then JSON.parse(skills_json) rescue []
    when Array then skills_json
    else []
    end
  end

  def has_skill?(skill_name)
    skills.include?(skill_name)
  end

  def has_valid_certification?(certification_id, as_of_time = Time.current)
    return false if certification_id.blank?
    worker_certifications.valid_on(as_of_time).where(certification_id: certification_id).exists?
  end

  def self.eligible_for_requirement(event:, role:, shift:)
    raise ArgumentError, "event is required" unless event
    raise ArgumentError, "role is required" unless role

    skill_name = role.respond_to?(:skill_name) ? role.skill_name : nil
    required_cert_id = role.try(:required_certification_id)
    shift_start = shift&.start_time_utc || event.event_schedule&.start_time_utc
    shift_end = shift&.end_time_utc || event.event_schedule&.end_time_utc

    scope = active
    scope = scope.with_skill(skill_name) if skill_name.present?
    scope = scope.with_certification(required_cert_id, shift_end) if required_cert_id.present?
    scope.without_conflicts(
      shift_start_utc: shift_start,
      shift_end_utc: shift_end,
      exclude_shift_id: shift&.id
    )
  end

  def available_for_shift?(shift)
    return false unless has_skill?(shift.role_needed)
    
    # Check for overlapping assignments
    overlapping_assignments = assignments.joins(:shift)
      .where(status: ['confirmed', 'pending'])
      .where("shifts.start_time_utc < ? AND shifts.end_time_utc > ?",
             shift.end_time_utc, shift.start_time_utc)
    
    overlapping_assignments.empty?
  end

  def self.search(query)
    return all if query.blank?

    like_query = "%#{query}%"
    name_scope = where(
      "first_name ILIKE ? OR last_name ILIKE ?",
      like_query, like_query
    )

    if query.length >= 3
      ts_query = build_tsquery(query)
      return name_scope if ts_query.blank?

      skill_scope = where("skills_tsvector @@ to_tsquery(?)", ts_query)
      name_scope.or(skill_scope)
    else
      name_scope
    end
  end

  def self.build_tsquery(term)
    sanitized_tokens = term.to_s.downcase.gsub(/[^a-z0-9\s]/, ' ').split
    return if sanitized_tokens.empty?

    sanitized_tokens.map { |token| "#{token}:*" }.join(' & ')
  end

  private

  def clear_workers_cache
    Rails.cache.delete('active_workers_list')
  end

  # Phone normalization is handled by PhoneNormalizable concern

  def sync_skills_tsvector
    skills_array = case skills_json
    when String then JSON.parse(skills_json) rescue []
    when Array then skills_json
    else []
    end

    self.skills_text = skills_array.compact.map(&:to_s).map(&:strip)
                                   .reject(&:blank?).uniq.join(" ")

    # Update tsvector for full-text search
    if skills_text.present?
      result = ActiveRecord::Base.connection.execute(
        "SELECT to_tsvector('simple', #{ActiveRecord::Base.connection.quote(skills_text)}) as tsvector_result"
      )
      self.skills_tsvector = result.first["tsvector_result"]
    else
      self.skills_tsvector = nil
    end
  end

  # Unassign worker from all active events when deactivated
  def unassign_from_active_events_if_deactivated
    # Only run if active status changed from true to false
    return unless saved_change_to_active? && !active?

    ActiveRecord::Base.transaction do
      # Find all assignments to shifts in active (published) events
      active_assignments = assignments
        .joins(shift: :event)
        .where(events: { status: %w[published assigned] })
        .where.not(status: %w[cancelled no_show completed])

      unassigned_count = 0
      active_assignments.each do |assignment|
        # Use the unassign service to properly handle the unassignment
        # Only unassign if status is 'assigned' or 'confirmed' (not completed)
        if assignment.status.in?(['assigned', 'confirmed'])
          result = UnassignWorkerFromShift.call(assignment, Current.user || User.first)
          unassigned_count += 1 if result[:success]
        else
          # For other statuses, just cancel the assignment
          assignment.update!(status: 'cancelled', notes: (assignment.notes.to_s + "\nWorker deactivated on #{Time.current.strftime('%Y-%m-%d')}").strip)
          unassigned_count += 1
        end
      end

      if unassigned_count > 0
        Rails.logger.info "Unassigned #{unassigned_count} assignments for deactivated worker #{id} (#{full_name})"
        
        # Log activity
        ActivityLog.create!(
          actor_user_id: Current.user&.id,
          entity_type: 'Worker',
          entity_id: id,
          action: 'deactivated_unassigned',
          after_json: {
            unassigned_count: unassigned_count,
            reason: 'Worker deactivated - automatically unassigned from active events'
          },
          created_at_utc: Time.current
        )
      end
    end
  rescue => e
    Rails.logger.error "Failed to unassign worker #{id} from active events: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
    # Don't raise - allow worker deactivation to succeed even if unassignment fails
  end
end
