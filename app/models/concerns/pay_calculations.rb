# app/models/concerns/pay_calculations.rb
module PayCalculations
  extend ActiveSupport::Concern

  # ═══════════════════════════════════════════════════════════
  # SINGLE SOURCE OF TRUTH - Pay Rate Calculations
  # All pay rate logic must use these methods
  # ═══════════════════════════════════════════════════════════

  # Minimum wage constant (single place to update)
  # Uses AppConstants for centralized configuration
  DEFAULT_PAY_RATE = AppConstants::DEFAULT_PAY_RATE

  # Calculate effective hourly rate for an assignment
  # Priority: assignment rate > shift rate > requirement rate > default
  def effective_hourly_rate
    return DEFAULT_PAY_RATE unless shift.present?

    hourly_rate.presence ||
    shift.pay_rate.presence ||
    shift.skill_requirement&.pay_rate ||
    DEFAULT_PAY_RATE
  end

  # Calculate effective pay for this assignment
  def effective_pay
    (effective_hours * effective_hourly_rate).round(2)
  end

  # Get the source of the current rate (for debugging/auditing)
  def rate_source
    if hourly_rate.present?
      "assignment"
    elsif shift.pay_rate.present?
      "shift"
    elsif shift.skill_requirement&.pay_rate.present?
      "requirement"
    else
      "default"
    end
  end

  class_methods do
    # Calculate total pay for a collection of assignments
    def total_effective_pay
      sum { |assignment| assignment.effective_pay }
    end
  end
end
