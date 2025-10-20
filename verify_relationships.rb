#!/usr/bin/env ruby

# Load Rails environment
require_relative 'config/environment'

puts "="*60
puts "RELATIONSHIP VERIFICATION"
puts "="*60

# Test Event → Venue relationship
puts "\n1. Events have venues:"
events_with_venues = Event.where.not(venue_id: nil).count
puts "Events with venues: #{events_with_venues}/#{Event.count}"
if events_with_venues == Event.count
  puts "✅ All events have venues"
else
  puts "❌ Some events missing venues"
end

# Test Event → Schedule relationship
puts "\n2. Events have schedules:"
events_with_schedules = Event.joins(:event_schedule).count
puts "Events with schedules: #{events_with_schedules}/#{Event.count}"
if events_with_schedules == Event.count
  puts "✅ All events have schedules"
else
  puts "❌ Some events missing schedules"
end

# Test Event → Skills relationship
puts "\n3. Events have skill requirements:"
events_with_skills = Event.joins(:event_skill_requirements).distinct.count
puts "Events with skills: #{events_with_skills}/#{Event.count}"
if events_with_skills == Event.count
  puts "✅ All events have skill requirements"
else
  puts "❌ Some events missing skills"
end

# Test Worker → Skills relationship
puts "\n4. Workers have skills:"
workers_with_skills = Worker.where("skills_json IS NOT NULL AND skills_json != '[]'").count
puts "Workers with skills: #{workers_with_skills}/#{Worker.count}"
if workers_with_skills == Worker.count
  puts "✅ All workers have skills"
else
  puts "❌ Some workers missing skills"
end

# Test Shift → Event relationship (published/completed only)
puts "\n5. Published/Completed events have shifts:"
published_completed = Event.where(status: ['published', 'completed'])
events_with_shifts = published_completed.joins(:shifts).distinct.count
puts "Events with shifts: #{events_with_shifts}/#{published_completed.count}"
if events_with_shifts == published_completed.count
  puts "✅ All published/completed events have shifts"
else
  puts "❌ Some events missing shifts"
end

# Test Assignment → Worker relationship
puts "\n6. Assignments have workers:"
assignments_with_workers = Assignment.joins(:worker).count
puts "Assignments with workers: #{assignments_with_workers}/#{Assignment.count}"
if assignments_with_workers == Assignment.count
  puts "✅ All assignments have workers"
else
  puts "❌ Some assignments missing workers"
end

# Test Worker skill matching
puts "\n7. Assignments match worker skills:"
mismatched = 0
Assignment.includes(:worker, shift: :event).each do |assignment|
  unless assignment.worker.skills_json.include?(assignment.shift.role_needed)
    mismatched += 1
  end
end
puts "Mismatched assignments: #{mismatched}"
if mismatched == 0
  puts "✅ All assignments match worker skills"
else
  puts "⚠️  #{mismatched} assignments don't match worker skills"
end

puts "="*60
