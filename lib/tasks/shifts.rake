namespace :shifts do
  desc "Clean up duplicate shifts (same event, role, time, pay_rate) and merge assignments"
  task cleanup_duplicates: :environment do
    puts "🔍 Finding duplicate shifts..."

    # Get all shifts with events
    all_shifts = Shift.where("event_id IS NOT NULL").includes(:event, :assignments)

    # Group shifts by event_id, role, and rounded time (to handle microsecond differences)
    grouped = all_shifts.group_by do |shift|
      [
        shift.event_id,
        shift.role_needed,
        shift.start_time_utc&.change(usec: 0), # Round to seconds
        shift.end_time_utc&.change(usec: 0),   # Round to seconds
        shift.pay_rate&.to_f.round(2)          # Round pay_rate to 2 decimals
      ]
    end

    # Find groups with more than one shift
    duplicate_groups = grouped.select { |_key, shifts| shifts.count > 1 }

    total_duplicates = 0
    total_assignments_moved = 0
    total_shifts_deleted = 0

    duplicate_groups.each do |key, duplicate_shifts|
      event_id, role, start_time, end_time, pay_rate = key

      # Sort by ID to keep the oldest
      duplicate_shifts.sort_by!(&:id)
      keep_shift = duplicate_shifts.first
      duplicate_shifts_to_delete = duplicate_shifts[1..-1]

      puts "\n📋 Event #{event_id}: #{duplicate_shifts.count} duplicate shifts"
      puts "   Role: #{role}, Time: #{start_time} - #{end_time}, Rate: $#{pay_rate}"
      puts "   ✅ Keeping shift #{keep_shift.id} (oldest)"
      puts "   ❌ Deleting #{duplicate_shifts_to_delete.count} duplicate shift(s)"

      # Move assignments from duplicate shifts to the kept shift
      assignments_moved = 0
      duplicate_shifts_to_delete.each do |duplicate_shift|
        duplicate_shift.assignments.each do |assignment|
          # Check if worker is already assigned to the kept shift
          existing = Assignment.find_by(
            shift_id: keep_shift.id,
            worker_id: assignment.worker_id,
            status: [ "assigned", "confirmed", "completed" ]
          )

          if existing
            # Worker already assigned to kept shift - delete the duplicate assignment
            puts "     ⚠️  Assignment #{assignment.id} (worker #{assignment.worker_id}) already exists on kept shift - deleting duplicate"
            assignment.destroy
          else
            # Move assignment to kept shift
            assignment.update_column(:shift_id, keep_shift.id)
            assignments_moved += 1
            puts "     ➡️  Moved assignment #{assignment.id} (worker #{assignment.worker_id}) to shift #{keep_shift.id}"
          end
        end

        # Delete the duplicate shift
        shift_id = duplicate_shift.id
        duplicate_shift.destroy
        total_shifts_deleted += 1
        puts "     🗑️  Deleted shift #{shift_id}"
      end

      total_assignments_moved += assignments_moved
      total_duplicates += duplicate_shifts_to_delete.count

      # Recalculate event totals after cleanup
      begin
        keep_shift.event.recalculate_totals! if keep_shift.event
        puts "     ✅ Recalculated event totals"
      rescue => e
        puts "     ⚠️  Error recalculating totals: #{e.message}"
      end
    end

    puts "\n" + "="*60
    puts "✅ Cleanup Complete!"
    puts "   Duplicate shift groups found: #{duplicate_groups.count}"
    puts "   Total duplicate shifts deleted: #{total_shifts_deleted}"
    puts "   Total assignments moved: #{total_assignments_moved}"
    puts "="*60
  end

  desc "Dry run: Show what would be cleaned up without making changes"
  task cleanup_duplicates_dry_run: :environment do
    puts "🔍 DRY RUN: Finding duplicate shifts (no changes will be made)..."

    all_shifts = Shift.where("event_id IS NOT NULL").includes(:assignments)

    grouped = all_shifts.group_by do |shift|
      [
        shift.event_id,
        shift.role_needed,
        shift.start_time_utc&.change(usec: 0),
        shift.end_time_utc&.change(usec: 0),
        shift.pay_rate&.to_f.round(2)
      ]
    end

    duplicate_groups = grouped.select { |_key, shifts| shifts.count > 1 }

    total_duplicates = 0
    total_assignments = 0

    duplicate_groups.each do |key, duplicate_shifts|
      event_id, role, start_time, end_time, pay_rate = key

      duplicate_shifts.sort_by!(&:id)
      keep_shift = duplicate_shifts.first
      duplicate_shifts_to_delete = duplicate_shifts[1..-1]

      puts "\n📋 Event #{event_id}: #{duplicate_shifts.count} duplicate shifts"
      puts "   Role: #{role}, Time: #{start_time} - #{end_time}, Rate: $#{pay_rate}"
      puts "   ✅ Would keep shift #{keep_shift.id} (#{keep_shift.assignments.count} assignments)"
      puts "   ❌ Would delete #{duplicate_shifts_to_delete.count} shift(s):"

      duplicate_shifts_to_delete.each do |duplicate_shift|
        assignment_count = duplicate_shift.assignments.count
        total_assignments += assignment_count
        puts "      - Shift #{duplicate_shift.id} (#{assignment_count} assignments)"
      end

      total_duplicates += duplicate_shifts_to_delete.count
    end

    puts "\n" + "="*60
    puts "📊 DRY RUN Summary:"
    puts "   Duplicate shift groups: #{duplicate_groups.count}"
    puts "   Total duplicate shifts: #{total_duplicates}"
    puts "   Total assignments to move: #{total_assignments}"
    puts "="*60
    puts "\n💡 Run 'rails shifts:cleanup_duplicates' to perform the cleanup"
  end
end
