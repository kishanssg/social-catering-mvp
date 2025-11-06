class EventSchedule < ApplicationRecord
  include Auditable

  # Associations
  belongs_to :event

  # Validations
  validates :start_time_utc, presence: true
  validates :end_time_utc, presence: true
  validates :break_minutes, numericality: { greater_than_or_equal_to: 0 }
  validate :end_time_after_start_time

  # Callbacks for custom timestamp columns
  before_create :set_created_at_utc
  before_save :set_updated_at_utc
  
  # Sync shift times when schedule changes (Single Source of Truth)
  after_update :sync_shift_times, if: :times_changed?

  # Instance methods
  def duration_hours
    return 0 if start_time_utc.nil? || end_time_utc.nil?
    ((end_time_utc - start_time_utc) / 1.hour).round(2)
  end

  def work_hours
    duration_hours - (break_minutes / 60.0)
  end

  def formatted_duration
    hours = work_hours.floor
    minutes = ((work_hours - hours) * 60).round
    if minutes > 0
      "#{hours}h #{minutes}m"
    else
      "#{hours}h"
    end
  end

  def formatted_time_range
    return "No schedule set" if start_time_utc.nil? || end_time_utc.nil?
    
    start_str = start_time_utc.strftime("%a, %b %d, %Y at %I:%M %p")
    end_str = end_time_utc.strftime("%I:%M %p")
    "#{start_str} - #{end_str}"
  end

  private

  def end_time_after_start_time
    return unless start_time_utc && end_time_utc
    errors.add(:end_time_utc, "must be after start time") if end_time_utc <= start_time_utc
  end

  def set_created_at_utc
    self.created_at_utc ||= Time.current
  end

  def set_updated_at_utc
    self.updated_at_utc = Time.current
  end

  def times_changed?
    saved_change_to_start_time_utc? || saved_change_to_end_time_utc?
  end

  def sync_shift_times
    return unless event.present?
    
    # Use centralized service for shift time synchronization (Single Source of Truth)
    result = Events::SyncShiftTimes.new(
      event: event,
      start_time_utc: start_time_utc,
      end_time_utc: end_time_utc
    ).call
    
    unless result[:success]
      Rails.logger.error "EventSchedule #{id}: Failed to sync shift times: #{result[:error]}"
    end
  rescue => e
    Rails.logger.error "Error syncing shift times for EventSchedule #{id}: #{e.message}"
    # Don't raise - allow schedule update to succeed even if sync fails
    # (we'll log the error for debugging)
  end
end
