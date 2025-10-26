module Api
  module V1
    class DashboardController < BaseController
      def index
        # Calculate basic stats using Events to match the Events page
        # Calculate draft events
        draft_events = Event.where(status: 'draft')
        
        # Calculate active events (published events with end_time in the future)
        active_events = Event.joins(:event_schedule)
          .where(status: 'published')
          .where('event_schedules.end_time_utc > ?', Time.current)
        
        # Calculate completed events (published events with end_time in the past)
        completed_events = Event.joins(:event_schedule)
          .where(status: 'published')
          .where('event_schedules.end_time_utc <= ?', Time.current)
        
        stats = {
          draft_events: draft_events.count,
          published_events: active_events.count,
          completed_events: completed_events.count,
          total_workers: Worker.where(active: true).count,
          gaps_to_fill: 0
        }

        # Calculate gaps (total unfilled roles for events in current month)
        current_month_start = Date.current.beginning_of_month
        current_month_end = Date.current.end_of_month
        
        current_month_events = Event.joins(:event_schedule)
          .where(status: 'published')
          .where('event_schedules.start_time_utc BETWEEN ? AND ?', 
                 current_month_start.beginning_of_day, 
                 current_month_end.end_of_day)
        
        # Calculate unfilled roles from all shifts for these events
        stats[:gaps_to_fill] = current_month_events.sum do |event|
          event.shifts.sum do |shift|
            assigned_count = Assignment.where(shift_id: shift.id, status: 'assigned').count
            [shift.capacity - assigned_count, 0].max
          end
        end

        # Get urgent events (next 7 days with unfilled capacity)
        urgent_shifts = Shift.joins(:event)
          .joins('JOIN event_schedules ON event_schedules.event_id = events.id')
          .where(status: 'published')
          .where('event_schedules.start_time_utc BETWEEN ? AND ?',
                 Time.current, 7.days.from_now)
          .select do |shift|
            assigned_count = Assignment.where(shift_id: shift.id, status: 'assigned').count
            assigned_count < shift.capacity
          end

        # Get calendar data (current month)
        today = Date.today
        month_start = today.beginning_of_month
        month_end = today.end_of_month
        
        month_events = Event.joins(:event_schedule)
          .where(status: 'published')
          .where('event_schedules.start_time_utc BETWEEN ? AND ?',
                 month_start, month_end + 1.day)

        render_success({
          draft_events: stats[:draft_events],
          published_events: stats[:published_events],
          completed_events: stats[:completed_events],
          total_workers: stats[:total_workers],
          gaps_to_fill: stats[:gaps_to_fill],
          urgent_events: urgent_shifts.count,
          month_events: month_events.count
        })
      end
    end
  end
end
