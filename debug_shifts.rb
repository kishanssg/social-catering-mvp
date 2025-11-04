#!/usr/bin/env ruby

# Debug script to check shift data
require_relative 'config/environment'

puts "🔍 Debugging shift data for event 146..."

event = Event.find(146)
puts "Event: #{event.title} (Status: #{event.status})"

shifts = event.shifts
puts "Total shifts: #{shifts.count}"

shifts.each_with_index do |shift, index|
  puts "\nShift #{index + 1}:"
  puts "  ID: #{shift.id}"
  puts "  Role needed: #{shift.role_needed.inspect}"
  puts "  Capacity: #{shift.capacity.inspect}"
  puts "  Client name: #{shift.client_name}"
  puts "  Start time: #{shift.start_time_utc}"
  puts "  End time: #{shift.end_time_utc}"
  puts "  Assignments count: #{shift.assignments.count}"
end

puts "\n🔍 Checking raw SQL..."
raw_shifts = ActiveRecord::Base.connection.execute(
  "SELECT id, role_needed, capacity, client_name FROM shifts WHERE event_id = 146"
)

puts "Raw SQL results:"
raw_shifts.each do |row|
  puts "  ID: #{row['id']}, Role: #{row['role_needed'].inspect}, Capacity: #{row['capacity'].inspect}"
end
