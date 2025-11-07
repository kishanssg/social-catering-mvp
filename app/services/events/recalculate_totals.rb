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
      valid_assignments = fetch_valid_assignments
      
      # Only update columns that exist (Event may use updated_at_utc instead of updated_at)
      update_hash = {
        total_hours_worked: calculate_total_hours(valid_assignments),
        total_pay_amount: calculate_total_pay(valid_assignments),
        assigned_shifts_count: calculate_assigned_shifts,
        total_shifts_count: @event.shifts.count
      }
      
      # Add timestamp if column exists
      if @event.class.column_names.include?('updated_at')
        update_hash[:updated_at] = Time.current
      elsif @event.class.column_names.include?('updated_at_utc')
        update_hash[:updated_at_utc] = Time.current
      end
      
      @event.update_columns(update_hash)
      
      # Log activity for audit trail
      log_recalculation_activity
      
      success(@event)
    end
  rescue => e
    Rails.logger.error "Events::RecalculateTotals failed for event #{@event.id}: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
    failure("Failed to recalculate totals: #{e.message}")
  end

  private

  # Fetch all valid assignments (excludes cancelled and no_show)
  # This is the SSOT for which assignments count toward totals
  def fetch_valid_assignments
    @event.shifts.includes(:assignments)
      .flat_map(&:assignments)
      .reject { |a| a.status.in?(['cancelled', 'no_show']) }
  end

  # Calculate total hours worked using effective_hours (SSOT)
  def calculate_total_hours(valid_assignments = nil)
    assignments = valid_assignments || fetch_valid_assignments
    assignments.sum(&:effective_hours).round(2)
  end

  # Calculate total pay (estimated cost) using effective_pay (SSOT)
  def calculate_total_pay(valid_assignments = nil)
    assignments = valid_assignments || fetch_valid_assignments
    assignments.sum(&:effective_pay).round(2)
  end

  def calculate_assigned_shifts
    @event.shifts.joins(:assignments)
      .where.not(assignments: { status: ['cancelled', 'no_show'] })
      .distinct
      .count
  end

  # Log recalculation activity for audit trail
  def log_recalculation_activity
    return unless Current.user
    
    ActivityLog.create!(
      actor_user_id: Current.user.id,
      entity_type: 'Event',
      entity_id: @event.id,
      action: 'totals_recalculated',
      after_json: {
        total_hours_worked: @event.total_hours_worked,
        total_pay_amount: @event.total_pay_amount,
        assigned_shifts_count: @event.assigned_shifts_count,
        total_shifts_count: @event.total_shifts_count
      },
      created_at_utc: Time.current
    )
  rescue => e
    # Don't fail recalculation if logging fails
    Rails.logger.warn "Failed to log recalculation activity: #{e.message}"
  end

  def success(event)
    { success: true, event: event }
  end

  def failure(message)
    { success: false, error: message }
  end
end

