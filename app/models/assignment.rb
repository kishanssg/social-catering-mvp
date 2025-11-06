class Assignment < ApplicationRecord
  include Auditable
  # Include Single Source of Truth concerns
  include HoursCalculations
  include PayCalculations

  belongs_to :shift
  belongs_to :worker
  belongs_to :assigned_by, class_name: "User", optional: true
  # Approval tracking
  belongs_to :approved_by, class_name: 'User', optional: true
  belongs_to :edited_by, class_name: 'User', optional: true

  validates :assigned_at_utc, :status, presence: true
  validates :assigned_by_id, presence: true, on: :update
  validates :status, inclusion: { in: [ "assigned", "confirmed", "completed", "cancelled", "no_show" ] }
  validates :hours_worked, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 24 }, allow_nil: true
  validates :hourly_rate, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :break_duration_minutes, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :overtime_hours, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :performance_rating, inclusion: { in: 1..5 }, allow_nil: true
  # CRITICAL FIX: Prevent duplicate active assignments
  # This validation ensures worker+shift combo is unique, but allows duplicates if one is cancelled
  validates :worker_id, uniqueness: { 
    scope: :shift_id, 
    conditions: -> { where.not(status: ['cancelled', 'no_show']) },
    message: "is already assigned to this shift" 
  }
  validate :worker_available_for_shift
  validate :shift_not_at_capacity
  validate :worker_has_required_skills
  validate :worker_has_valid_certification

  scope :active, -> { where(status: "assigned") }
  scope :completed, -> { where(status: "completed") }
  
  # New scopes for reporting
  scope :with_hours, -> { where.not(hours_worked: nil) }
  scope :for_date_range, ->(start_date, end_date) {
    joins(:shift)
    .where(shifts: { start_time_utc: start_date..end_date })
  }
  scope :clocked_in, -> { where.not(clock_in_time: nil) }
  scope :clocked_out, -> { where.not(clock_out_time: nil) }
  scope :with_overtime, -> { where('overtime_hours > 0') }
  scope :rated, -> { where.not(performance_rating: nil) }
  scope :high_performance, -> { where(performance_rating: 4..5) }
  # Approval scopes
  scope :approved, -> { where(approved: true) }
  scope :pending_approval, -> { where(approved: false) }
  scope :needs_approval, -> {
    joins(:shift)
      .where(approved: false)
      .where('shifts.end_time_utc < ?', Time.current)
  }
  
  # Calculate total pay
  def total_pay
    return 0 unless hours_worked && hourly_rate
    (hours_worked * hourly_rate).round(2)
  end
  
  # Alias for total_payout (used in reports)
  def total_payout
    total_pay
  end
  
  # effective_hourly_rate is now provided by PayCalculations concern
  
  # Set default hours from shift duration if not specified
  def set_default_hours
    return if hours_worked.present?
    return unless shift.present?
    
    self.hours_worked = shift.duration_hours
  end

  # Time tracking methods
  def clock_in!
    update!(clock_in_time: Time.current)
  end

  def clock_out!
    update!(clock_out_time: Time.current)
    calculate_hours_from_clock_times
  end

  def calculate_hours_from_clock_times
    return unless clock_in_time && clock_out_time
    
    total_minutes = ((clock_out_time - clock_in_time) / 1.minute).round
    break_minutes = break_duration_minutes || 0
    work_minutes = [total_minutes - break_minutes, 0].max  # Ensure non-negative
    
    self.hours_worked = (work_minutes / 60.0).round(2)
    
    # Calculate overtime (over 8 hours)
    if hours_worked > 8
      self.overtime_hours = hours_worked - 8
    else
      self.overtime_hours = 0
    end
    
    save!
  end

  def is_clocked_in?
    clock_in_time.present? && clock_out_time.nil?
  end

  def duration_from_clock_times
    return 0 unless clock_in_time && clock_out_time
    ((clock_out_time - clock_in_time) / 1.hour).round(2)
  end

  def net_hours_worked
    return hours_worked unless clock_in_time && clock_out_time
    duration_from_clock_times - (break_duration_minutes || 0) / 60.0
  end

  after_create :set_default_hours
  after_create :update_event_totals
  after_destroy :update_event_totals
  after_update :update_event_totals, if: :should_update_event_totals?

  # Track changes to hours for auditing
  before_update :track_hours_changes, if: :saved_change_to_hours_worked?

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
    
    # Count only active assignments (exclude cancelled and no-show)
    active_assignments_count = shift.assignments
                                    .where.not(id: id)  # Exclude current assignment if updating
                                    .where.not(status: ['cancelled', 'no_show'])
                                    .count
    
    # Check if adding this assignment would exceed capacity
    if active_assignments_count >= shift.capacity
      errors.add(:base, "Shift is already at full capacity (#{active_assignments_count}/#{shift.capacity} workers assigned)")
    end
  end

  def worker_has_required_skills
    return if shift.nil? || worker.nil?
    
    # Determine required skill based on shift type
    required_skill = nil
    
    if shift.skill_requirement&.skill_name.present?
      # Event-based shift with specific skill requirement
      required_skill = shift.skill_requirement.skill_name
    elsif shift.role_needed.present?
      # Standalone shift with role_needed
      required_skill = shift.role_needed
    end
    
    return if required_skill.blank?
    
    # Get worker's skills
    worker_skills = case worker.skills_json
                    when String then JSON.parse(worker.skills_json) rescue []
                    when Array then worker.skills_json
                    else []
                    end
    
    # Check if worker has the required skill
    unless worker_skills.include?(required_skill)
      errors.add(:base, "Worker does not have required skill: #{required_skill}. Worker's skills: #{worker_skills.join(', ')}")
    end
  end

  def worker_has_valid_certification
    return if shift.nil? || worker.nil? || shift.required_cert_id.blank?

    req_name = shift.required_cert&.name || 'required certification'
    wc = worker.worker_certifications.find_by(certification_id: shift.required_cert_id)
    if wc.nil?
      errors.add(:base, "Worker does not have required certification: #{req_name}")
      return
    end

    if wc.expires_at_utc && wc.expires_at_utc < shift.end_time_utc
      errors.add(:base, "Worker's #{req_name} expires on #{wc.expires_at_utc.strftime('%m/%d/%Y')}, before shift ends")
    end
  end

  # Determine if event totals need updating
  def should_update_event_totals?
    saved_change_to_hours_worked? || 
    saved_change_to_hourly_rate? || 
    saved_change_to_status?
  end

  # Update event totals when assignment changes
  # Uses centralized service for consistency
  def update_event_totals
    return unless shift&.event
    
    event = shift.event
    
    # Use centralized recalculation service (Single Source of Truth)
    result = Events::RecalculateTotals.new(event: event).call
    unless result[:success]
      Rails.logger.error "Assignment #{id}: Failed to update event totals: #{result[:error]}"
    end
  end

  # Approval API
  def approve!(approved_by_user, notes: nil)
    update!(
      approved: true,
      approved_by: approved_by_user,
      approved_at_utc: Time.current,
      approval_notes: notes
    )
  end

  def mark_no_show!(updated_by_user, notes: nil)
    update!(
      status: 'no_show',
      hours_worked: 0,
      edited_by: updated_by_user,
      edited_at_utc: Time.current,
      approval_notes: notes
    )
  end

  def remove_from_job!(updated_by_user, notes: nil)
    update!(
      status: 'cancelled',
      hours_worked: 0,
      edited_by: updated_by_user,
      edited_at_utc: Time.current,
      approval_notes: notes
    )
  end

  def can_edit_hours?
    # Can edit if shift has ended and not yet approved
    shift&.end_time_utc && shift.end_time_utc < Time.current && !approved?
  end

  def can_approve?
    # Can approve if shift has ended
    shift&.end_time_utc && shift.end_time_utc < Time.current
  end

  # Ensure controller visibility
  public :can_edit_hours?, :can_approve?, :approve!, :mark_no_show!, :remove_from_job!

  private

  def track_hours_changes
    if saved_change_to_hours_worked? && persisted?
      self.original_hours_worked ||= hours_worked_before_last_save
      self.edited_at_utc = Time.current
      self.edited_by = Current.user if Current.user
    end
  end
end
