namespace :events do
  desc "Remove orphaned unassigned shifts beyond needed_workers (use EVENT_ID to target a specific event)"
  task fix_orphaned_shifts: :environment do
    event_id = ENV['EVENT_ID']
    scope = event_id.present? ? Event.where(id: event_id) : Event.all

    scope.find_each do |event|
      puts "Checking event #{event.id} - #{event.title}"
      event.event_skill_requirements.includes(:shifts).each do |req|
        needed = req.needed_workers || 0
        total_shifts = req.shifts.count
        extra = total_shifts - needed
        next if extra <= 0

        puts "  Role #{req.skill_name}: #{total_shifts} shifts, needs #{needed} (removing #{extra})"
        orphan_scope = req.shifts
                            .left_joins(:assignments)
                            .where(assignments: { id: nil })
                            .order(id: :desc)
        removed = 0
        orphan_scope.limit(extra).find_each do |shift|
          shift.destroy
          removed += 1
        end

        puts "    Removed #{removed} orphan shift(s)"
      end
    end
  end
end

