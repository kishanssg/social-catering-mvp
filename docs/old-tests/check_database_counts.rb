#!/usr/bin/env ruby

# Check database counts
require_relative 'config/environment'

puts "=== DATABASE COUNTS VERIFICATION ==="
puts "Workers total: #{Worker.count}"
puts "Workers active: #{Worker.where(active: true).count}"
puts "Workers inactive: #{Worker.where(active: false).count}"
puts ""
puts "Events total: #{Event.count}"
puts "Events draft: #{Event.draft.count}"
puts "Events published: #{Event.published.count}"
puts "Events completed: #{Event.completed.count}"
puts ""
puts "Assignments total: #{Assignment.count}"
puts "Assignments assigned: #{Assignment.where(status: 'assigned').count}"
puts "Assignments completed: #{Assignment.where(status: 'completed').count}"
puts ""
puts "Shifts total: #{Shift.count}"
puts "Shifts published: #{Shift.where(status: 'published').count}"

# Check gaps calculation
puts ""
puts "=== GAPS CALCULATION ==="
gaps = 0
Event.published.each do |event|
  event.shifts.each do |shift|
    filled = shift.assignments.where(status: ['confirmed', 'completed']).count
    gaps += (shift.capacity - filled) if filled < shift.capacity
  end
end
puts "Manual gaps calculation: #{gaps}"

# Check dashboard controller calculation
puts ""
puts "=== DASHBOARD CONTROLLER CALCULATION ==="
stats = {
  draft_events: Event.draft.count,
  published_events: Event.published.count,
  completed_events: Event.completed.count,
  total_workers: Worker.active.count,
  gaps_to_fill: 0
}

Event.published.each do |event|
  event.shifts.each do |shift|
    filled = shift.assignments.where(status: ['confirmed', 'completed']).count
    stats[:gaps_to_fill] += (shift.capacity - filled) if filled < shift.capacity
  end
end

puts "Dashboard stats: #{stats}"
