require "test_helper"

class CreateShiftTest < ActiveSupport::TestCase
  def setup
    @user = users(:one)
    @shift_params = {
      client_name: "Test Client",
      role_needed: "Server",
      start_time_utc: 1.day.from_now,
      end_time_utc: 1.day.from_now + 4.hours,
      capacity: 2
    }
  end

  test "creates shift successfully" do
    result = CreateShift.call(shift_params: @shift_params, created_by: @user)
    
    assert result[:success]
    assert result[:data][:shift].persisted?
    assert_equal "Test Client", result[:data][:shift].client_name
    assert_equal @user, result[:data][:shift].created_by
  end

  test "fails with invalid parameters" do
    invalid_params = @shift_params.merge(client_name: nil)
    result = CreateShift.call(shift_params: invalid_params, created_by: @user)
    
    assert_not result[:success]
    assert_includes result[:error], "Client name can't be blank"
  end

  test "creates activity log on success" do
    assert_difference "ActivityLog.count", 1 do
      CreateShift.call(shift_params: @shift_params, created_by: @user)
    end
  end
end
