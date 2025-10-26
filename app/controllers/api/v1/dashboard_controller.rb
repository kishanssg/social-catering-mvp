module Api
  module V1
    class DashboardController < BaseController
      def index
        # Calculate basic stats using Events
        stats = {
          draft_events: Event.draft.count,
          published_events: Event.published.includes(:event_schedule)
            .select { |e| e.event_schedule&.end_time_utc && e.event_schedule.end_time_utc > Time.current }
            .count,
          completed_events: Event.completed.count,
          total_workers: Worker.where(active: true).count,
          gaps_to_fill: 0
        }

        # Calculate unfilled roles across ALL active events (not just current month)
        # Active events are published events that haven't ended yet
        active_events = Event.published.includes(:shifts)
          .joins(:event_schedule)
          .where('event_schedules.end_time_utc > ?', Time.current)
        
        stats[:gaps_to_fill] = active_events.sum do |event|
          event.unfilled_roles_count
        end

        # Get urgent events (next 7 days with unfilled capacity)
        urgent_events = Event.published
          .joins(:event_schedule)
          .where('event_schedules.start_time_utc BETWEEN ? AND ?',
                 Time.current, 7.days.from_now)
          .includes(:shifts)
          .select { |event| event.unfilled_roles_count > 0 }

        # Get calendar data (current month)
        today = Date.today
        month_start = today.beginning_of_month
        month_end = today.end_of_month
        
        month_events = Event.published
          .joins(:event_schedule)
          .where('event_schedules.start_time_utc BETWEEN ? AND ?',
                 month_start, month_end + 1.day)
          .count

        render_success({
          draft_events: stats[:draft_events],
          published_events: stats[:published_events],
          completed_events: stats[:completed_events],
          total_workers: stats[:total_workers],
          gaps_to_fill: stats[:gaps_to_fill],
          urgent_events: urgent_events.count,
          month_events: month_events
        })
      end
    end
  end
end
