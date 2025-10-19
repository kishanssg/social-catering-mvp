class Staffing < ApplicationRecord
  self.table_name = 'assignments'
  
  include Auditable
  
  # === ASSOCIATIONS ===
  belongs_to :worker
  belongs_to :shift
  
  # === VALIDATIONS ===
  validates :worker_id, uniqueness: { 
    scope: :shift_id, 
    message: "is already assigned to this shift" 
  }
  validates :hours_worked, 
            numericality: { greater_than: 0 }, 
            allow_nil: true
  validate :worker_available_for_shift
  validate :shift_not_at_capacity
  validate :worker_has_required_skills
  
  # === CALLBACKS ===
  after_create :update_event_counts
  after_destroy :update_event_counts
  after_update :update_event_counts, if: :saved_change_to_hours_worked?
  
  # === SCOPES ===
  scope :with_hours, -> { where.not(hours_worked: nil) }
  scope :without_hours, -> { where(hours_worked: nil) }
  scope :for_date_range, ->(start_date, end_date) {
    joins(:shift).where(shifts: { start_time_utc: start_date..end_date })
  }
  scope :for_worker, ->(worker_id) { where(worker_id: worker_id) }
  scope :for_event, ->(event_id) {
    joins(:shift).where(shifts: { event_id: event_id })
  }
  scope :completed, -> {
    joins(:shift).where("shifts.end_time_utc < ?", Time.current)
  }
  scope :upcoming, -> {
    joins(:shift).where("shifts.start_time_utc > ?", Time.current)
  }
  
  # === COMPUTED FIELDS ===
  def total_pay
    return 0 unless hours_worked
    # Use hourly_rate from assignment or default to 0
    hours_worked * (hourly_rate || 0)
  end
  
  def event
    shift&.event
  end
  
  def is_completed?
    shift&.end_time_utc && shift.end_time_utc < Time.current
  end
  
  private
  
  def worker_available_for_shift
    return if shift.nil? || worker.nil?
    
    unless shift.can_assign_worker?(worker)
      reason = shift.conflict_reason(worker)
      errors.add(:base, reason) if reason
    end
  end
  
  def shift_not_at_capacity
    return if shift.nil?
    return if shift.id && shift.assignments.where.not(id: id).count < shift.capacity
    
    errors.add(:base, "Shift is already at full capacity")
  end
  
  def worker_has_required_skills
    return if shift.nil? || worker.nil?
    return unless shift.skill_requirement&.skill_name.present?
    
    required_skill = shift.skill_requirement.skill_name
    unless worker.skills_json&.include?(required_skill)
      errors.add(:base, "Worker does not have required skill: #{required_skill}")
    end
  end
  
  def update_event_counts
    return unless shift&.event
    
    shift.event.update_columns(
      assigned_shifts_count: shift.event.shifts.joins(:assignments).count
    )
  end
end

# Note: Assignment model already exists and is the primary model
# Staffing is an alias that can be used for clarity in the UI
