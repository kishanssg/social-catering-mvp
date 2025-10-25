module Api
  module V1
    class DashboardController < BaseController
      def index
        # Calculate basic stats
        # Calculate active events (published events that haven't ended yet)
        active_events = Event.published
          .joins(:event_schedule)
          .where('event_schedules.end_time_utc > ?', Time.current)
        
        # Calculate past events (published events that have ended)
        past_events = Event.published
          .joins(:event_schedule)
          .where('event_schedules.end_time_utc <= ?', Time.current)
        
        stats = {
          draft_events: Event.draft.count,
          published_events: active_events.count,  # Show active events, not all published
          completed_events: past_events.count,    # Show all past events, not just manually completed
          total_workers: Worker.active.count,
          gaps_to_fill: 0
        }

        # Calculate gaps (total unfilled roles for current month only)
        current_month_start = Date.current.beginning_of_month
        current_month_end = Date.current.end_of_month
        
        current_month_events = Event.published
          .joins(:event_schedule)
          .where('event_schedules.start_time_utc BETWEEN ? AND ?', 
                 current_month_start.beginning_of_day, 
                 current_month_end.end_of_day)
        
        stats[:gaps_to_fill] = current_month_events.sum(&:unfilled_roles_count)

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
