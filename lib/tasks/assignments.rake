namespace :assignments do
  desc "Clean up duplicate active assignments (keeps most recent, cancels older ones)"
  task cleanup_duplicates: :environment do
    puts "🔍 Searching for duplicate active assignments..."
    
    # Find all duplicate active assignments (same shift_id + worker_id, excluding cancelled/no_show)
    duplicates = Assignment
      .where.not(status: ['cancelled', 'no_show'])
      .select('shift_id, worker_id, COUNT(*) as cnt')
      .group('shift_id, worker_id')
      .having('COUNT(*) > 1')
      .pluck('shift_id, worker_id')
    
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
        .where.not(status: ['cancelled', 'no_show'])
        .order(created_at: :desc)
      
      # Keep the most recent one, cancel the rest
      to_keep = assignments.first
      to_cancel = assignments.offset(1)
      
      if to_cancel.any?
        puts "  📋 Shift #{shift_id}, Worker #{worker_id}: Keeping assignment #{to_keep.id}, cancelling #{to_cancel.count} duplicate(s)"
        
        to_cancel.each do |assignment|
          assignment.update_columns(
            status: 'cancelled',
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
end
