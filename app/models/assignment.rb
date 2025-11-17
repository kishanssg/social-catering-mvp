class Assignment < ApplicationRecord
  # Optimistic locking to prevent concurrent edits
  lock_optimistically
  
  # Allows certain state transitions to bypass capacity validation
  attr_accessor :skip_capacity_check
  # Skip availability and skill validations when editing hours for restored assignments
  attr_accessor :skip_availability_and_skill_checks
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
  
  # Additional safety check before create to prevent duplicates
  before_create :check_for_existing_active_assignment
  
  validate :worker_available_for_shift
  validate :shift_not_at_capacity, unless: :skip_capacity_check
  validate :worker_has_required_skills
  validate :worker_has_valid_certification

  scope :active, -> { where(status: "assigned") }
  scope :completed, -> { where(status: "completed") }
  
  # Filter out orphaned assignments (where shift or event is deleted/nil)
  # Only include assignments where:
  # 1. Shift exists and is not archived
  # 2. If shift has an event, the event exists and is not deleted
  scope :valid, -> {
    joins(:shift)
      .left_joins(shift: :event)
      .where.not(shifts: { status: 'archived' })
      .where("shifts.event_id IS NULL OR (events.id IS NOT NULL AND events.status != 'deleted')")
  }
  
  # New scopes for reporting
  scope :with_hours, -> { where.not(hours_worked: nil) }
  scope :for_date_range, ->(start_date, end_date) {
    # Convert Date objects to datetime ranges (start of day to end of day)
    start_datetime = start_date.is_a?(Date) ? start_date.beginning_of_day.utc : start_date
    end_datetime = end_date.is_a?(Date) ? end_date.end_of_day.utc : end_date
    
    joins(:shift)
      .where('shifts.start_time_utc >= ? AND shifts.start_time_utc <= ?', start_datetime, end_datetime)
  }
  scope :for_event, ->(event_id) {
    joins(shift: :event).where(events: { id: event_id })
  }
  scope :upcoming, -> {
    joins(:shift)
      .where('shifts.start_time_utc > ?', Time.current)
      .where.not(status: ['cancelled', 'no_show'])
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
    return if skip_availability_and_skill_checks

    unless shift.can_assign_worker?(worker)
      reason = shift.conflict_reason(worker)
      errors.add(:base, reason) if reason
    end
  end

  def shift_not_at_capacity
    return if shift.nil?
    return if skip_capacity_check

    # If we're changing status to a non-active state, skip capacity check
    if (respond_to?(:will_save_change_to_status?) && will_save_change_to_status? && %w[cancelled no_show].include?(status)) ||
       (!respond_to?(:will_save_change_to_status?) && %w[cancelled no_show].include?(status))
      return
    end

    # If this is an update that doesn't change status (e.g., editing hours), skip
    if persisted?
      status_will_change = respond_to?(:will_save_change_to_status?) ? will_save_change_to_status? : false
      return unless status_will_change
    end

    # Only enforce when adding to active headcount (new record OR changing to active state)
    adding_to_active = new_record? || (
      (respond_to?(:will_save_change_to_status?) ? will_save_change_to_status? : true) &&
      %w[assigned confirmed].include?(status)
    )
    return unless adding_to_active

    active_assignments_count = shift.assignments
                                    .where.not(id: id)
                                    .where(status: ['assigned', 'confirmed'])
                                    .count

    capacity = shift.respond_to?(:capacity) ? shift.capacity : (shift.respond_to?(:workers_needed) ? shift.workers_needed : 0)
    if capacity.to_i > 0 && active_assignments_count >= capacity
      errors.add(:base, "Shift is fully staffed (#{capacity} workers)")
    end
  end

  def worker_has_required_skills
    return if shift.nil? || worker.nil?
    return if skip_availability_and_skill_checks
    
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
    return if skip_availability_and_skill_checks

    req_name = shift.required_cert&.name || 'required certification'
    shift_end = shift.end_time_utc || Time.current

    return if worker.has_valid_certification?(shift.required_cert_id, shift_end)

    latest_cert = worker.worker_certifications
                        .where(certification_id: shift.required_cert_id)
                        .order(expires_at_utc: :desc)
                        .first

    if latest_cert.nil?
      errors.add(:base, "Worker does not have required certification: #{req_name}")
    else
      errors.add(
        :base,
        "Worker's #{req_name} expires on #{latest_cert.expires_at_utc.strftime('%m/%d/%Y')}, before shift ends"
      )
    end
  end

  # Determine if event totals need updating
  # Triggers on any field that affects effective_hours or effective_pay
  def should_update_event_totals?
    saved_change_to_hours_worked? || 
    saved_change_to_hourly_rate? || 
    saved_change_to_status? ||
    saved_change_to_shift_id?  # Moving assignment to different shift affects event totals
  end

  # Update event totals when assignment changes
  # Uses centralized service for consistency (SSOT)
  # Wrapped in transaction to ensure atomicity with parent operation
  def update_event_totals
    return unless shift&.event
    
    event = shift.event
    
    # Set Current.user for activity logging if available
    # (assignment callbacks may not have user context, so this is optional)
    previous_user = Current.user
    
    # Use centralized recalculation service (Single Source of Truth)
    # This runs within the same transaction as the assignment update
    result = Events::RecalculateTotals.new(event: event).call
    unless result[:success]
      Rails.logger.error "Assignment #{id}: Failed to update event totals: #{result[:error]}"
      raise Events::RecalculateTotals::RecalculationError, result[:error]
    end
  rescue Events::RecalculateTotals::RecalculationError => e
    Rails.logger.error "Assignment #{id}: recalculation error - #{e.message}"
    raise
  rescue ActiveRecord::StatementInvalid => e
    Rails.logger.error "Assignment #{id}: recalculation raised #{e.class} - #{e.message}"
    raise
  rescue => e
    Rails.logger.error "Assignment #{id}: update_event_totals encountered #{e.class} - #{e.message}"
    raise
  ensure
    # Restore previous user context
    Current.user = previous_user
  end

  # Approval API
  def approve!(approved_by_user, notes: nil)
    # Build notes (append)
    combined_notes = if notes.present?
      timestamp = Time.current.strftime("%Y-%m-%d %H:%M UTC")
      note_text = "APPROVED (#{timestamp}): #{notes}"
      [self.approval_notes, note_text].compact.join("\n")
    else
      self.approval_notes
    end

    Rails.logger.info "Approving assignment #{id} (bypassing validations)"
    result = update_columns(
      approved: true,
      approved_by_id: approved_by_user.id,
      approved_at_utc: Time.current,
      approval_notes: combined_notes,
      updated_at: Time.current
    )
    Rails.logger.info "✅ Assignment #{id} approved successfully"
    result
  rescue => e
    Rails.logger.error "❌ Failed to approve: #{e.class} - #{e.message}"
    raise
  end

  def mark_no_show!(updated_by_user, notes: nil)
    ActiveRecord::Base.transaction do
      timestamp = Time.current.strftime("%Y-%m-%d %H:%M UTC")
      note_text = "NO SHOW (#{timestamp})"
      note_text += ": #{notes}" if notes.present?
      combined_notes = [self.approval_notes, note_text].compact.join("\n")

      Rails.logger.info "Marking assignment #{id} as no-show (bypassing validations)"
      result = update_columns(
        status: 'no_show',
        hours_worked: 0,
        edited_by_id: updated_by_user.id,
        edited_at_utc: Time.current,
        approved_by_id: updated_by_user.id,
        approved_at_utc: Time.current,
        approval_notes: combined_notes,
        updated_at: Time.current
      )

      if shift&.event
        Events::RecalculateTotals.new(event: shift.event).call rescue nil
      end

      Rails.logger.info "✅ Assignment #{id} marked as no-show successfully"
      result
    end
  rescue => e
    Rails.logger.error "❌ Failed to mark no-show: #{e.class} - #{e.message}"
    raise
  end

  def remove_from_job!(updated_by_user, notes: nil)
    ActiveRecord::Base.transaction do
      timestamp = Time.current.strftime("%Y-%m-%d %H:%M UTC")
      note_text = "REMOVED (#{timestamp})"
      note_text += ": #{notes}" if notes.present?
      combined_notes = [self.approval_notes, note_text].compact.join("\n")

      Rails.logger.info "Removing assignment #{id} (bypassing validations)"
      result = update_columns(
        status: 'cancelled',
        hours_worked: 0,
        edited_by_id: updated_by_user.id,
        edited_at_utc: Time.current,
        approved_by_id: updated_by_user.id,
        approved_at_utc: Time.current,
        approval_notes: combined_notes,
        updated_at: Time.current
      )

      if shift&.event
        Events::RecalculateTotals.new(event: shift.event).call rescue nil
      end

      Rails.logger.info "✅ Assignment #{id} removed successfully"
      result
    end
  rescue => e
    Rails.logger.error "❌ Failed to remove: #{e.class} - #{e.message}"
    raise
  end

  def can_edit_hours?
    # Can edit if shift has ended (even after approval for corrections)
    shift&.end_time_utc && shift.end_time_utc < Time.current
  end

  def can_approve?
    # Can approve if shift has ended
    shift&.end_time_utc && shift.end_time_utc < Time.current
  end

  # Display-friendly status for reports
  def status_display
    return 'No-Show' if status == 'no_show'
    return 'Removed' if status == 'cancelled' || status == 'removed'
    return 'Approved' if approved?
    return 'Pending'
  end

  # Short username for display (e.g., "natalie" instead of "natalie@socialcatering.com")
  def approved_by_name
    approved_by&.email&.split('@')&.first || ''
  end

  # Ensure controller visibility
  public :can_edit_hours?, :can_approve?, :approve!, :mark_no_show!, :remove_from_job!, :status_display, :approved_by_name

  private

  def check_for_existing_active_assignment
    # Skip check if this assignment is cancelled or no_show (allows duplicates for these statuses)
    return if status.in?(['cancelled', 'no_show'])
    
    # Check if there's already an active assignment for this worker+shift combo
    existing = Assignment.where(shift_id: shift_id, worker_id: worker_id)
                        .where.not(status: ['cancelled', 'no_show'])
                        .where.not(id: id) # Exclude self if updating
                        .exists?
    
    if existing
      errors.add(:worker_id, "is already assigned to this shift")
      throw(:abort)
    end
  end

  def track_hours_changes
    if saved_change_to_hours_worked? && persisted?
      self.original_hours_worked ||= hours_worked_before_last_save
      self.edited_at_utc = Time.current
      self.edited_by = Current.user if Current.user
    end
  end
end
