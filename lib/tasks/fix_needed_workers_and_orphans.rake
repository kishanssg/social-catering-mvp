namespace :events do
  desc "Fix needed_workers values AND remove orphaned shifts in one pass"
  task fix_needed_workers_and_orphans: :environment do
    puts "=== Fixing needed_workers and removing orphaned shifts ==="

    fixed_events = 0
    total_orphans_removed = 0

    Event.includes(:event_skill_requirements, :shifts).find_each do |event|
      event_fixed = false

      event.event_skill_requirements.each do |req|
        # Count actual shifts for this requirement
        all_shifts = event.shifts.where(event_skill_requirement_id: req.id)
        total_shifts = all_shifts.count

        # Count assigned shifts (ones we can't delete)
        assigned_shifts = all_shifts.joins(:assignments)
                                   .where.not(assignments: { status: [ "cancelled", "no_show" ] })
                                   .distinct
                                   .count

        # The correct needed_workers should be: assigned shifts + reasonable buffer
        # For now, let's assume needed_workers should equal total shifts minus orphans
        # Orphans = unassigned shifts beyond what makes sense

        # Find unassigned shifts
        unassigned_shifts = all_shifts.left_joins(:assignments)
                                     .where(assignments: { id: nil })
                                     .order(id: :desc)

        unassigned_count = unassigned_shifts.count

        # If we have more unassigned than assigned, that's suspicious
        # Keep at most assigned_shifts + 2 buffer for unassigned
        reasonable_unassigned = [ assigned_shifts + 2, 2 ].max

        if unassigned_count > reasonable_unassigned
          orphans_to_remove = unassigned_count - reasonable_unassigned
          correct_needed = assigned_shifts + reasonable_unassigned

          puts "Event #{event.id} - #{event.title}"
          puts "  #{req.skill_name}:"
          puts "    Current: needed_workers=#{req.needed_workers}, total_shifts=#{total_shifts}"
          puts "    Assigned: #{assigned_shifts}, Unassigned: #{unassigned_count}"
          puts "    Action: Set needed_workers=#{correct_needed}, remove #{orphans_to_remove} orphans"

          # Remove orphan shifts
          unassigned_shifts.limit(orphans_to_remove).each(&:destroy)

          # Update needed_workers to correct value
          req.update_column(:needed_workers, correct_needed)

          total_orphans_removed += orphans_to_remove
          event_fixed = true
        end
      end

      fixed_events += 1 if event_fixed
    end

    puts "\n=== Summary ==="
    puts "Fixed #{fixed_events} events"
    puts "Removed #{total_orphans_removed} orphaned shifts"
    puts "Done!"
  end
end
