module Api
  module V1
    class DashboardController < BaseController
      def index
        # Calculate basic stats using Shifts instead of Events
        # Calculate active shifts (published shifts that haven't ended yet)
        active_shifts = Shift.where(status: 'published')
          .where('end_time_utc > ?', Time.current)
        
        # Calculate past shifts (published shifts that have ended)
        past_shifts = Shift.where(status: 'published')
          .where('end_time_utc <= ?', Time.current)
        
        stats = {
          draft_events: Shift.where(status: 'draft').count,
          published_events: active_shifts.count,  # Show active shifts, not all published
          completed_events: past_shifts.count,    # Show all past shifts, not just manually completed
          total_workers: Worker.where(active: true).count,
          gaps_to_fill: 0
        }

        # Calculate gaps (total unfilled roles for current month only)
        current_month_start = Date.current.beginning_of_month
        current_month_end = Date.current.end_of_month
        
        current_month_shifts = Shift.where(status: 'published')
          .where('start_time_utc BETWEEN ? AND ?', 
                 current_month_start.beginning_of_day, 
                 current_month_end.end_of_day)
        
        # Calculate unfilled roles (capacity - assigned_count)
        stats[:gaps_to_fill] = current_month_shifts.sum do |shift|
          assigned_count = Assignment.where(shift_id: shift.id, status: 'assigned').count
          [shift.capacity - assigned_count, 0].max
        end

        # Get urgent shifts (next 7 days with unfilled capacity)
        urgent_shifts = Shift.where(status: 'published')
          .where('start_time_utc BETWEEN ? AND ?',
                 Time.current, 7.days.from_now)
          .select do |shift|
            assigned_count = Assignment.where(shift_id: shift.id, status: 'assigned').count
            assigned_count < shift.capacity
          end

        # Get calendar data (current month)
        today = Date.today
        month_start = today.beginning_of_month
        month_end = today.end_of_month
        
        month_shifts = Shift.where(status: 'published')
          .where('start_time_utc BETWEEN ? AND ?',
                 month_start, month_end + 1.day)

        render_success({
          draft_events: stats[:draft_events],
          published_events: stats[:published_events],
          completed_events: stats[:completed_events],
          total_workers: stats[:total_workers],
          gaps_to_fill: stats[:gaps_to_fill],
          urgent_events: urgent_shifts.count,
          month_events: month_shifts.count
        })
      end
    end
  end
end
