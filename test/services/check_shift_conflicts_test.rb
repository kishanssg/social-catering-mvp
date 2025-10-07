require "test_helper"

class CheckShiftConflictsTest < ActiveSupport::TestCase
  def setup
    @user = users(:one)
    @worker = Worker.create!(
      first_name: "Test",
      last_name: "Worker",
      email: "test@example.com",
      active: true
    )
    @shift = Shift.create!(
      client_name: "Test Client",
      role_needed: "Server",
      start_time_utc: 1.day.from_now,
      end_time_utc: 1.day.from_now + 4.hours,
      capacity: 2,
      created_by: @user
    )
  end

  test "returns empty array when no conflicts exist" do
    result = CheckShiftConflicts.call(@shift, @worker)
    
    assert_equal [], result
  end

  test "detects time overlap conflict" do
    # Create overlapping shift
    overlapping_shift = Shift.create!(
      client_name: "Overlapping Client",
      role_needed: "Server",
      start_time_utc: @shift.start_time_utc + 1.hour,
      end_time_utc: @shift.end_time_utc + 1.hour,
      capacity: 1,
      created_by: @user
    )
    
    # Assign worker to overlapping shift
    Assignment.create!(
      worker: @worker,
      shift: overlapping_shift,
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
    
    result = CheckShiftConflicts.call(@shift, @worker)
    
    assert_equal 1, result.length
    assert_equal 'time_overlap', result.first[:type]
    assert_includes result.first[:message], 'overlapping shift'
    assert_equal overlapping_shift.id, result.first[:shift_id]
  end

  test "detects capacity conflict" do
    @shift.update!(capacity: 1)
    
    # Fill up the shift
    Assignment.create!(
      worker: workers(:one),
      shift: @shift,
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
    
    result = CheckShiftConflicts.call(@shift, @worker)
    
    assert_equal 1, result.length
    assert_equal 'capacity_exceeded', result.first[:type]
    assert_includes result.first[:message], 'full capacity'
    assert_equal 1, result.first[:current_count]
  end

  test "detects certification expiration conflict" do
    # Create certification requirement
    cert = certifications(:one)
    @shift.update!(required_cert_id: cert.id)
    
    # Create expired certification
    WorkerCertification.create!(
      worker: @worker,
      certification: cert,
      expires_at_utc: @shift.end_time_utc - 1.hour
    )
    
    result = CheckShiftConflicts.call(@shift, @worker)
    
    assert_equal 1, result.length
    assert_equal 'certification_expired', result.first[:type]
    assert_includes result.first[:message], 'certification expires'
    assert_equal cert.id, result.first[:required_cert_id]
  end

  test "detects multiple conflicts" do
    # Create overlapping shift
    overlapping_shift = Shift.create!(
      client_name: "Overlapping Client",
      role_needed: "Server",
      start_time_utc: @shift.start_time_utc + 1.hour,
      end_time_utc: @shift.end_time_utc + 1.hour,
      capacity: 1,
      created_by: @user
    )
    
    # Assign worker to overlapping shift
    Assignment.create!(
      worker: @worker,
      shift: overlapping_shift,
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
    
    # Set capacity to 1 and fill it
    @shift.update!(capacity: 1)
    Assignment.create!(
      worker: workers(:one),
      shift: @shift,
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
    
    result = CheckShiftConflicts.call(@shift, @worker)
    
    assert_equal 2, result.length
    conflict_types = result.map { |c| c[:type] }
    assert_includes conflict_types, 'time_overlap'
    assert_includes conflict_types, 'capacity_exceeded'
  end
end
