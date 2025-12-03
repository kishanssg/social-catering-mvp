#!/usr/bin/env ruby
# One-time migration script to fix old events that are missing shifts
# Run this on staging/production to backfill missing shift records

puts "=== FIXING OLD EVENTS WITH MISSING SHIFTS ==="
puts "Finding published events with incomplete shifts...\n"

fixed_count = 0
skipped_count = 0

Event.where(status: 'published').find_each do |event|
  next unless event.event_schedule.present?
  next unless event.event_skill_requirements.any?

  needs_fixing = false

  # Check if event has missing shifts
  event.event_skill_requirements.each do |req|
    skill_name = req.skill_name
    next unless skill_name

    needed = req.needed_workers
    existing = event.shifts.where(role_needed: skill_name).count

    if existing < needed
      needs_fixing = true
      break
    end
  end

  if needs_fixing
    puts "\n📋 Fixing: #{event.title} (ID: #{event.id})"

    event.event_skill_requirements.each do |req|
      skill_name = req.skill_name
      next unless skill_name

      needed = req.needed_workers
      existing_shifts = event.shifts.where(role_needed: skill_name)
      existing_count = existing_shifts.count

      if existing_count < needed
        missing = needed - existing_count
        puts "  #{skill_name}: creating #{missing} shifts (has #{existing_count}, needs #{needed})"

        missing.times do
          event.shifts.create!(
            role_needed: skill_name,
            start_time_utc: event.event_schedule.start_time_utc,
            end_time_utc: event.event_schedule.end_time_utc,
            capacity: 1,
            status: 'needs_assignment',
            pay_rate: req.pay_rate,
            auto_generated: false,
            client_name: event.client_name || event.title
          )
        end
      end
    end

    puts "  ✅ Now has #{event.shifts.reload.count} total shifts"
    fixed_count += 1
  else
    skipped_count += 1
  end
end

puts "\n" + "="*50
puts "✅ MIGRATION COMPLETE"
puts "Fixed: #{fixed_count} events"
puts "Skipped (already complete): #{skipped_count} events"
puts "="*50
