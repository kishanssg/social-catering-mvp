# Fix Event Status Logic - Ensure Active/Completed are correctly separated
# Active = published + end_time_utc > now
# Completed = status='completed' OR (published + end_time_utc <= now)

puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts "🔧 FIXING EVENT STATUS LOGIC"
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts ""

current_time = Time.current
puts "Current time: #{current_time}"
puts ""

ActiveRecord::Base.transaction do
  # Get all events with schedules
  events = Event.joins(:event_schedule).includes(:event_schedule).order('event_schedules.start_time_utc ASC')

  issues_found = []
  fixed_count = 0

  events.each do |event|
    next unless event.event_schedule

    schedule = event.event_schedule
    end_time = schedule.end_time_utc
    is_future = end_time > current_time
    is_past = end_time <= current_time

    # Determine what the status SHOULD be
    should_be_active = event.status == 'published' && is_future
    should_be_completed = event.status == 'completed' || (event.status == 'published' && is_past)

    # Check for issues
    issue = nil

    if event.status == 'published' && is_past
      # Published event that's in the past should be completed
      issue = "Published event in past (ends #{end_time.strftime('%Y-%m-%d %H:%M')})"
      event.update!(status: 'completed', completed_at_utc: end_time)
      fixed_count += 1
      puts "  ✓ Fixed: #{event.title}"
      puts "    Changed: published → completed"
    elsif event.status == 'completed' && is_future
      # Completed event that's in the future should be published
      issue = "Completed event in future (ends #{end_time.strftime('%Y-%m-%d %H:%M')})"
      event.update!(status: 'published', completed_at_utc: nil)
      fixed_count += 1
      puts "  ✓ Fixed: #{event.title}"
      puts "    Changed: completed → published"
    end

    if issue
      issues_found << {
        event_id: event.id,
        title: event.title,
        current_status: event.status,
        end_time: end_time.strftime('%Y-%m-%d %H:%M'),
        issue: issue
      }
    end
  end

  puts ""
  puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  puts "✅ FIX COMPLETE"
  puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  puts ""
  puts "Fixed #{fixed_count} events"
  puts ""

  # Verification
  puts "📊 VERIFICATION:"
  puts ""

  active_events = Event.published.joins(:event_schedule)
                       .where('event_schedules.end_time_utc > ?', current_time)
                       .count
  puts "  Active events (published + future): #{active_events}"

  completed_by_status = Event.where(status: 'completed').count
  completed_by_date = Event.published.joins(:event_schedule)
                          .where('event_schedules.end_time_utc <= ?', current_time)
                          .count
  total_completed = completed_by_status + completed_by_date
  puts "  Completed events (status='completed' + past published): #{total_completed}"
  puts "    • By status: #{completed_by_status}"
  puts "    • By date (past published): #{completed_by_date}"

  draft_events = Event.where(status: 'draft').count
  puts "  Draft events: #{draft_events}"
  puts ""

  # Show all events with their classifications
  puts "📋 ALL EVENTS BY CLASSIFICATION:"
  puts ""

  puts "  ACTIVE (published + future):"
  Event.published.joins(:event_schedule)
       .where('event_schedules.end_time_utc > ?', current_time)
       .order('event_schedules.start_time_utc ASC')
       .each do |e|
    puts "    • #{e.title} (ends #{e.event_schedule.end_time_utc.strftime('%Y-%m-%d %H:%M')})"
  end

  puts ""
  puts "  COMPLETED (status='completed'):"
  Event.where(status: 'completed')
       .joins(:event_schedule)
       .order('event_schedules.end_time_utc DESC')
       .limit(10)
       .each do |e|
    puts "    • #{e.title} (ended #{e.event_schedule.end_time_utc.strftime('%Y-%m-%d %H:%M')})"
  end

  puts ""
  puts "  COMPLETED (published + past):"
  Event.published.joins(:event_schedule)
       .where('event_schedules.end_time_utc <= ?', current_time)
       .order('event_schedules.end_time_utc DESC')
       .limit(10)
       .each do |e|
    puts "    • #{e.title} (ended #{e.event_schedule.end_time_utc.strftime('%Y-%m-%d %H:%M')})"
  end

  puts ""
end
