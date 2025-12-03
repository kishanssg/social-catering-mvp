# frozen_string_literal: true

# Service to synchronize shift times with event schedule
# Single Source of Truth for shift time synchronization
class Events::SyncShiftTimes
  def initialize(event:, start_time_utc:, end_time_utc:)
    @event = event
    @start_time_utc = start_time_utc
    @end_time_utc = end_time_utc
  end

  def call
    return success(0) unless @event.present?

    event_shifts = @event.shifts.where.not(event_id: nil)
    return success(0) if event_shifts.empty?

    # Use nested transaction to allow rollback if called from within another transaction
    # This ensures atomicity with parent operations
    ActiveRecord::Base.transaction(requires_new: true) do
      # Find all event-owned shifts
      # Note: Validation prevents shifts from having different times than schedule,
      # so all shifts should sync. If validation is bypassed, we still sync them.

      updated_count = event_shifts.update_all(
        start_time_utc: @start_time_utc,
        end_time_utc: @end_time_utc,
        updated_at: Time.current
      )

      Rails.logger.info "Events::SyncShiftTimes: Synced times to #{updated_count} shifts for event #{@event.id}"

      # Trigger event totals recalculation (hours may have changed)
      # This is atomic within the transaction
      # Note: Continue even if recalculation fails (it's not critical for sync)
      if @event.respond_to?(:recalculate_totals!)
        begin
          recalc_result = @event.recalculate_totals!
          unless recalc_result
            Rails.logger.warn "Events::SyncShiftTimes: Recalculation returned false for event #{@event.id}, but sync succeeded"
          end
        rescue => e
          Rails.logger.error "Events::SyncShiftTimes: Recalculation failed for event #{@event.id}: #{e.message}"
          # Don't raise - sync should succeed even if recalculation fails
        end
      end

      # Log activity (inside transaction) when we have a valid actor
      if (user_id = Current.user&.id)
        ActivityLog.create!(
          actor_user_id: user_id,
          entity_type: "EventSchedule",
          entity_id: @event.event_schedule&.id,
          action: "shift_times_synced",
          after_json: {
            updated_shifts_count: updated_count,
            start_time_utc: @start_time_utc,
            end_time_utc: @end_time_utc
          },
          created_at_utc: Time.current
        )
      end

      success(updated_count)
    end
  rescue => e
    Rails.logger.error "Events::SyncShiftTimes failed for event #{@event.id}: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
    failure("Failed to sync shift times: #{e.message}")
  end

  private

  def success(count)
    { success: true, updated_count: count }
  end

  def failure(message)
    { success: false, error: message }
  end
end
