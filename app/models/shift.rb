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

  validates :client_name, :role_needed, :start_time_utc, :end_time_utc, :capacity, presence: true
  validates :capacity, numericality: { greater_than: 0 }
  validates :status, inclusion: { in: %w[draft published archived] }
  validate :end_time_after_start_time

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

    # Overlap check
    conflicting = worker.shifts
                        .where.not(id: id)
                        .where("start_time_utc < ? AND end_time_utc > ?", end_time_utc, start_time_utc)
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

    true
  end

  def conflict_reason(worker)
    return "Shift is fully staffed" if fully_staffed?
    return "No worker specified" unless worker

    conflicting = worker.shifts
                        .where.not(id: id)
                        .where("start_time_utc < ? AND end_time_utc > ?", end_time_utc, start_time_utc)
                        .first
    if conflicting
      return "Worker already assigned to '#{conflicting.client_name}' at #{conflicting.start_time_utc.strftime('%I:%M %p')}"
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

    nil
  end

  private

  def end_time_after_start_time
    if end_time_utc && start_time_utc && end_time_utc <= start_time_utc
      errors.add(:end_time_utc, "must be after start time")
    end
  end
end
