#!/usr/bin/env ruby
# Script to verify event data accuracy in the database

# Find the Garden Wedding event
event = Event.find_by(title: "Garden Wedding Ceremony & Reception")

if event.nil?
  puts "❌ Event 'Garden Wedding Ceremony & Reception' not found!"
  puts "\nAvailable events:"
  Event.limit(10).each do |e|
    puts "  - #{e.title} (ID: #{e.id}, Status: #{e.status})"
  end
  exit 1
end

puts "=" * 80
puts "EVENT DATA VERIFICATION: #{event.title}"
puts "=" * 80
puts "Event ID: #{event.id}"
puts "Status: #{event.status}"
puts "Created: #{event.created_at_utc}"
puts ""

# Check event_skill_requirements
puts "📋 EVENT SKILL REQUIREMENTS (Roles Needed):"
puts "-" * 80
requirements = event.event_skill_requirements
puts "Total requirements: #{requirements.count}"
puts ""

total_needed = 0
requirements.each do |req|
  skill_name = req.skill_name || "Unknown (Requirement ID: #{req.id})"
  needed = req.needed_workers || 0
  total_needed += needed
  pay_rate = req.pay_rate || "N/A"
  puts "  #{skill_name}:"
  puts "    - Needed workers: #{needed}"
  puts "    - Pay rate: $#{pay_rate}"
  puts "    - Requirement ID: #{req.id}"
  puts ""
end

puts "Total workers needed (sum): #{total_needed}"
puts "Total workers needed (from model): #{event.total_workers_needed || 0}"
puts ""

# Check shifts
puts "🕐 SHIFTS:"
puts "-" * 80
shifts = event.shifts.includes(:assignments)
puts "Total shifts: #{shifts.count}"
puts ""

shifts_by_role = shifts.group_by(&:role_needed)
shifts_by_role.each do |role, role_shifts|
  puts "  #{role}:"
  puts "    - Shifts count: #{role_shifts.count}"
  role_shifts.each do |shift|
    assignments = shift.assignments.select { |a| a.worker&.active? }
    active_count = assignments.count { |a| a.status.in?(['confirmed', 'assigned', 'completed']) }
    puts "      Shift ID #{shift.id}:"
    puts "        - Capacity: #{shift.capacity}"
    puts "        - Active assignments: #{active_count}/#{shift.capacity}"
    puts "        - Time: #{shift.start_time_utc} to #{shift.end_time_utc}"
    assignments.each do |a|
      worker_name = "#{a.worker&.first_name} #{a.worker&.last_name}".strip
      puts "          • #{worker_name} (#{a.status})"
    end
  end
  puts ""
end

# Check assignments
puts "👥 ASSIGNMENTS SUMMARY:"
puts "-" * 80
all_assignments = shifts.flat_map(&:assignments).select { |a| a.worker&.active? }
active_assignments = all_assignments.select { |a| a.status.in?(['confirmed', 'assigned', 'completed']) }
puts "Total active assignments: #{active_assignments.count}"
puts "Total assignments (all statuses): #{all_assignments.count}"
puts ""

# Check what roles have shifts vs what roles are required
puts "🔍 ROLE COVERAGE ANALYSIS:"
puts "-" * 80
required_roles = requirements.map { |r| r.skill_name }.compact.uniq
roles_with_shifts = shifts_by_role.keys
missing_roles = required_roles - roles_with_shifts

puts "Required roles (#{required_roles.count}): #{required_roles.join(', ')}"
puts "Roles with shifts (#{roles_with_shifts.count}): #{roles_with_shifts.join(', ')}"
if missing_roles.any?
  puts "⚠️  Missing roles (no shifts created): #{missing_roles.join(', ')}"
else
  puts "✅ All required roles have shifts"
end
puts ""

# Check API response structure
puts "📡 SIMULATED API RESPONSE CHECK:"
puts "-" * 80
begin
  # Reload event with all associations
  event_reloaded = Event.includes(:event_skill_requirements, shifts: { assignments: :worker }).find(event.id)
  
  # Get requirements
  valid_requirements = event_reloaded.event_skill_requirements.reject { |req| req.skill_name.blank? }
  requirements_hash = valid_requirements.index_by(&:skill_name)
  
  # Get shifts
  all_shifts = event_reloaded.shifts.to_a.sort_by(&:id)
  
  # Simulate grouping
  grouped = {}
  
  # Process existing shifts
  all_shifts.each do |shift|
    role = shift.role_needed
    if grouped[role].nil?
      needed_workers = requirements_hash[role]&.needed_workers || 0
      grouped[role] = {
        role_name: role,
        total_shifts: needed_workers,
        shifts: []
      }
    end
    grouped[role][:shifts] << shift.id
  end
  
  # Add missing roles from requirements
  requirements_hash.each do |skill_name, requirement|
    unless grouped[skill_name]
      grouped[skill_name] = {
        role_name: skill_name,
        total_shifts: requirement.needed_workers || 0,
        shifts: []
      }
    end
  end
  
  puts "Roles that would be returned: #{grouped.length}"
  grouped.each do |role_name, role_data|
    shifts_count = role_data[:shifts]&.length || 0
    total_shifts = role_data[:total_shifts] || 0
    puts "  #{role_name}:"
    puts "    - Total needed: #{total_shifts}"
    puts "    - Shifts in array: #{shifts_count}"
  end
rescue => e
  puts "❌ Error simulating API response: #{e.message}"
  puts e.backtrace.first(5).join("\n")
end

puts ""
puts "=" * 80
puts "VERIFICATION COMPLETE"
puts "=" * 80

