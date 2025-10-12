require "test_helper"

class Api::V1::DashboardControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @admin = users(:one)
    sign_in @admin
  end

  test "should get dashboard data" do
    # Create test shifts
    shift1 = Shift.create!(
      client_name: "Test Client",
      role_needed: "Server",
      start_time_utc: 2.hours.from_now,
      end_time_utc: 4.hours.from_now,
      capacity: 2,
      status: "published",
      created_by: @admin
    )

    get api_v1_dashboard_url
    assert_response :success

    json = JSON.parse(response.body)
    assert_equal "success", json["status"]
    assert json["data"]["shift_counts"]
    assert json["data"]["fill_status"]
  end

  test "should require authentication" do
    sign_out @admin
    get api_v1_dashboard_url
    assert_response :unauthorized
  end

  test "should return correct shift counts" do
    # Clear existing shifts to get clean counts
    Shift.delete_all

    # Create shifts with different statuses
    Shift.create!(client_name: "Draft Client", role_needed: "Server",
                  start_time_utc: 1.hour.from_now, end_time_utc: 3.hours.from_now,
                  capacity: 1, status: "draft", created_by: @admin)

    Shift.create!(client_name: "Published Client", role_needed: "Server",
                  start_time_utc: 2.hours.from_now, end_time_utc: 4.hours.from_now,
                  capacity: 1, status: "published", created_by: @admin)

    get api_v1_dashboard_url
    assert_response :success

    json = JSON.parse(response.body)
    shift_counts = json["data"]["shift_counts"]

    assert_equal 1, shift_counts["draft"]
    assert_equal 1, shift_counts["published"]
    assert_equal 0, shift_counts["assigned"]
    assert_equal 0, shift_counts["completed"]
    assert_equal 2, shift_counts["total"]
  end

  test "should calculate fill status correctly" do
    # Clear existing data to get clean counts
    Assignment.delete_all
    Shift.delete_all

    # Create shifts with different fill levels
    unfilled_shift = Shift.create!(
      client_name: "Unfilled Client", role_needed: "Server",
      start_time_utc: 1.hour.from_now, end_time_utc: 3.hours.from_now,
      capacity: 2, status: "published", created_by: @admin
    )

    partial_shift = Shift.create!(
      client_name: "Partial Client", role_needed: "Server",
      start_time_utc: 2.hours.from_now, end_time_utc: 4.hours.from_now,
      capacity: 2, status: "published", created_by: @admin
    )

    # Add one assignment to partial shift
    worker = Worker.create!(first_name: "Test", last_name: "Worker",
                           email: "test@example.com", active: true)
    Assignment.create!(shift: partial_shift, worker: worker,
                      assigned_by: @admin, assigned_at_utc: Time.current,
                      status: "assigned")

    get api_v1_dashboard_url
    assert_response :success

    json = JSON.parse(response.body)
    fill_status = json["data"]["fill_status"]

    assert_equal 1, fill_status["unfilled"]
    assert_equal 1, fill_status["partial"]
    assert_equal 0, fill_status["covered"]
  end
end
