#!/usr/bin/env ruby

# Load Rails environment
require_relative 'config/environment'

puts "="*60
puts "SEED DATA VERIFICATION"
puts "="*60

# Basic counts
puts "\n📊 Record Counts:"
puts "Users: #{User.count} (expected: 1)"
puts "Workers: #{Worker.count} (expected: 25)"
puts "Skills: #{Skill.count} (expected: 12)"
puts "Certifications: #{Certification.count} (expected: 7)"
puts "Venues: #{Venue.count} (expected: 10)"
puts "Events: #{Event.count} (expected: 15)"
puts "Shifts: #{Shift.count} (expected: 40-60)"
puts "Assignments: #{Assignment.count} (expected: 40-80)"

# Event breakdown
puts "\n📅 Event Distribution:"
puts "Draft: #{Event.draft.count} (expected: 5)"
puts "Published: #{Event.published.count} (expected: 5)"
puts "Completed: #{Event.completed.count} (expected: 5)"

# Worker breakdown
puts "\n👥 Worker Distribution:"
puts "Active: #{Worker.where(active: true).count} (expected: ~19)"
puts "Inactive: #{Worker.where(active: false).count} (expected: ~6)"

# Assignment status
puts "\n✅ Assignment Status:"
puts "Confirmed: #{Assignment.where(status: 'confirmed').count}"
puts "Completed: #{Assignment.where(status: 'completed').count}"

puts "="*60
