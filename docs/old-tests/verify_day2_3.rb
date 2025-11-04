#!/usr/bin/env ruby

# Load Rails environment
require_relative 'config/environment'

puts "=== DAY 2-3 VERIFICATION ==="

# Check models exist
puts "\n1. Checking models..."
puts "Event model exists: #{defined?(Event) == 'constant'}"
puts "Assignment model exists: #{defined?(Assignment) == 'constant'}"
puts "Job model exists: #{defined?(Job) == 'constant'}"  # Should be false
puts "Staffing model exists: #{defined?(Staffing) == 'constant'}"  # Should be false

# Check indexes
puts "\n2. Checking indexes..."
event_indexes = ActiveRecord::Base.connection.indexes(:events).map(&:name)
puts "Events indexes: #{event_indexes.count}"
shift_indexes = ActiveRecord::Base.connection.indexes(:shifts).map(&:name)
puts "Shifts indexes: #{shift_indexes.count}"
assignment_indexes = ActiveRecord::Base.connection.indexes(:assignments).map(&:name)
puts "Assignments indexes: #{assignment_indexes.count}"

# Test queries
puts "\n3. Testing queries..."
begin
  Event.where(status: 'published').limit(1).to_a
  puts "✅ Event queries working"
rescue => e
  puts "❌ Event queries failed: #{e.message}"
end

begin
  Assignment.includes(:worker, :shift).limit(1).to_a
  puts "✅ Assignment queries working"
rescue => e
  puts "❌ Assignment queries failed: #{e.message}"
end

puts "\n=== SUMMARY ==="
puts "All checks should show ✅"
