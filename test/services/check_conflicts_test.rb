require "test_helper"

class CheckConflictsTest < ActiveSupport::TestCase
  def setup
    @worker = workers(:two)
    @shift = shifts(:one)
  end

  test "passes when no conflicts exist" do
    result = CheckConflicts.call(worker: @worker, shift: @shift)

    assert result[:success]
    assert_empty result[:data][:conflicts]
  end

  test "detects time overlap conflict" do
    # Create overlapping shift
    overlapping_shift = Shift.create!(
      client_name: "Overlapping Client",
      role_needed: "Server",
      start_time_utc: @shift.start_time_utc + 1.hour,
      end_time_utc: @shift.end_time_utc + 1.hour,
      capacity: 1,
      created_by: users(:one)
    )

    # Assign worker to overlapping shift
    Assignment.create!(
      worker: @worker,
      shift: overlapping_shift,
      assigned_by: users(:one),
      assigned_at_utc: Time.current,
      status: "assigned"
    )

    result = CheckConflicts.call(worker: @worker, shift: @shift)

    assert_not result[:success]
    assert_includes result[:error], "overlapping"
  end

  test "detects capacity conflict" do
    @shift.update!(capacity: 1)

    # Fill up the shift
    Assignment.create!(
      worker: workers(:two),
      shift: @shift,
      assigned_by: users(:one),
      assigned_at_utc: Time.current,
      status: "assigned"
    )

    result = CheckConflicts.call(worker: @worker, shift: @shift)

    assert_not result[:success]
    assert_includes result[:error], "capacity"
  end

  test "detects certification expiration conflict" do
    # Create a future shift
    future_shift = Shift.create!(
      client_name: "Future Client",
      role_needed: "Server",
      start_time_utc: 1.day.from_now,
      end_time_utc: 1.day.from_now + 4.hours,
      capacity: 1,
      created_by: users(:one)
    )

    # Create certification requirement
    cert = certifications(:one)
    future_shift.update!(required_cert_id: cert.id)

    # Create expired certification
    WorkerCertification.create!(
      worker: @worker,
      certification: cert,
      expires_at_utc: future_shift.end_time_utc - 1.hour
    )

    result = CheckConflicts.call(worker: @worker, shift: future_shift)

    assert_not result[:success]
    assert_includes result[:error], "certification"
  end
end
