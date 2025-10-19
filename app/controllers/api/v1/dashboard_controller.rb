module Api
  module V1
    class DashboardController < BaseController
      def index
        # Get shift counts by status
        shift_counts = Shift.group(:status).count

        # Get shifts by fill status - use consistent logic with events
        all_shifts = Shift.includes(:assignments).where("start_time_utc >= ?", Time.current)

        unfilled = []
        partial = []
        covered = []

        all_shifts.each do |shift|
          assigned = shift.assigned_count
          required = shift.event_id.present? && shift.skill_requirement ? 
                     shift.skill_requirement.needed_workers : shift.capacity
          
          if assigned == 0
            unfilled << shift
          elsif assigned < required
            partial << shift
          else
            covered << shift
          end
        end

        # Get today's shifts
        today_shifts = Shift.includes(:assignments, :workers)
          .where("DATE(start_time_utc) = ?", Time.current.utc.to_date)
          .order(:start_time_utc)

        # Get upcoming shifts (next 7 days)
        upcoming_shifts = Shift.includes(:assignments, :workers)
          .where("start_time_utc BETWEEN ? AND ?", Time.current, 7.days.from_now)
          .order(:start_time_utc)
          .limit(20)

        render_success({
          shift_counts: {
            draft: shift_counts["draft"] || 0,
            published: shift_counts["published"] || 0,
            assigned: shift_counts["assigned"] || 0,
            completed: shift_counts["completed"] || 0,
            total: Shift.count
          },
          fill_status: {
            unfilled: unfilled.count,
            partial: partial.count,
            covered: covered.count
          },
          today_shifts: today_shifts.as_json(
            include: {
              workers: { only: [ :id, :first_name, :last_name ] },
              assignments: { only: [ :id, :status ] }
            },
            methods: [ :assigned_count, :available_slots ]
          ),
          upcoming_shifts: upcoming_shifts.as_json(
            include: {
              workers: { only: [ :id, :first_name, :last_name ] }
            },
            methods: [ :assigned_count, :available_slots ]
          )
        })
      end
    end
  end
end
