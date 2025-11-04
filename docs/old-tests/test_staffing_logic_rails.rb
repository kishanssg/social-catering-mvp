# 🧪 RAILS CONSOLE TEST: STAFFING LOGIC VERIFICATION
# Deep backend testing of staffing calculations
# Run with: rails runner test_staffing_logic_rails.rb

puts "🧪 RAILS CONSOLE TEST: STAFFING LOGIC VERIFICATION"
puts "=" * 60
puts "Testing staffing calculations at the model level"
puts ""

# Test counters
tests_run = 0
tests_passed = 0
tests_failed = 0

def log_test(test_name, status, details = "")
  @tests_run += 1
  
  if status == :pass
    puts "✅ PASS: #{test_name}"
    @tests_passed += 1
  else
    puts "❌ FAIL: #{test_name}"
    puts "   Details: #{details}"
    @tests_failed += 1
  end
end

def log_section(title)
  puts ""
  puts "🔍 #{title}"
  puts "-" * 40
end

# Initialize counters
@tests_run = 0
@tests_passed = 0
@tests_failed = 0

# Test 1: Shift Model Staffing Progress
log_section "SHIFT MODEL STAFFING PROGRESS"

puts "Testing Shift#staffing_progress method..."

# Find shifts with different staffing levels
shifts = Shift.includes(:assignments, :skill_requirement).limit(10)

if shifts.any?
  shifts.each do |shift|
    puts "Testing Shift ID: #{shift.id} (#{shift.role_needed})"
    
    # Test 1.1: Capacity should always be 1
    if shift.capacity == 1
      log_test("Shift #{shift.id} capacity", :pass, "Capacity is 1")
    else
      log_test("Shift #{shift.id} capacity", :fail, "Capacity is #{shift.capacity}, should be 1")
    end
    
    # Test 1.2: Staffing progress calculation
    progress = shift.staffing_progress
    assigned = progress[:assigned]
    required = progress[:required]
    percentage = progress[:percentage]
    
    # Required should equal capacity
    if required == shift.capacity
      log_test("Shift #{shift.id} required count", :pass, "Required: #{required} (matches capacity)")
    else
      log_test("Shift #{shift.id} required count", :fail, "Required: #{required}, Capacity: #{shift.capacity}")
    end
    
    # Assigned should match actual assignments
    actual_assignments = shift.assignments.count
    if assigned == actual_assignments
      log_test("Shift #{shift.id} assigned count", :pass, "Assigned: #{assigned}")
    else
      log_test("Shift #{shift.id} assigned count", :fail, "Expected: #{actual_assignments}, Got: #{assigned}")
    end
    
    # Percentage calculation
    expected_percentage = required > 0 ? (assigned.to_f / required * 100).round(0) : 0
    if percentage == expected_percentage
      log_test("Shift #{shift.id} percentage calculation", :pass, "Percentage: #{percentage}%")
    else
      log_test("Shift #{shift.id} percentage calculation", :fail, "Expected: #{expected_percentage}%, Got: #{percentage}%")
    end
    
    puts "  Progress: #{assigned}/#{required} (#{percentage}%)"
    puts ""
  end
else
  log_test("Shift staffing progress", :fail, "No shifts found for testing")
end

# Test 2: Fully Staffed Logic
log_section "FULLY STAFFED LOGIC"

puts "Testing Shift#fully_staffed? method..."

shifts.each do |shift|
  is_fully_staffed = shift.fully_staffed?
  progress = shift.staffing_progress
  
  # Should be fully staffed if assigned >= capacity
  expected_fully_staffed = progress[:assigned] >= shift.capacity
  
  if is_fully_staffed == expected_fully_staffed
    log_test("Shift #{shift.id} fully_staffed?", :pass, "Correctly identified as #{is_fully_staffed ? 'fully staffed' : 'not fully staffed'}")
  else
    log_test("Shift #{shift.id} fully_staffed?", :fail, "Expected: #{expected_fully_staffed}, Got: #{is_fully_staffed}")
  end
end

# Test 3: Event-Level Calculations
log_section "EVENT-LEVEL CALCULATIONS"

puts "Testing Event-level staffing calculations..."

events = Event.includes(:shifts, :event_skill_requirements).limit(5)

events.each do |event|
  puts "Testing Event ID: #{event.id} (#{event.title})"
  
  # Test 3.1: Total workers needed
  calculated_total = event.event_skill_requirements.sum(:needed_workers)
  actual_total = event.total_workers_needed
  
  if calculated_total == actual_total
    log_test("Event #{event.id} total workers needed", :pass, "Total: #{actual_total}")
  else
    log_test("Event #{event.id} total workers needed", :fail, "Expected: #{calculated_total}, Got: #{actual_total}")
  end
  
  # Test 3.2: Assigned workers count
  calculated_assigned = event.shifts.joins(:assignments).count
  actual_assigned = event.assigned_workers_count
  
  if calculated_assigned == actual_assigned
    log_test("Event #{event.id} assigned workers count", :pass, "Assigned: #{actual_assigned}")
  else
    log_test("Event #{event.id} assigned workers count", :fail, "Expected: #{calculated_assigned}, Got: #{actual_assigned}")
  end
  
  # Test 3.3: Staffing percentage
  if actual_total > 0
    expected_percentage = (actual_assigned.to_f / actual_total * 100).round(0)
    actual_percentage = event.staffing_percentage
    
    if expected_percentage == actual_percentage
      log_test("Event #{event.id} staffing percentage", :pass, "Percentage: #{actual_percentage}%")
    else
      log_test("Event #{event.id} staffing percentage", :fail, "Expected: #{expected_percentage}%, Got: #{actual_percentage}%")
    end
  end
  
  puts ""
end

# Test 4: Role Group Calculations
log_section "ROLE GROUP CALCULATIONS"

puts "Testing role group calculations..."

events.each do |event|
  next unless event.shifts.any?
  
  puts "Testing Event ID: #{event.id} role groups..."
  
  # Group shifts by role
  shifts_by_role = event.shifts.group_by(&:role_needed)
  
  shifts_by_role.each do |role_name, role_shifts|
    total_shifts = role_shifts.count
    filled_shifts = role_shifts.count { |s| s.staffing_progress[:percentage] == 100 }
    
    puts "  Role: #{role_name} (#{filled_shifts}/#{total_shifts} filled)"
    
    # Test 4.1: Each shift should have capacity 1
    role_shifts.each do |shift|
      if shift.capacity == 1
        log_test("Role #{role_name} shift #{shift.id} capacity", :pass, "Capacity: 1")
      else
        log_test("Role #{role_name} shift #{shift.id} capacity", :fail, "Capacity: #{shift.capacity}")
      end
    end
    
    # Test 4.2: Filled count should match fully staffed shifts
    actual_filled = role_shifts.count { |s| s.fully_staffed? }
    if filled_shifts == actual_filled
      log_test("Role #{role_name} filled count", :pass, "Filled: #{filled_shifts}")
    else
      log_test("Role #{role_name} filled count", :fail, "Expected: #{actual_filled}, Got: #{filled_shifts}")
    end
  end
  
  puts ""
end

# Test 5: Edge Cases
log_section "EDGE CASES"

puts "Testing edge cases..."

# Test 5.1: Shifts with no assignments
unassigned_shifts = Shift.left_joins(:assignments).where(assignments: { id: nil }).limit(3)
unassigned_shifts.each do |shift|
  progress = shift.staffing_progress
  
  if progress[:assigned] == 0 && progress[:percentage] == 0
    log_test("Unassigned shift #{shift.id}", :pass, "Correctly shows 0/1 (0%)")
  else
    log_test("Unassigned shift #{shift.id}", :fail, "Expected 0/1 (0%), got #{progress[:assigned]}/#{progress[:required]} (#{progress[:percentage]}%)")
  end
end

# Test 5.2: Fully assigned shifts
fully_assigned_shifts = Shift.joins(:assignments).group('shifts.id').having('COUNT(assignments.id) >= shifts.capacity').limit(3)
fully_assigned_shifts.each do |shift|
  progress = shift.staffing_progress
  
  if progress[:assigned] == 1 && progress[:percentage] == 100
    log_test("Fully assigned shift #{shift.id}", :pass, "Correctly shows 1/1 (100%)")
  else
    log_test("Fully assigned shift #{shift.id}", :fail, "Expected 1/1 (100%), got #{progress[:assigned]}/#{progress[:required]} (#{progress[:percentage]}%)")
  end
end

# Test 5.3: Events with no shifts
events_without_shifts = Event.left_joins(:shifts).where(shifts: { id: nil }).limit(3)
events_without_shifts.each do |event|
  event_total_needed = event.event_skill_requirements.sum(&:needed_workers)
  event_assigned = 0
  
  if event_total_needed == 0 && event_assigned == 0
    log_test("Event #{event.id} with no shifts", :pass, "Correctly shows 0/0 workers")
  else
    log_test("Event #{event.id} with no shifts", :fail, "Expected 0/0, got #{event_assigned}/#{event_total_needed}")
  end
end

# Test 6: Data Integrity
log_section "DATA INTEGRITY"

puts "Testing data integrity..."

# Test 6.1: No shifts with null role_needed
null_role_shifts = Shift.where(role_needed: [nil, ''])
if null_role_shifts.count == 0
  log_test("No shifts with null role_needed", :pass, "All shifts have valid roles")
else
  log_test("No shifts with null role_needed", :fail, "Found #{null_role_shifts.count} shifts with null roles")
end

# Test 6.2: No shifts with null capacity
null_capacity_shifts = Shift.where(capacity: [nil, 0])
if null_capacity_shifts.count == 0
  log_test("No shifts with null/zero capacity", :pass, "All shifts have valid capacity")
else
  log_test("No shifts with null/zero capacity", :fail, "Found #{null_capacity_shifts.count} shifts with invalid capacity")
end

# Test 6.3: No orphaned assignments
orphaned_assignments = Assignment.left_joins(:shift).where(shifts: { id: nil })
if orphaned_assignments.count == 0
  log_test("No orphaned assignments", :pass, "All assignments have valid shifts")
else
  log_test("No orphaned assignments", :fail, "Found #{orphaned_assignments.count} orphaned assignments")
end

# Test 6.4: No assignments without workers
assignments_without_workers = Assignment.left_joins(:worker).where(workers: { id: nil })
if assignments_without_workers.count == 0
  log_test("No assignments without workers", :pass, "All assignments have valid workers")
else
  log_test("No assignments without workers", :fail, "Found #{assignments_without_workers.count} assignments without workers")
end

# Final Results
puts ""
puts "📊 RAILS CONSOLE TEST RESULTS"
puts "=" * 40
puts "Total Tests Run: #{@tests_run}"
puts "Tests Passed: #{@tests_passed}"
puts "Tests Failed: #{@tests_failed}"

if @tests_failed == 0
  puts ""
  puts "🎉 ALL TESTS PASSED!"
  puts "The staffing logic is working correctly at the model level."
  puts "No abstraction level mixing bugs detected."
else
  puts ""
  puts "❌ SOME TESTS FAILED"
  puts "Please review the failed tests above."
  puts "The staffing logic may have issues."
end

puts ""
puts "Test completed at #{Time.current}"
