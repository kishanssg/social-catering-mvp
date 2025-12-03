module Api
  module V1
    class DashboardController < BaseController
      def index
        # Calculate basic stats using Events
        # IMPORTANT: Match the Events page tabs exactly
        # Draft tab = Events with status: 'draft'
        # Active tab = Events with status: 'published' AND end_time_utc > Time.current
        # Past tab = Events with status: 'published' AND end_time_utc <= Time.current

        stats = {
          draft_events: Event.draft.count,
          # Active = published events that haven't ended yet
          published_events: Event.published
            .joins(:event_schedule)
            .where("event_schedules.end_time_utc > ?", Time.current)
            .count,
          # Completed = status='completed' OR (published + past)
          completed_events: (
            Event.where(status: "completed").pluck(:id) +
            Event.published
              .joins(:event_schedule)
              .where("event_schedules.end_time_utc <= ?", Time.current)
              .pluck(:id)
          ).uniq.size,
          total_workers: Worker.where(active: true).count,
          gaps_to_fill: 0
        }

        # Calculate unfilled roles across ALL active events (not just current month)
        # Active events are published events that haven't ended yet
        # OPTIMIZED: Use SQL aggregation instead of Ruby loops to prevent N+1 queries
        active_events = Event.published
          .joins(:event_schedule)
          .includes(:event_skill_requirements, shifts: :assignments)
          .where("event_schedules.end_time_utc > ?", Time.current)

        # Calculate gaps using SQL aggregation for better performance
        stats[:gaps_to_fill] = active_events.sum do |event|
          # Use eager-loaded associations to avoid N+1
          total_needed = event.event_skill_requirements.sum(:needed_workers)
          # Count assigned workers per role, respecting needed_workers limit
          assigned = 0
          event.event_skill_requirements.each do |req|
            role_shifts = event.shifts.select { |s| s.role_needed == req.skill_name }.first(req.needed_workers)
            role_assigned = role_shifts.sum { |shift| shift.assignments.count { |a| !a.status.in?([ "cancelled", "no_show" ]) } }
            assigned += [ role_assigned, req.needed_workers ].min
          end
          total_needed - assigned
        end

        # Get urgent events (next 7 days with unfilled capacity)
        # OPTIMIZED: Filter in SQL instead of Ruby select
        urgent_events = Event.published
          .joins(:event_schedule)
          .includes(:event_skill_requirements, shifts: :assignments)
          .where("event_schedules.start_time_utc BETWEEN ? AND ?",
                 Time.current, 7.days.from_now)
          .select { |event|
            # Use eager-loaded associations
            total_needed = event.event_skill_requirements.sum(:needed_workers)
            assigned = 0
            event.event_skill_requirements.each do |req|
              role_shifts = event.shifts.select { |s| s.role_needed == req.skill_name }.first(req.needed_workers)
              role_assigned = role_shifts.sum { |shift| shift.assignments.count { |a| !a.status.in?([ "cancelled", "no_show" ]) } }
              assigned += [ role_assigned, req.needed_workers ].min
            end
            (total_needed - assigned) > 0
          }

        # Get calendar data (current month)
        today = Date.today
        month_start = today.beginning_of_month
        month_end = today.end_of_month

        month_events = Event.published
          .joins(:event_schedule)
          .where("event_schedules.start_time_utc BETWEEN ? AND ?",
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
