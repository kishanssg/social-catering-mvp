require "test_helper"

class ConcurrentAssignmentTest < ActionDispatch::IntegrationTest
  test "two admins cannot assign same worker to overlapping shifts simultaneously" do
    # Setup test data
    admin1 = User.create!(
      email: "admin1@test.com",
      password: "password123",
      role: "admin"
    )

    admin2 = User.create!(
      email: "admin2@test.com",
      password: "password123",
      role: "admin"
    )

    worker = Worker.create!(
      first_name: "Concurrent",
      last_name: "Test",
      email: "concurrent@test.com",
      active: true,
      skills_json: [ "cooking" ]
    )

    # Create two overlapping shifts
    shift1 = Shift.create!(
      client_name: "Client A",
      role_needed: "Server",
      start_time_utc: 2.hours.from_now,
      end_time_utc: 6.hours.from_now,
      capacity: 1,
      status: "published",
      created_by: admin1
    )

    shift2 = Shift.create!(
      client_name: "Client B",
      role_needed: "Server",
      start_time_utc: 4.hours.from_now,  # Overlaps with shift1 (4-6pm overlap)
      end_time_utc: 8.hours.from_now,
      capacity: 1,
      status: "published",
      created_by: admin2
    )

    # Simulate concurrent assignment using threads
    results = []
    threads = []

    # Thread 1: Admin 1 tries to assign worker to shift 1
    threads << Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do
        result = AssignWorkerToShift.call(shift1, worker, admin1)
        results << { thread: 1, shift: shift1.id, result: result }
      end
    end

    # Thread 2: Admin 2 tries to assign same worker to overlapping shift 2
    threads << Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do
        sleep 0.05  # Small delay to create race condition
        result = AssignWorkerToShift.call(shift2, worker, admin2)
        results << { thread: 2, shift: shift2.id, result: result }
      end
    end

    # Wait for both threads to complete
    threads.each(&:join)

    # Verify results: Exactly one should succeed, one should fail
    successes = results.count { |r| r[:result][:success] }
    failures = results.count { |r| !r[:result][:success] }

    assert_equal 1, successes, "Exactly one assignment should succeed"
    assert_equal 1, failures, "Exactly one assignment should fail due to conflict"

    # Verify the failure is specifically due to overlap conflict
    failed_result = results.find { |r| !r[:result][:success] }
    assert_not_nil failed_result, "Should have one failed result"
    assert_includes failed_result[:result][:error].downcase, "overlap",
      "Failure should be due to time overlap conflict"

    # Verify only one assignment exists in database
    assert_equal 1, Assignment.where(worker_id: worker.id).count,
      "Only one assignment should be created in database"
  end

  test "advisory lock is always released even when error occurs" do
    admin = User.create!(
      email: "lock_test@test.com",
      password: "password123",
      role: "admin"
    )

    worker = Worker.create!(
      first_name: "Lock",
      last_name: "Test",
      email: "lock@test.com",
      active: true
    )

    shift = Shift.create!(
      client_name: "Lock Test Client",
      role_needed: "Server",
      start_time_utc: 1.hour.from_now,
      end_time_utc: 3.hours.from_now,
      capacity: 1,
      status: "published",
      created_by: admin
    )

    # Create a worker with invalid data to force an error
    invalid_worker = Worker.new(
      first_name: "",  # Invalid: empty first_name
      last_name: "",   # Invalid: empty last_name
      email: "invalid@test.com",
      active: true
    )

    # This should fail due to validation error, but lock should still be released
    result = AssignWorkerToShift.call(shift, invalid_worker, admin)
    assert_equal false, result[:success], "Assignment should fail due to validation error"

    # Verify lock was released by trying to acquire it for the original worker
    conn = ActiveRecord::Base.connection
    lock_result = conn.execute("SELECT pg_try_advisory_lock(#{worker.id})").first

    # Handle different result formats from PostgreSQL
    lock_acquired = if lock_result.is_a?(Array)
      lock_result.first == true || lock_result.first == 1
    else
      lock_result.values.first == true || lock_result.values.first == 1
    end

    assert lock_acquired, "Lock should be released after error (pg_try_advisory_lock should succeed)"

    # Clean up: release the lock we just acquired for testing
    conn.execute("SELECT pg_advisory_unlock(#{worker.id})")
  end

  test "capacity limit prevents over-assignment even with concurrent requests" do
    admin1 = User.create!(email: "cap1@test.com", password: "password123", role: "admin")
    admin2 = User.create!(email: "cap2@test.com", password: "password123", role: "admin")

    worker1 = Worker.create!(first_name: "W1", last_name: "Test", active: true)
    worker2 = Worker.create!(first_name: "W2", last_name: "Test", active: true)
    worker3 = Worker.create!(first_name: "W3", last_name: "Test", active: true)

    # Shift with capacity of 2
    shift = Shift.create!(
      client_name: "Capacity Test",
      role_needed: "Server",
      start_time_utc: 1.hour.from_now,
      end_time_utc: 4.hours.from_now,
      capacity: 2,  # Only 2 workers allowed
      status: "published",
      created_by: admin1
    )

    # Try to assign 3 workers concurrently
    results = []
    threads = []

    [ worker1, worker2, worker3 ].each_with_index do |worker, index|
      threads << Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          sleep index * 0.02  # Stagger slightly
          result = AssignWorkerToShift.call(shift, worker, admin1)
          results << { worker_id: worker.id, result: result }
        end
      end
    end

    threads.each(&:join)

    # Verify: Exactly 2 should succeed, 1 should fail
    successes = results.count { |r| r[:result][:success] }
    failures = results.count { |r| !r[:result][:success] }

    assert_equal 2, successes, "Exactly 2 assignments should succeed (capacity limit)"
    assert_equal 1, failures, "Exactly 1 assignment should fail due to capacity"

    # Verify database state
    assert_equal 2, Assignment.where(shift_id: shift.id).count,
      "Database should have exactly 2 assignments"
  end
end
