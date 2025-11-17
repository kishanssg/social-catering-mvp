class EventSkillRequirement < ApplicationRecord
  include Auditable

  # Associations
  belongs_to :event
  belongs_to :required_certification, class_name: 'Certification', optional: true

  # Validations
  validates :skill_name, presence: true
  validates :needed_workers, numericality: { greater_than_or_equal_to: 1 }
  validates :skill_name, uniqueness: { scope: :event_id }
  validates :pay_rate, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  # Callbacks for custom timestamp columns
  before_create :set_created_at_utc
  before_save :set_updated_at_utc
  
  # Cascade pay rate changes to existing shifts (Single Source of Truth)
  after_update :cascade_pay_rate_to_shifts, if: :saved_change_to_pay_rate?

  # Instance methods
  def has_certification?
    required_certification.present? || certification_name.present?
  end

  def has_uniform?
    uniform_name.present?
  end

  def display_requirements
    requirements = []
    requirements << "#{needed_workers} worker#{'s' if needed_workers > 1} needed"
    requirements << "Pay: $#{pay_rate}/hour" if pay_rate.present?
    requirements << "Uniform: #{uniform_name}" if has_uniform?
    if required_certification.present?
      requirements << "Certification: #{required_certification.name}"
    elsif certification_name.present?
      requirements << "Certification: #{certification_name}"
    end
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

  def cascade_pay_rate_to_shifts
    return unless event.present? && pay_rate.present?
    
    old_rate = saved_change_to_pay_rate[0]
    
    # This callback runs within the same transaction as the parent update
    # If we raise here, the parent update will rollback
    # Find shifts that should be updated:
    # 1. Shifts with nil pay_rate (auto-generated, never manually set)
    # 2. Shifts with old requirement rate (were following requirement)
    # 3. Exclude shifts with different rates (manually overridden)
    # 4. Exclude shifts that are auto_generated=false AND have pay_rate != old_rate (explicitly overridden)
    matching_shifts = event.shifts.where(role_needed: skill_name)
      .where(pay_rate: [nil, old_rate]) # Only nil or old requirement rate
      .where(
        # Include auto-generated shifts OR shifts that match old rate (following requirement)
        "(auto_generated = true) OR (pay_rate = ?)",
        old_rate
      )
    
    updated_count = matching_shifts.update_all(
      pay_rate: pay_rate,
      updated_at: Time.current
    )
    
    Rails.logger.info "EventSkillRequirement #{id}: Cascaded pay_rate #{pay_rate} to #{updated_count} shifts for role '#{skill_name}'"
    
    # Recalculate event totals (atomic within same transaction)
    if event.respond_to?(:recalculate_totals!)
      recalc_result = event.recalculate_totals!
      unless recalc_result
        raise "Failed to recalculate event totals after pay_rate cascade"
      end
    end
    
    # Log activity (within same transaction)
    ActivityLog.create!(
      actor_user_id: Current.user&.id,
      entity_type: 'EventSkillRequirement',
      entity_id: id,
      action: 'requirement_pay_rate_cascade',
      before_json: { pay_rate: old_rate },
      after_json: { 
        pay_rate: pay_rate,
        updated_shifts_count: updated_count,
        role: skill_name
      },
      created_at_utc: Time.current
    )
  rescue => e
    Rails.logger.error "Error cascading pay_rate for EventSkillRequirement #{id}: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
    # Re-raise to trigger transaction rollback of parent update
    raise e
  end
end
