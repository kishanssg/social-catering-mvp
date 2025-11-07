class Shift < ApplicationRecord
  include Auditable

  belongs_to :created_by, class_name: "User"
  belongs_to :required_cert, class_name: "Certification", optional: true
  belongs_to :location, optional: true

  # Event relationships (optional to support standalone shifts)
  belongs_to :event, optional: true
  belongs_to :skill_requirement,
             optional: true,
             class_name: 'EventSkillRequirement',
             foreign_key: 'event_skill_requirement_id'

  has_many :assignments, dependent: :destroy
  has_many :workers, through: :assignments

  # Recalculate event totals when shift pay_rate changes (affects assignment effective_pay)
  after_update :recalculate_event_totals_if_pay_rate_changed, if: :saved_change_to_pay_rate?

  validates :client_name, :role_needed, :start_time_utc, :end_time_utc, :capacity, presence: true
  validates :capacity, numericality: { greater_than: 0 }
  validates :status, inclusion: { in: %w[draft published archived] }
  validate :end_time_after_start_time
  validate :same_calendar_day_as_event, if: -> { event_id.present? }
  validate :times_match_event_schedule, if: -> { event_id.present? && event&.event_schedule.present? }

  scope :upcoming, -> { where("start_time_utc > ?", Time.current).order(:start_time_utc) }
  scope :past, -> { where("end_time_utc < ?", Time.current).order(start_time_utc: :desc) }
  scope :today, -> { where("DATE(start_time_utc) = ?", Time.current.to_date) }
  scope :published, -> { where(status: 'published') }
  scope :draft, -> { where(status: 'draft') }
  scope :archived, -> { where(status: 'archived') }
  scope :active, -> { where.not(status: 'archived') }

  # Event-aware scopes
  scope :for_event, ->(event_id) { where(event_id: event_id) }
  scope :standalone, -> { where(event_id: nil) }
  scope :in_progress, -> { where("start_time_utc <= ? AND end_time_utc > ?", Time.current, Time.current) }
  scope :completed, -> { where("end_time_utc <= ?", Time.current) }
  scope :needing_workers, -> do
    joins("LEFT JOIN assignments ON assignments.shift_id = shifts.id")
      .group("shifts.id")
      .having("COUNT(assignments.id) < shifts.capacity")
  end
  scope :fully_staffed, -> do
    joins("LEFT JOIN assignments ON assignments.shift_id = shifts.id")
      .group("shifts.id")
      .having("COUNT(assignments.id) >= shifts.capacity")
  end

  def assigned_count
    assignments.where.not(status: 'cancelled').count
  end

  def available_slots
    capacity - assigned_count
  end
  
  def duration_hours
    ((end_time_utc - start_time_utc) / 1.hour).round(2)
  end

  # Computed, time-aware status to support UI without persisting
  def current_status
    now = Time.current

    return 'completed' if end_time_utc && now >= end_time_utc
    return 'in_progress' if start_time_utc && end_time_utc && now >= start_time_utc && now < end_time_utc

    fully_staffed? ? 'fully_staffed' : 'needs_workers'
  end

  def fully_staffed?
    # For individual shifts, use capacity as the required count
    assignments.count >= capacity
  end

  def staffing_progress
    # For individual shifts, use capacity as the required count
    # The skill requirement's needed_workers is used at the event level
    required_count = capacity
    assigned = assignments.count
    percentage = required_count.positive? ? (assigned.to_f / required_count * 100).round(0) : 0

    { assigned: assigned, required: required_count, percentage: percentage }
  end

  def staffing_summary
    progress = staffing_progress
    "#{progress[:assigned]} of #{progress[:required]}"
  end

  # Assignment helpers
  def can_assign_worker?(worker)
    return false if fully_staffed?
    return false unless worker

    # Check if worker has any conflicting assignments
    # Two shifts overlap if: shift1_start < shift2_end AND shift1_end > shift2_start
    conflicting = worker.assignments
                        .joins(:shift)
                        .where.not(shifts: { id: id })
                        .where.not(assignments: { status: ['cancelled', 'no_show'] })
                        .where(
                          "shifts.start_time_utc < ? AND shifts.end_time_utc > ?",
                          end_time_utc,   # This shift's end time
                          start_time_utc  # This shift's start time
                        )
    return false if conflicting.exists?

    # Required skill check if this shift is tied to a job requirement
    if skill_requirement&.skill_name.present?
      required_skill = skill_requirement.skill_name
      worker_skills = case worker.skills_json
                      when String then JSON.parse(worker.skills_json) rescue []
                      when Array then worker.skills_json
                      else []
                      end
      return false unless worker_skills.include?(required_skill)
    end

    # Certification check (ID-based only)
    if required_cert_id.present?
      has_valid = worker.worker_certifications
                        .where(certification_id: required_cert_id)
                        .where('expires_at_utc IS NULL OR expires_at_utc >= ?', end_time_utc)
                        .exists?
      return false unless has_valid
    end

    true
  end

  def conflict_reason(worker)
    return "Shift is fully staffed (#{capacity} workers)" if fully_staffed?
    return "No worker specified" unless worker

    # Find conflicting assignments (not just shifts, to include all assigned shifts)
    conflicting_assignment = worker.assignments
                                 .joins(:shift)
                                 .where.not(shifts: { id: id })
                                 .where.not(assignments: { status: ['cancelled', 'no_show'] })
                                 .where(
                                   "shifts.start_time_utc < ? AND shifts.end_time_utc > ?",
                                   end_time_utc,
                                   start_time_utc
                                 )
                                 .includes(:shift)
                                 .first

    if conflicting_assignment
      conflicting_shift = conflicting_assignment.shift
      start_time = conflicting_shift.start_time_utc.strftime('%I:%M %p')
      end_time = conflicting_shift.end_time_utc.strftime('%I:%M %p')
      return "Worker has conflicting shift '#{conflicting_shift.client_name}' (#{start_time} - #{end_time})"
    end

    if skill_requirement&.skill_name.present?
      required_skill = skill_requirement.skill_name
      worker_skills = case worker.skills_json
                      when String then JSON.parse(worker.skills_json) rescue []
                      when Array then worker.skills_json
                      else []
                      end
      unless worker_skills.include?(required_skill)
        return "Worker does not have required skill: #{required_skill}"
      end
    end

    # Certification check (ID-based only)
    if required_cert_id.present?
      req_name = required_cert&.name || 'required certification'
      wc = worker.worker_certifications.find_by(certification_id: required_cert_id)
      return "Worker does not have required certification: #{req_name}" if wc.nil?
      if wc.expires_at_utc && wc.expires_at_utc < end_time_utc
        return "Worker's certification '#{req_name}' expires on #{wc.expires_at_utc.strftime('%m/%d/%Y')}, before shift ends on #{end_time_utc.strftime('%m/%d/%Y')}"
      end
    end

    nil
  end

  private

  # Recalculate event totals when shift pay_rate changes
  # This ensures assignments using shift.pay_rate have correct effective_pay
  def recalculate_event_totals_if_pay_rate_changed
    return unless event.present?
    
    # Use centralized recalculation service (SSOT)
    result = Events::RecalculateTotals.new(event: event).call
    unless result[:success]
      Rails.logger.error "Shift #{id}: Failed to update event totals after pay_rate change: #{result[:error]}"
      # Don't raise - allow shift update to succeed
    end
  end

  def end_time_after_start_time
    if end_time_utc && start_time_utc && end_time_utc <= start_time_utc
      errors.add(:end_time_utc, "must be after start time")
    end
  end

  def same_calendar_day_as_event
    return unless event&.event_schedule
    
    event_date = event.event_schedule.start_time_utc.to_date
    shift_date = start_time_utc.to_date
    
    if event_date != shift_date
      errors.add(:start_time_utc, "must be on the same calendar day as the event (#{event_date}). Shift date is #{shift_date}")
    end
  end

  def times_match_event_schedule
    return unless event&.event_schedule
    
    schedule = event.event_schedule
    
    # For event-owned shifts, enforce exact time match
    # This prevents shifts from diverging from event schedule
    unless start_time_utc == schedule.start_time_utc && end_time_utc == schedule.end_time_utc
      errors.add(:base, 
        "Shift times must match event schedule. " \
        "Expected: #{schedule.start_time_utc.strftime('%Y-%m-%d %H:%M')} - #{schedule.end_time_utc.strftime('%Y-%m-%d %H:%M')}, " \
        "Got: #{start_time_utc.strftime('%Y-%m-%d %H:%M')} - #{end_time_utc.strftime('%Y-%m-%d %H:%M')}. " \
        "Update the event schedule instead."
      )
    end
  end
end
