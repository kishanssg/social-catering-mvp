require "test_helper"

class AssignWorkerToShiftTest < ActiveSupport::TestCase
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

  test "assigns worker to shift successfully" do
    result = AssignWorkerToShift.call(@shift, @worker, @user)

    assert result[:success]
    assert result[:data][:assignment].persisted?
    assert_equal @worker, result[:data][:assignment].worker
    assert_equal @shift, result[:data][:assignment].shift
    assert_equal @user, result[:data][:assignment].assigned_by
  end

  test "fails when worker already assigned to shift" do
    # Create existing assignment
    Assignment.create!(
      worker: @worker,
      shift: @shift,
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: "assigned"
    )

    result = AssignWorkerToShift.call(@shift, @worker, @user)

    assert_not result[:success]
    assert_includes result[:error], "overlapping"
  end

  test "fails when shift is at capacity" do
    # Fill up the shift capacity
    @shift.update!(capacity: 1)
    Assignment.create!(
      worker: workers(:two),
      shift: @shift,
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: "assigned"
    )

    result = AssignWorkerToShift.call(@shift, @worker, @user)

    assert_not result[:success]
    assert_includes result[:error], "capacity"
  end

  test "creates activity log on success" do
    assert_difference "ActivityLog.count", 1 do
      AssignWorkerToShift.call(@shift, @worker, @user)
    end
  end
end
