# Fix Active Events Dates
# Purpose: Update published events to have future dates so they show as "active"

puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts "🔧 FIXING ACTIVE EVENTS DATES"
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts ""

# Get all published events
published_events = Event.where(status: 'published').includes(:event_schedule)

puts "Found #{published_events.count} published events"
puts ""

# Update dates to November 2025 (future dates)
# Distribute them across the month: Nov 5, 9, 10, 15, 16, 23, 24, 29, 30, etc.
future_dates = [
  Date.new(2025, 11, 5),   # Wednesday
  Date.new(2025, 11, 9),   # Sunday
  Date.new(2025, 11, 10),  # Monday
  Date.new(2025, 11, 15),  # Saturday
  Date.new(2025, 11, 16),  # Sunday
  Date.new(2025, 11, 19),  # Wednesday
  Date.new(2025, 11, 20),  # Thursday
  Date.new(2025, 11, 23),  # Sunday
  Date.new(2025, 11, 24),  # Monday
  Date.new(2025, 11, 27),  # Thursday
  Date.new(2025, 11, 29),  # Saturday
  Date.new(2025, 11, 30)   # Sunday
]

updated_count = 0
published_events.each_with_index do |event, index|
  next unless event.event_schedule
  next if index >= future_dates.length
  
  future_date = future_dates[index]
  new_start = future_date.beginning_of_day + 18.hours  # 6 PM
  new_end = future_date.beginning_of_day + 23.hours    # 11 PM
  
  # Update event schedule
  event.event_schedule.update!(
    start_time_utc: new_start,
    end_time_utc: new_end
  )
  
  # Update all shifts for this event
  event.shifts.update_all(
    start_time_utc: new_start,
    end_time_utc: new_end
  )
  
  puts "  ✓ #{event.title} → #{future_date.strftime('%B %d, %Y')}"
  updated_count += 1
end

puts ""
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts "✅ UPDATED #{updated_count} EVENTS TO FUTURE DATES"
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts ""
puts "📊 VERIFICATION:"
puts "  Active events (end_time_utc > now): #{Event.published.joins(:event_schedule).where('event_schedules.end_time_utc > ?', Time.current).count}"
puts "  Completed events (end_time_utc <= now): #{Event.published.joins(:event_schedule).where('event_schedules.end_time_utc <= ?', Time.current).count}"

