namespace :shifts do
  desc "Clean up duplicate shifts (same event, role, time, pay_rate) and merge assignments"
  task cleanup_duplicates: :environment do
    puts "🔍 Finding duplicate shifts..."
    
    # Find all events with potential duplicates
    events_with_duplicates = Shift
      .where('event_id IS NOT NULL')
      .select('event_id, role_needed, start_time_utc, end_time_utc, pay_rate')
      .group('event_id, role_needed, start_time_utc, end_time_utc, pay_rate')
      .having('COUNT(*) > 1')
      .pluck('event_id, role_needed, start_time_utc, end_time_utc, pay_rate')
    
    total_duplicates = 0
    total_assignments_moved = 0
    total_shifts_deleted = 0
    
    # Group by event_id to process each event
    events_with_duplicates.group_by(&:first).each do |event_id, groups|
      puts "\n📋 Event #{event_id}:"
      
      groups.each do |group|
        event_id, role, start_time, end_time, pay_rate = group
        
        # Get all shifts in this duplicate group
        duplicate_shifts = Shift.where(
          event_id: event_id,
          role_needed: role,
          start_time_utc: start_time,
          end_time_utc: end_time,
          pay_rate: pay_rate
        ).order(:id) # Order by ID to keep the first one
        
        next if duplicate_shifts.count <= 1
        
        puts "   Role: #{role}, Time: #{start_time} - #{end_time}, Rate: $#{pay_rate}"
        puts "   Found #{duplicate_shifts.count} duplicate shifts"
        
        # Keep the first shift (oldest ID)
        keep_shift = duplicate_shifts.first
        duplicate_shifts_to_delete = duplicate_shifts.where.not(id: keep_shift.id)
        
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
              status: ['assigned', 'confirmed', 'completed']
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
    end
    
    puts "\n" + "="*60
    puts "✅ Cleanup Complete!"
    puts "   Events with duplicates: #{events_with_duplicates.group_by(&:first).count}"
    puts "   Total duplicate shifts deleted: #{total_shifts_deleted}"
    puts "   Total assignments moved: #{total_assignments_moved}"
    puts "="*60
  end
  
  desc "Dry run: Show what would be cleaned up without making changes"
  task cleanup_duplicates_dry_run: :environment do
    puts "🔍 DRY RUN: Finding duplicate shifts (no changes will be made)..."
    
    events_with_duplicates = Shift
      .where('event_id IS NOT NULL')
      .select('event_id, role_needed, start_time_utc, end_time_utc, pay_rate')
      .group('event_id, role_needed, start_time_utc, end_time_utc, pay_rate')
      .having('COUNT(*) > 1')
      .pluck('event_id, role_needed, start_time_utc, end_time_utc, pay_rate')
    
    total_duplicates = 0
    total_assignments = 0
    
    events_with_duplicates.group_by(&:first).each do |event_id, groups|
      puts "\n📋 Event #{event_id}:"
      
      groups.each do |group|
        event_id, role, start_time, end_time, pay_rate = group
        
        duplicate_shifts = Shift.where(
          event_id: event_id,
          role_needed: role,
          start_time_utc: start_time,
          end_time_utc: end_time,
          pay_rate: pay_rate
        ).order(:id)
        
        next if duplicate_shifts.count <= 1
        
        puts "   Role: #{role}, Time: #{start_time} - #{end_time}, Rate: $#{pay_rate}"
        
        keep_shift = duplicate_shifts.first
        duplicate_shifts_to_delete = duplicate_shifts.where.not(id: keep_shift.id)
        
        puts "   ✅ Would keep shift #{keep_shift.id} (#{keep_shift.assignments.count} assignments)"
        puts "   ❌ Would delete #{duplicate_shifts_to_delete.count} shift(s):"
        
        duplicate_shifts_to_delete.each do |duplicate_shift|
          assignment_count = duplicate_shift.assignments.count
          total_assignments += assignment_count
          puts "      - Shift #{duplicate_shift.id} (#{assignment_count} assignments)"
        end
        
        total_duplicates += duplicate_shifts_to_delete.count
      end
    end
    
    puts "\n" + "="*60
    puts "📊 DRY RUN Summary:"
    puts "   Events with duplicates: #{events_with_duplicates.group_by(&:first).count}"
    puts "   Total duplicate shifts: #{total_duplicates}"
    puts "   Total assignments to move: #{total_assignments}"
    puts "="*60
    puts "\n💡 Run 'rails shifts:cleanup_duplicates' to perform the cleanup"
  end
end
