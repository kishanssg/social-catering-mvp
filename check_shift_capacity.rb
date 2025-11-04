#!/usr/bin/env ruby

# Check shift capacity and assignment status
require_relative 'config/environment'

puts "=== SHIFT CAPACITY AND ASSIGNMENT ANALYSIS ==="

Event.published.each do |event|
  puts "\nEvent: #{event.title}"
  event.shifts.each do |shift|
    filled = shift.assignments.where(status: ['confirmed', 'completed']).count
    assigned = shift.assignments.where(status: 'assigned').count
    gap = shift.capacity - filled
    
    puts "  Shift #{shift.id}: capacity=#{shift.capacity}, filled=#{filled}, assigned=#{assigned}, gap=#{gap}"
  end
end

puts "\n=== TOTAL GAPS CALCULATION ==="
total_gaps = 0
Event.published.each do |event|
  event.shifts.each do |shift|
    filled = shift.assignments.where(status: ['confirmed', 'completed']).count
    total_gaps += (shift.capacity - filled) if filled < shift.capacity
  end
end
puts "Total gaps: #{total_gaps}"
