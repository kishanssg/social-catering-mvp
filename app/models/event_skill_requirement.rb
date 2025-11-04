class EventSkillRequirement < ApplicationRecord
  include Auditable

  # Associations
  belongs_to :event

  # Validations
  validates :skill_name, presence: true
  validates :needed_workers, numericality: { greater_than_or_equal_to: 1 }
  validates :skill_name, uniqueness: { scope: :event_id }
  validates :pay_rate, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  # Callbacks for custom timestamp columns
  before_create :set_created_at_utc
  before_save :set_updated_at_utc

  # Instance methods
  def has_certification?
    certification_name.present?
  end

  def has_uniform?
    uniform_name.present?
  end

  def display_requirements
    requirements = []
    requirements << "#{needed_workers} worker#{'s' if needed_workers > 1} needed"
    requirements << "Pay: $#{pay_rate}/hour" if pay_rate.present?
    requirements << "Uniform: #{uniform_name}" if has_uniform?
    requirements << "Certification: #{certification_name}" if has_certification?
    requirements.join(', ')
  end

  def total_pay_for_requirement
    return 0 unless pay_rate.present?
    pay_rate * needed_workers
  end

  private

  def set_created_at_utc
    self.created_at_utc ||= Time.current
  end

  def set_updated_at_utc
    self.updated_at_utc = Time.current
  end
end
