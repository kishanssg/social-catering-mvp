#!/usr/bin/env ruby

# Fix shifts that have null role_needed and capacity
# This script will update existing shifts with proper values

require_relative 'config/environment'

puts "🔧 Fixing shifts with null role_needed and capacity..."

# Find events with shifts that have null role_needed
events_with_bad_shifts = Event.joins(:shifts)
  .where(shifts: { role_needed: nil })
  .distinct

puts "Found #{events_with_bad_shifts.count} events with bad shifts"

events_with_bad_shifts.each do |event|
  puts "\n📅 Processing event: #{event.title} (ID: #{event.id})"
  
  # Get skill requirements
  skill_reqs = event.event_skill_requirements
  
  if skill_reqs.empty?
    puts "  ⚠️  No skill requirements found, skipping..."
    next
  end
  
  puts "  📋 Skill requirements:"
  skill_reqs.each do |sr|
    puts "    - #{sr.skill_name}: #{sr.needed_workers} workers"
  end
  
  # Delete existing bad shifts
  bad_shifts = event.shifts.where(role_needed: nil)
  puts "  🗑️  Deleting #{bad_shifts.count} bad shifts"
  bad_shifts.destroy_all
  
  # Regenerate shifts
  puts "  🔄 Regenerating shifts..."
  begin
    generated_shifts = event.generate_shifts!
    puts "  ✅ Generated #{generated_shifts.count} shifts"
    
    # Verify the new shifts
    new_shifts = event.shifts.reload
    puts "  🔍 Verification:"
    new_shifts.each do |shift|
      puts "    - Shift #{shift.id}: #{shift.role_needed} (capacity: #{shift.capacity})"
    end
    
  rescue => e
    puts "  ❌ Error generating shifts: #{e.message}"
  end
end

puts "\n🎉 Done fixing shifts!"
