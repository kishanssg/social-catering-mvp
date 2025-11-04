#!/usr/bin/env ruby

# Load Rails environment
require_relative 'config/environment'

puts "="*60
puts "DATA QUALITY VERIFICATION"
puts "="*60

# Check venue data (should be real Tallahassee locations)
puts "\n🏢 Venue Quality Check:"
Venue.limit(3).each do |venue|
  puts "  #{venue.name}"
  puts "    Address: #{venue.formatted_address}"
  puts "    Parking: #{venue.parking_info&.truncate(50)}"
end

# Check worker names (should be realistic)
puts "\n👥 Worker Quality Check:"
Worker.limit(5).each do |worker|
  puts "  #{worker.first_name} #{worker.last_name}"
  puts "    Email: #{worker.email}"
  puts "    Phone: #{worker.phone}"
  puts "    Skills: #{worker.skills_json.join(', ')}"
end

# Check event titles (should be realistic)
puts "\n📅 Event Quality Check:"
Event.limit(5).each do |event|
  puts "  #{event.title}"
  puts "    Venue: #{event.venue&.name}"
  puts "    Date: #{event.event_schedule&.start_time_utc&.strftime('%B %d, %Y')}"
  puts "    Status: #{event.status}"
end

# Check hours worked for completed events
puts "\n⏱️  Hours Worked Check:"
completed_assignments = Assignment.where(status: 'completed').includes(shift: :event)
if completed_assignments.any?
  total_hours = completed_assignments.sum(&:hours_worked)
  avg_hours = total_hours / completed_assignments.count
  puts "  Total completed assignments: #{completed_assignments.count}"
  puts "  Total hours worked: #{total_hours.round(2)}"
  puts "  Average hours per shift: #{avg_hours.round(2)}"
  puts "  Range: #{completed_assignments.minimum(:hours_worked).round(2)} - #{completed_assignments.maximum(:hours_worked).round(2)}"
  
  if avg_hours.between?(3.0, 6.0)
    puts "  ✅ Hours are realistic"
  else
    puts "  ⚠️  Hours seem unusual"
  end
else
  puts "  ❌ No completed assignments found"
end

puts "="*60
