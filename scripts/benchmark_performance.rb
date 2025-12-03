# frozen_string_literal: true

# Performance benchmarking script
# Run: rails runner scripts/benchmark_performance.rb

require 'benchmark'

puts "🔍 PERFORMANCE BENCHMARK"
puts "=" * 70
puts "Environment: #{Rails.env}"
puts "Time: #{Time.current}"
puts "=" * 70

# Test 1: Dashboard Query - Upcoming Events
puts "\n📊 Test 1: Dashboard - Upcoming Events Query"
puts "-" * 70

times = []
5.times do |i|
  time = Benchmark.realtime do
    Event.where(status: 'published')
      .joins(:event_schedules)
      .where('event_schedules.end_time_utc >= ?', Time.current)
      .includes(:venue, :event_schedules, shifts: { assignments: :worker })
      .order('event_schedules.start_time_utc ASC')
      .limit(20)
      .to_a
  end
  times << time
  puts "  Run #{i+1}: #{(time * 1000).round(2)}ms"
end

avg = (times.sum / times.size * 1000).round(2)
puts "  Average: #{avg}ms"
puts avg < 500 ? "  ✅ GOOD" : "  ⚠️ SLOW (target: <500ms)"

# Test 2: Completed Events Query
puts "\n📊 Test 2: Dashboard - Completed Events Query"
puts "-" * 70

times = []
5.times do |i|
  time = Benchmark.realtime do
    Event.where(status: 'completed')
      .includes(:venue, :event_schedules, shifts: { assignments: :worker })
      .order(completed_at_utc: :desc)
      .limit(20)
      .to_a
  end
  times << time
  puts "  Run #{i+1}: #{(time * 1000).round(2)}ms"
end

avg = (times.sum / times.size * 1000).round(2)
puts "  Average: #{avg}ms"
puts avg < 500 ? "  ✅ GOOD" : "  ⚠️ SLOW (target: <500ms)"

# Test 3: Available Workers Query
puts "\n📊 Test 3: Available Workers for Assignment"
puts "-" * 70

shift = Shift.joins(:event).where('events.status = ?', 'published').first

if shift
  times = []
  5.times do |i|
    time = Benchmark.realtime do
      Worker.where(active: true)
        .includes(:skills, :worker_certifications)
        .order(:last_name, :first_name)
        .to_a
    end
    times << time
    puts "  Run #{i+1}: #{(time * 1000).round(2)}ms"
  end

  avg = (times.sum / times.size * 1000).round(2)
  puts "  Average: #{avg}ms"
  puts avg < 200 ? "  ✅ GOOD" : "  ⚠️ SLOW (target: <200ms)"
else
  puts "  ⚠️ No active shift found to test"
end

# Test 4: Conflict Check
puts "\n📊 Test 4: Conflict Detection"
puts "-" * 70

if shift
  worker = Worker.where(active: true).first

  if worker
    times = []
    5.times do |i|
      time = Benchmark.realtime do
        # Simulate conflict check
        CheckConflicts.call(worker: worker, shift: shift)
      end
      times << time
      puts "  Run #{i+1}: #{(time * 1000).round(2)}ms"
    end

    avg = (times.sum / times.size * 1000).round(2)
    puts "  Average: #{avg}ms"
    puts avg < 100 ? "  ✅ GOOD" : "  ⚠️ SLOW (target: <100ms)"
  else
    puts "  ⚠️ No active worker found to test"
  end
else
  puts "  ⚠️ No shift found to test"
end

# Test 5: Create Assignment
puts "\n📊 Test 5: Create Assignment (with callbacks)"
puts "-" * 70

if shift && worker
  times = []
  3.times do |i|
    # Create and immediately destroy to test creation speed
    # Skip if assignment already exists
    existing = Assignment.where(shift: shift, worker: worker).first
    if existing
      puts "  ⚠️ Assignment already exists, skipping test"
      break
    end

    time = Benchmark.realtime do
      assignment = Assignment.create!(
        shift: shift,
        worker: worker,
        status: 'assigned',
        assigned_by: User.first,
        assigned_at_utc: Time.current
      )
      assignment.destroy
    end
    times << time
    puts "  Run #{i+1}: #{(time * 1000).round(2)}ms"
  end

  if times.any?
    avg = (times.sum / times.size * 1000).round(2)
    puts "  Average: #{avg}ms"
    puts avg < 500 ? "  ✅ GOOD" : "  ⚠️ SLOW (target: <500ms)"
  end
else
  puts "  ⚠️ No shift/worker found to test"
end

# Database Stats
puts "\n📊 Database Statistics"
puts "-" * 70
puts "Events: #{Event.count}"
puts "Workers: #{Worker.count}"
puts "Shifts: #{Shift.count}"
puts "Assignments: #{Assignment.count}"
puts "Active Events: #{Event.where(status: 'published').count}"
puts "Completed Events: #{Event.where(status: 'completed').count}"

puts "\n" + "=" * 70
puts "✅ Benchmark Complete"
puts "Check log/slow_requests.log for slow request patterns"
puts "=" * 70
