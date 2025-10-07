require "test_helper"

class SearchWorkersAvailabilityTest < ActiveSupport::TestCase
  def setup
    @admin = users(:one)
    
    # Create test workers
    @worker1 = Worker.create!(
      first_name: "Available",
      last_name: "Worker",
      email: "available@test.com",
      active: true,
      skills_json: ["cooking"]
    )
    @worker1.save! # Trigger tsvector sync
    
    @worker2 = Worker.create!(
      first_name: "Busy",
      last_name: "Worker", 
      email: "busy@test.com",
      active: true,
      skills_json: ["serving"]
    )
    @worker2.save! # Trigger tsvector sync
    
    # Create test shifts
    @shift1 = Shift.create!(
      client_name: "Test Client 1",
      role_needed: "Server",
      start_time_utc: 2.hours.from_now,
      end_time_utc: 4.hours.from_now,
      capacity: 1,
      status: 'published',
      created_by: @admin
    )
    
    @shift2 = Shift.create!(
      client_name: "Test Client 2", 
      role_needed: "Server",
      start_time_utc: 3.hours.from_now,  # Overlaps with shift1
      end_time_utc: 5.hours.from_now,
      capacity: 1,
      status: 'published',
      created_by: @admin
    )
    
    # Assign worker2 to shift1 (making them unavailable for shift2)
    Assignment.create!(
      shift: @shift1,
      worker: @worker2,
      assigned_by: @admin,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
  end

  test "should exclude workers with overlapping assignments" do
    result = SearchWorkers.call("", { available_for_shift_id: @shift2.id })
    
    assert result[:success]
    workers = result[:data][:workers]
    worker_ids = workers.pluck(:id)
    
    # worker1 should be available (not assigned to anything)
    assert_includes worker_ids, @worker1.id
    
    # worker2 should be excluded (assigned to overlapping shift1)
    assert_not_includes worker_ids, @worker2.id
  end

  test "should return all workers when no availability filter" do
    result = SearchWorkers.call("", {})
    
    assert result[:success]
    workers = result[:data][:workers]
    worker_ids = workers.pluck(:id)
    
    # Both workers should be returned
    assert_includes worker_ids, @worker1.id
    assert_includes worker_ids, @worker2.id
  end

  test "should combine availability filter with certification filter" do
    # Create certification
    cert = Certification.create!(name: "Food Safety Test")
    
    # Give worker1 the certification
    WorkerCertification.create!(
      worker: @worker1,
      certification: cert,
      expires_at_utc: 1.year.from_now
    )
    
    # Give worker2 the certification (but they're busy)
    WorkerCertification.create!(
      worker: @worker2,
      certification: cert,
      expires_at_utc: 1.year.from_now
    )
    
    result = SearchWorkers.call("", { 
      available_for_shift_id: @shift2.id,
      certification_id: cert.id
    })
    
    assert result[:success]
    workers = result[:data][:workers]
    worker_ids = workers.pluck(:id)
    
    # Only worker1 should be returned (available AND certified)
    assert_includes worker_ids, @worker1.id
    assert_not_includes worker_ids, @worker2.id
  end

  test "should handle non-overlapping shifts correctly" do
    # Create non-overlapping shift
    non_overlapping_shift = Shift.create!(
      client_name: "Non-overlapping Client",
      role_needed: "Server", 
      start_time_utc: 6.hours.from_now,  # No overlap with shift1
      end_time_utc: 8.hours.from_now,
      capacity: 1,
      status: 'published',
      created_by: @admin
    )
    
    result = SearchWorkers.call("", { available_for_shift_id: non_overlapping_shift.id })
    
    assert result[:success]
    workers = result[:data][:workers]
    worker_ids = workers.pluck(:id)
    
    # Both workers should be available for non-overlapping shift
    assert_includes worker_ids, @worker1.id
    assert_includes worker_ids, @worker2.id
  end

  test "should handle invalid shift ID gracefully" do
    # Should raise ActiveRecord::RecordNotFound
    assert_raises(ActiveRecord::RecordNotFound) do
      SearchWorkers.call("", { available_for_shift_id: 99999 })
    end
  end
end
