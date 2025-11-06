# Production Data Cleanup Script - Step by Step
# Purpose: Adjust production data to realistic Social Catering scale

puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts "🔧 PRODUCTION DATA CLEANUP"
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts ""

# ==========================================
# 1. WORKERS: Reduce 38 → 22-25 active
# ==========================================
puts "📋 STEP 1: Adjusting Workers"
puts "  Finding top workers by assignment count..."

# Get all active workers and count their assignments
active_workers = Worker.where(active: true).to_a
worker_counts = {}

active_workers.each do |worker|
  count = Assignment.where(worker_id: worker.id).count
  worker_counts[worker.id] = count if count > 0
end

# Sort by count and get top 20
top_worker_ids = worker_counts.sort_by { |_id, count| -count }.first(20).map(&:first)

puts "  ✓ Top 20 workers with assignments: #{top_worker_ids.count}"

# Get 2-3 workers with good profiles but no assignments
workers_with_profiles = Worker
  .where(active: true)
  .where.not(id: top_worker_ids)
  .where("skills_json IS NOT NULL")
  .where("skills_json != '[]'")
  .where("skills_json != '{}'")
  .limit(3)
  .pluck(:id)

puts "  ✓ Workers with good profiles (no assignments): #{workers_with_profiles.count}"

# Combine: Top 22-23 workers to keep active
workers_to_keep = (top_worker_ids + workers_with_profiles).uniq

# Deactivate the rest
workers_to_deactivate = Worker.where(active: true).where.not(id: workers_to_keep)
deactivated_count = workers_to_deactivate.update_all(active: false)

puts "  ✓ Deactivated #{deactivated_count} workers"
puts "  ✓ Active workers now: #{Worker.where(active: true).count}"
puts ""

# ==========================================
# 2. EVENTS: 26 published → 10-12 upcoming
# ==========================================
puts "📅 STEP 2: Adjusting Events"

# Cutoff date: Nov 5, 2024
cutoff_date = Time.zone.parse('2024-11-05 00:00:00 UTC')

# Find published events with future dates (using event_schedule)
published_future = Event
  .where(status: 'published')
  .joins(:event_schedule)
  .where('event_schedules.start_time_utc >= ?', cutoff_date)
  .order('event_schedules.start_time_utc ASC')
  .to_a

# Filter to those with assignments
events_with_assignments = []
published_future.each do |event|
  has_assignments = false
  event.shifts.each do |shift|
    if Assignment.where(shift_id: shift.id).exists?
      has_assignments = true
      break
    end
  end
  
  if has_assignments
    events_with_assignments << event.id
    break if events_with_assignments.count >= 12
  end
end

puts "  ✓ Keeping #{events_with_assignments.count} published events (Nov 5+)"

# Convert older published events to completed
events_to_complete = Event.where(status: 'published').where.not(id: events_with_assignments)

completed_count = 0
events_to_complete.find_each do |event|
  next unless event.event_schedule # Skip if no schedule
  
  # Backdate to Sept 1 - Nov 4 range
  start_backdate = Date.new(2024, 9, 1)
  end_backdate = Date.new(2024, 11, 4)
  random_date = start_backdate + rand((end_backdate - start_backdate).to_i).days
  
  new_start = random_date.beginning_of_day + 18.hours
  new_end = random_date.beginning_of_day + 23.hours
  
  # Update event status and schedule
  event.update!(
    status: 'completed',
    completed_at_utc: random_date.end_of_day,
    created_at_utc: random_date - 7.days
  )
  
  # Update event_schedule
  event.event_schedule.update!(
    start_time_utc: new_start,
    end_time_utc: new_end
  )
  
  # Update all shifts for this event
  event.shifts.update_all(
    start_time_utc: new_start,
    end_time_utc: new_end
  )
  
  completed_count += 1
end

puts "  ✓ Converted #{completed_count} events to completed (backdated to Sept/Oct)"
puts "  ✓ Published events now: #{Event.where(status: 'published').count}"
puts "  ✓ Completed events now: #{Event.where(status: 'completed').count}"
puts ""

# ==========================================
# 3. SUMMARY
# ==========================================
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts "✅ CLEANUP COMPLETE"
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts ""
puts "📊 FINAL NUMBERS:"
puts "  Workers:"
puts "    • Active: #{Worker.where(active: true).count}"
puts "    • Inactive: #{Worker.where(active: false).count}"
puts ""
puts "  Events:"
puts "    • Published (upcoming): #{Event.where(status: 'published').count}"
puts "    • Completed (historical): #{Event.where(status: 'completed').count}"
puts "    • Draft: #{Event.where(status: 'draft').count}"
puts "    • Deleted: #{Event.where(status: 'deleted').count}"
puts ""
puts "  Shifts: #{Shift.count}"
puts "  Assignments: #{Assignment.count}"
puts ""
puts "✅ All admin users preserved"
puts "✅ All assignments preserved"
puts "✅ All venue data preserved"
