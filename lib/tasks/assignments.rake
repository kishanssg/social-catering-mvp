namespace :assignments do
  desc "Clean up duplicate active assignments (keeps most recent, cancels older ones)"
  task cleanup_duplicates: :environment do
    puts "🔍 Searching for duplicate active assignments..."

    # Find all duplicate active assignments (same shift_id + worker_id, excluding cancelled/no_show)
    duplicates = Assignment
      .where.not(status: [ "cancelled", "no_show" ])
      .select("shift_id, worker_id, COUNT(*) as cnt")
      .group("shift_id, worker_id")
      .having("COUNT(*) > 1")
      .pluck("shift_id, worker_id")

    if duplicates.empty?
      puts "✅ No duplicate assignments found!"
      exit 0
    end

    puts "⚠️  Found #{duplicates.count} duplicate groups"

    total_removed = 0

    duplicates.each do |shift_id, worker_id|
      # Get all active assignments for this shift+worker combo
      assignments = Assignment
        .where(shift_id: shift_id, worker_id: worker_id)
        .where.not(status: [ "cancelled", "no_show" ])
        .order(created_at: :desc)

      # Keep the most recent one, cancel the rest
      to_keep = assignments.first
      to_cancel = assignments.offset(1)

      if to_cancel.any?
        puts "  📋 Shift #{shift_id}, Worker #{worker_id}: Keeping assignment #{to_keep.id}, cancelling #{to_cancel.count} duplicate(s)"

        to_cancel.each do |assignment|
          assignment.update_columns(
            status: "cancelled",
            approval_notes: (assignment.approval_notes.to_s + "\n[System] Duplicate assignment removed by cleanup task on #{Time.current.strftime('%Y-%m-%d')}").strip,
            updated_at: Time.current
          )
          total_removed += 1
        end

        # Recalculate event totals
        if to_keep.shift&.event
          Events::RecalculateTotals.new(event: to_keep.shift.event).call rescue nil
        end
      end
    end

    puts "✅ Cleanup complete! Cancelled #{total_removed} duplicate assignment(s)"
  end

  desc "Backfill approved_by_id and approved_at_utc for existing no-show/removed assignments"
  task backfill_approval_fields: :environment do
    puts "🔍 Backfilling approved_by_id and approved_at_utc for existing no-show/removed assignments..."

    # Find assignments that are no-show or removed but don't have approved_by_id set
    assignments_to_fix = Assignment.where(status: [ "no_show", "cancelled", "removed" ])
                                    .where(approved_by_id: nil)

    puts "📋 Found #{assignments_to_fix.count} assignments to backfill"

    if assignments_to_fix.empty?
      puts "✅ No assignments need backfilling!"
      exit 0
    end

    updated_count = 0
    skipped_count = 0

    assignments_to_fix.find_each do |assignment|
      approved_by_id = nil
      approved_at_utc = nil

      # Strategy 1: Look for activity log with 'marked_no_show' or 'removed_from_job' action
      activity_log = ActivityLog.where(
        entity_type: "Assignment",
        entity_id: assignment.id,
        action: assignment.status == "no_show" ? "marked_no_show" : "removed_from_job"
      ).order(created_at_utc: :desc).first

      if activity_log && activity_log.actor_user_id
        approved_by_id = activity_log.actor_user_id
        approved_at_utc = activity_log.created_at_utc
        puts "  ✅ Assignment #{assignment.id}: Found activity log (user: #{approved_by_id}, time: #{approved_at_utc})"
      elsif assignment.edited_by_id && assignment.edited_at_utc
        # Strategy 2: Fall back to edited_by_id and edited_at_utc
        approved_by_id = assignment.edited_by_id
        approved_at_utc = assignment.edited_at_utc
        puts "  ⚠️  Assignment #{assignment.id}: Using edited_by/edited_at as fallback (user: #{approved_by_id}, time: #{approved_at_utc})"
      else
        puts "  ❌ Assignment #{assignment.id}: No user/time data found - skipping"
        skipped_count += 1
        next
      end

      # Update the assignment
      assignment.update_columns(
        approved_by_id: approved_by_id,
        approved_at_utc: approved_at_utc,
        updated_at: Time.current
      )
      updated_count += 1
    end

    puts "\n✅ Backfill complete!"
    puts "   Updated: #{updated_count} assignments"
    puts "   Skipped: #{skipped_count} assignments (no user/time data found)"
  end
end
