namespace :performance do
  desc "Test API endpoint performance"
  task test: :environment do
    require 'benchmark'
    
    puts "\n" + "="*60
    puts "=== Performance Test Suite ==="
    puts "="*60 + "\n"
    
    # Test 1: Dashboard load
    puts "1. Dashboard Load Test"
    time = Benchmark.realtime do
      Event.published
        .joins(:event_schedule)
        .includes(:event_skill_requirements, shifts: :assignments)
        .where('event_schedules.end_time_utc > ?', Time.current)
        .limit(50)
        .to_a
    end
    status = time < 1 ? '✅' : '❌'
    puts "   Time: #{(time * 1000).round(2)}ms (target: < 1000ms) #{status}"
    
    # Test 2: Events index with eager loading
    puts "\n2. Events Index Load Test"
    time = Benchmark.realtime do
      Event.includes(:venue, :event_skill_requirements, :event_schedule, 
                     shifts: { assignments: :worker })
        .published
        .limit(25)
        .to_a
    end
    status = time < 0.5 ? '✅' : '❌'
    puts "   Time: #{(time * 1000).round(2)}ms (target: < 500ms) #{status}"
    
    # Test 3: Assignment creation
    puts "\n3. Assignment Creation Test"
    shift = Shift.published.first
    worker = Worker.active.first
    
    if shift && worker
      time = Benchmark.realtime do
        result = AssignWorkerToShift.call(shift: shift, worker: worker, assigned_by: User.first)
        # Clean up if successful
        if result[:success] && result[:assignment]
          result[:assignment].destroy
        end
      end
      status = time < 0.5 ? '✅' : '❌'
      puts "   Time: #{(time * 1000).round(2)}ms (target: < 500ms) #{status}"
    else
      puts "   ⚠️  Skipped (no shift or worker available)"
    end
    
    # Test 4: Worker search
    puts "\n4. Worker Search Test"
    time = Benchmark.realtime do
      SearchWorkers.call("server")
    end
    status = time < 0.3 ? '✅' : '❌'
    puts "   Time: #{(time * 1000).round(2)}ms (target: < 300ms) #{status}"
    
    # Test 5: Activity log query
    puts "\n5. Activity Log Query Test"
    time = Benchmark.realtime do
      ActivityLog.includes(:actor_user)
        .order(created_at_utc: :desc)
        .limit(50)
        .to_a
    end
    status = time < 0.2 ? '✅' : '❌'
    puts "   Time: #{(time * 1000).round(2)}ms (target: < 200ms) #{status}"
    
    # Test 6: Assignments index with eager loading
    puts "\n6. Assignments Index Load Test"
    time = Benchmark.realtime do
      Assignment
        .joins(:shift)
        .left_joins(shift: :event)
        .eager_load(:worker, shift: [:event, :location])
        .eager_load(shift: { event: [:venue] })
        .limit(50)
        .to_a
    end
    status = time < 0.3 ? '✅' : '❌'
    puts "   Time: #{(time * 1000).round(2)}ms (target: < 300ms) #{status}"
    
    puts "\n" + "="*60
    puts "=== Test Complete ==="
    puts "="*60 + "\n"
  end
  
  desc "Check for N+1 query patterns"
  task check_n_plus_one: :environment do
    puts "\n" + "="*60
    puts "=== N+1 Query Check ==="
    puts "="*60 + "\n"
    
    # Check common N+1 patterns
    puts "Checking for common N+1 patterns..."
    
    # Pattern 1: Events without eager loading shifts
    puts "\n1. Events without eager loading shifts:"
    events = Event.published.limit(5)
    count_before = ActiveRecord::Base.connection.query_cache.size
    events.each { |e| e.shifts.count }
    count_after = ActiveRecord::Base.connection.query_cache.size
    if count_after > count_before + 5
      puts "   ❌ Potential N+1: #{count_after - count_before} queries for 5 events"
    else
      puts "   ✅ No N+1 detected"
    end
    
    # Pattern 2: Shifts without eager loading assignments
    puts "\n2. Shifts without eager loading assignments:"
    shifts = Shift.limit(5)
    count_before = ActiveRecord::Base.connection.query_cache.size
    shifts.each { |s| s.assignments.count }
    count_after = ActiveRecord::Base.connection.query_cache.size
    if count_after > count_before + 5
      puts "   ❌ Potential N+1: #{count_after - count_before} queries for 5 shifts"
    else
      puts "   ✅ No N+1 detected"
    end
    
    puts "\n" + "="*60 + "\n"
  end
end

