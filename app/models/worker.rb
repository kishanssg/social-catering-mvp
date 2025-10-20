class Worker < ApplicationRecord
  include Auditable

  has_many :worker_certifications, dependent: :destroy
  has_many :certifications, through: :worker_certifications
  has_many :assignments, dependent: :restrict_with_error
  has_many :shifts, through: :assignments

  accepts_nested_attributes_for :worker_certifications, allow_destroy: true

  validates :first_name, :last_name, presence: true
  validates :email, uniqueness: true, allow_nil: true, format: { with: URI::MailTo::EMAIL_REGEXP, message: "must be a valid email address" }

  scope :active, -> { where(active: true) }
  scope :with_skill, ->(skill) { where("skills_json @> ?", [skill].to_json) }

  before_save :sync_skills_tsvector

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
    
    if query.length >= 3
      where("skills_tsvector @@ to_tsquery(?)", "#{query}:*")
    else
      where("first_name ILIKE ? OR last_name ILIKE ?", "#{query}%", "#{query}%")
    end
  end

  private

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
end
