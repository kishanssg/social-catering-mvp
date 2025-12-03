# app/models/concerns/hours_calculations.rb
module HoursCalculations
  extend ActiveSupport::Concern

  # ═══════════════════════════════════════════════════════════
  # SINGLE SOURCE OF TRUTH - Hours Calculations
  # All hours logic must use these methods
  # ═══════════════════════════════════════════════════════════

  # Calculate effective hours for a single assignment
  # Priority: status check > logged hours > scheduled hours > 0
  def effective_hours
    return 0.0 unless shift.present?

    # ✅ CRITICAL: No-show and cancelled assignments always return 0 hours
    if respond_to?(:status) && status.in?([ "no_show", "cancelled" ])
      return 0.0
    end

    # Use logged hours if present (after timesheet approval)
    if hours_worked.present? && hours_worked > 0
      hours_worked.to_f
    # Otherwise use scheduled hours (shift duration)
    elsif shift.start_time_utc.present? && shift.end_time_utc.present?
      duration_seconds = shift.end_time_utc - shift.start_time_utc
      hours = duration_seconds / 3600.0
      [ hours, 0.0 ].max.round(2) # Ensure non-negative
    else
      0.0
    end
  rescue => e
    Rails.logger.error "Error calculating effective_hours for assignment #{id}: #{e.message}"
    0.0
  end

  # Calculate scheduled hours only (for display purposes)
  def scheduled_hours
    return 0.0 unless shift.present?
    shift.duration_hours
  rescue => e
    Rails.logger.error "Error calculating scheduled_hours for assignment #{id}: #{e.message}"
    0.0
  end

  # Check if hours have been manually logged
  def hours_logged?
    hours_worked.present? && hours_worked > 0
  end

  class_methods do
    # Calculate total hours for a collection of assignments
    def total_effective_hours
      sum { |assignment| assignment.effective_hours }
    end
  end
end
