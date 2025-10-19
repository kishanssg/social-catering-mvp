#!/usr/bin/env ruby

# Test script to verify shift status workflow logic
# This simulates the valid_status_transition? method from the controller

def valid_status_transition?(from_status, to_status)
  transitions = {
    'draft' => ['published', 'archived'],
    'published' => ['assigned', 'completed', 'archived'],
    'assigned' => ['completed', 'archived'],
    'completed' => ['archived']
  }
  
  transitions[from_status]&.include?(to_status) || false
end

# Test cases
test_cases = [
  # Valid transitions
  ['draft', 'published', true],
  ['draft', 'archived', true],
  ['published', 'assigned', true],
  ['published', 'completed', true],
  ['published', 'archived', true],
  ['assigned', 'completed', true],
  ['assigned', 'archived', true],
  ['completed', 'archived', true],
  
  # Invalid transitions
  ['draft', 'assigned', false],
  ['draft', 'completed', false],
  ['published', 'draft', false],
  ['assigned', 'draft', false],
  ['assigned', 'published', false],
  ['completed', 'draft', false],
  ['completed', 'published', false],
  ['completed', 'assigned', false],
  ['archived', 'draft', false],
  ['archived', 'published', false],
  ['archived', 'assigned', false],
  ['archived', 'completed', false]
]

puts "Testing Shift Status Workflow Logic"
puts "=" * 50

all_passed = true

test_cases.each do |from, to, expected|
  result = valid_status_transition?(from, to)
  status = result == expected ? "✓ PASS" : "✗ FAIL"
  
  if result != expected
    all_passed = false
  end
  
  puts "#{status} #{from} → #{to}: #{result} (expected #{expected})"
end

puts "\n" + "=" * 50
if all_passed
  puts "🎉 All tests passed! Status workflow logic is correct."
else
  puts "❌ Some tests failed. Check the logic above."
end

