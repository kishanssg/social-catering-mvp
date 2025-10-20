module Api
  module V1
    class DashboardController < BaseController
      def index
        # Calculate basic stats
        stats = {
          draft_events: Event.draft.count,
          published_events: Event.published.count,
          completed_events: Event.completed.count,
          total_workers: Worker.active.count,
          gaps_to_fill: 0
        }

        # Calculate gaps (unfilled shifts)
        Event.published.each do |event|
          event.shifts.each do |shift|
            filled = shift.assignments.where(status: ['confirmed', 'completed']).count
            stats[:gaps_to_fill] += (shift.capacity - filled) if filled < shift.capacity
          end
        end

        # Get urgent events (next 7 days with unfilled shifts)
        urgent_events = Event.published
          .joins(:event_schedule)
          .where('event_schedules.start_time_utc BETWEEN ? AND ?',
                 Time.current, 7.days.from_now)
          .select { |e| e.has_unfilled_shifts? rescue false }

        # Get calendar data (current month)
        today = Date.today
        month_start = today.beginning_of_month
        month_end = today.end_of_month
        
        month_events = Event.published
          .joins(:event_schedule)
          .where('event_schedules.start_time_utc BETWEEN ? AND ?',
                 month_start, month_end + 1.day)

        render_success({
          draft_events: stats[:draft_events],
          published_events: stats[:published_events],
          completed_events: stats[:completed_events],
          total_workers: stats[:total_workers],
          gaps_to_fill: stats[:gaps_to_fill],
          urgent_events: urgent_events.count,
          month_events: month_events.count
        })
      end
    end
  end
end
