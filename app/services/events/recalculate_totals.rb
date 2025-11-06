# frozen_string_literal: true

# Service to recalculate event totals (hours, pay, counts)
# Single Source of Truth for event aggregate calculations
class Events::RecalculateTotals
  def initialize(event:)
    @event = event
  end

  def call
    return failure("Event is required") unless @event.present?
    
    ActiveRecord::Base.transaction do
      @event.update_columns(
        total_hours_worked: calculate_total_hours,
        total_pay_amount: calculate_total_pay,
        assigned_shifts_count: calculate_assigned_shifts,
        total_shifts_count: @event.shifts.count,
        updated_at: Time.current
      )
      
      success(@event)
    end
  rescue => e
    Rails.logger.error "Events::RecalculateTotals failed for event #{@event.id}: #{e.message}"
    failure("Failed to recalculate totals: #{e.message}")
  end

  private

  def calculate_total_hours
    @event.shifts.includes(:assignments)
      .flat_map(&:assignments)
      .reject { |a| a.status.in?(['cancelled', 'no_show']) }
      .sum(&:effective_hours)
      .round(2)
  end

  def calculate_total_pay
    @event.shifts.includes(:assignments)
      .flat_map(&:assignments)
      .reject { |a| a.status.in?(['cancelled', 'no_show']) }
      .sum(&:effective_pay)
      .round(2)
  end

  def calculate_assigned_shifts
    @event.shifts.joins(:assignments)
      .where.not(assignments: { status: ['cancelled', 'no_show'] })
      .distinct
      .count
  end

  def success(event)
    { success: true, event: event }
  end

  def failure(message)
    { success: false, error: message }
  end
end

