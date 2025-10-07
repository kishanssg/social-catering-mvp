require "test_helper"

class Api::V1::ShiftsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  
  def setup
    @user = users(:one)
    @shift = shifts(:one)
  end

  test "should get index" do
    sign_in @user
    get "/api/v1/shifts"
    assert_response :success
    
    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["shifts"].is_a?(Array)
  end

  test "should filter shifts by status" do
    sign_in @user
    get "/api/v1/shifts?status=draft"
    assert_response :success
    
    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["shifts"].is_a?(Array)
  end

  test "should filter shifts by timeframe" do
    sign_in @user
    get "/api/v1/shifts?timeframe=upcoming"
    assert_response :success
    
    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["shifts"].is_a?(Array)
  end

  test "should show shift with assignments" do
    sign_in @user
    get "/api/v1/shifts/#{@shift.id}"
    assert_response :success
    
    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["shift"]["id"] == @shift.id
    assert json_response["data"]["shift"]["client_name"] == @shift.client_name
    assert json_response["data"]["shift"].key?("assigned_count")
    assert json_response["data"]["shift"].key?("available_slots")
  end

  test "should create shift" do
    sign_in @user
    shift_params = {
      shift: {
        client_name: "Test Client",
        role_needed: "Server",
        start_time_utc: 1.day.from_now,
        end_time_utc: 1.day.from_now + 4.hours,
        capacity: 2,
        status: "draft"
      }
    }
    
    assert_difference "Shift.count", 1 do
      post "/api/v1/shifts", params: shift_params, as: :json
    end
    
    assert_response :created
    
    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["shift"]["client_name"] == "Test Client"
  end

  test "should update shift" do
    sign_in @user
    shift_params = {
      shift: {
        client_name: "Updated Client"
      }
    }
    
    patch "/api/v1/shifts/#{@shift.id}", params: shift_params, as: :json
    assert_response :success
    
    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["shift"]["client_name"] == "Updated Client"
  end

  test "should delete shift without assignments" do
    sign_in @user
    # Create a shift without assignments
    empty_shift = Shift.create!(
      client_name: "Empty Shift",
      role_needed: "Server",
      start_time_utc: 1.day.from_now,
      end_time_utc: 1.day.from_now + 4.hours,
      capacity: 1,
      created_by: @user
    )
    
    assert_difference "Shift.count", -1 do
      delete "/api/v1/shifts/#{empty_shift.id}"
    end
    
    assert_response :success
    
    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert_includes json_response["data"]["message"], "deleted successfully"
  end

  test "should not delete shift with assignments" do
    sign_in @user
    # Create a shift with assignments
    shift_with_assignments = Shift.create!(
      client_name: "Shift with Assignments",
      role_needed: "Server",
      start_time_utc: 1.day.from_now,
      end_time_utc: 1.day.from_now + 4.hours,
      capacity: 1,
      created_by: @user
    )
    
    # Create an assignment
    Assignment.create!(
      shift: shift_with_assignments,
      worker: workers(:one),
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
    
    assert_no_difference "Shift.count" do
      delete "/api/v1/shifts/#{shift_with_assignments.id}"
    end
    
    assert_response :unprocessable_entity
    
    json_response = JSON.parse(response.body)
    assert_equal "error", json_response["status"]
    assert_includes json_response["error"], "Cannot delete shift with assignments"
  end

  test "should return validation errors on invalid create" do
    sign_in @user
    shift_params = {
      shift: {
        client_name: "",  # Invalid - required field
        role_needed: "Server"
      }
    }
    
    post "/api/v1/shifts", params: shift_params, as: :json
    assert_response :unprocessable_entity
    
    json_response = JSON.parse(response.body)
    assert_equal "validation_error", json_response["status"]
    assert json_response["errors"].present?
  end

  test "should return validation errors on invalid update" do
    sign_in @user
    shift_params = {
      shift: {
        client_name: "",  # Invalid - required field
        role_needed: "Server"
      }
    }
    
    patch "/api/v1/shifts/#{@shift.id}", params: shift_params, as: :json
    assert_response :unprocessable_entity
    
    json_response = JSON.parse(response.body)
    assert_equal "validation_error", json_response["status"]
    assert json_response["errors"].present?
  end

  test "should require authentication" do
    get "/api/v1/shifts"
    assert_response :unauthorized
  end
end