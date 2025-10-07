require "test_helper"

class Api::V1::AssignmentsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  
  def setup
    @user = users(:one)
    @worker = workers(:one)
    @shift = shifts(:one)
    @assignment = assignments(:one)
  end

  test "should create assignment" do
    sign_in @user
    
    # Create a new shift and worker for testing
    new_shift = Shift.create!(
      client_name: "Test Shift",
      role_needed: "Server",
      start_time_utc: 1.day.from_now,
      end_time_utc: 1.day.from_now + 4.hours,
      capacity: 2,
      created_by: @user
    )
    
    new_worker = Worker.create!(
      first_name: "Test",
      last_name: "Worker",
      email: "test-worker@example.com",
      active: true
    )
    
    assignment_params = {
      shift_id: new_shift.id,
      worker_id: new_worker.id
    }
    
    assert_difference "Assignment.count", 1 do
      post "/api/v1/assignments", params: assignment_params, as: :json
    end
    
    assert_response :created
    
    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["assignment"].present?
  end

  test "should not create duplicate assignment" do
    sign_in @user
    
    # Try to assign the same worker to the same shift again
    assignment_params = {
      shift_id: @shift.id,
      worker_id: @worker.id
    }
    
    assert_no_difference "Assignment.count" do
      post "/api/v1/assignments", params: assignment_params, as: :json
    end
    
    assert_response :conflict
    
    json_response = JSON.parse(response.body)
    assert_equal "error", json_response["status"]
    assert_includes json_response["error"], "overlapping"
  end

  test "should not create assignment when shift is at capacity" do
    sign_in @user
    
    # Create a shift with capacity 1
    small_shift = Shift.create!(
      client_name: "Small Shift",
      role_needed: "Server",
      start_time_utc: 2.days.from_now,
      end_time_utc: 2.days.from_now + 4.hours,
      capacity: 1,
      created_by: @user
    )
    
    # Fill up the shift
    Assignment.create!(
      shift: small_shift,
      worker: @worker,
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
    
    # Try to assign another worker
    new_worker = Worker.create!(
      first_name: "Another",
      last_name: "Worker",
      email: "another@example.com",
      active: true
    )
    
    assignment_params = {
      shift_id: small_shift.id,
      worker_id: new_worker.id
    }
    
    assert_no_difference "Assignment.count" do
      post "/api/v1/assignments", params: assignment_params, as: :json
    end
    
    assert_response :conflict
    
    json_response = JSON.parse(response.body)
    assert_equal "error", json_response["status"]
    assert_includes json_response["error"], "capacity"
  end

  test "should destroy assignment" do
    sign_in @user
    
    # Create a new shift and worker for testing
    new_shift = Shift.create!(
      client_name: "Test Shift for Destroy",
      role_needed: "Server",
      start_time_utc: 3.days.from_now,
      end_time_utc: 3.days.from_now + 4.hours,
      capacity: 2,
      created_by: @user
    )
    
    new_worker = Worker.create!(
      first_name: "Test",
      last_name: "Worker for Destroy",
      email: "test-destroy@example.com",
      active: true
    )
    
    # Create a new assignment for testing
    new_assignment = Assignment.create!(
      shift: new_shift,
      worker: new_worker,
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
    
    assert_difference "Assignment.count", -1 do
      delete "/api/v1/assignments/#{new_assignment.id}"
    end
    
    assert_response :success
    
    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert_includes json_response["data"]["message"], "unassigned"
  end

  test "should not destroy assignment that is not assigned" do
    sign_in @user
    
    # Create a new shift and worker for testing
    new_shift = Shift.create!(
      client_name: "Test Shift for Completed",
      role_needed: "Server",
      start_time_utc: 4.days.from_now,
      end_time_utc: 4.days.from_now + 4.hours,
      capacity: 2,
      created_by: @user
    )
    
    new_worker = Worker.create!(
      first_name: "Test",
      last_name: "Worker for Completed",
      email: "test-completed@example.com",
      active: true
    )
    
    # Create a completed assignment
    completed_assignment = Assignment.create!(
      shift: new_shift,
      worker: new_worker,
      assigned_by: @user,
      assigned_at_utc: Time.current,
      status: 'completed'
    )
    
    assert_no_difference "Assignment.count" do
      delete "/api/v1/assignments/#{completed_assignment.id}"
    end
    
    assert_response :unprocessable_entity
    
    json_response = JSON.parse(response.body)
    assert_equal "error", json_response["status"]
    assert_includes json_response["error"], "not in assigned status"
  end

  test "should require authentication for create" do
    assignment_params = {
      shift_id: @shift.id,
      worker_id: @worker.id
    }
    
    post "/api/v1/assignments", params: assignment_params, as: :json
    assert_response :unauthorized
  end

  test "should require authentication for destroy" do
    delete "/api/v1/assignments/#{@assignment.id}"
    assert_response :redirect
  end

  test "should return 404 for non-existent assignment" do
    sign_in @user
    
    delete "/api/v1/assignments/999999"
    assert_response :not_found
  end

  test "should return 404 for non-existent shift" do
    sign_in @user
    
    assignment_params = {
      shift_id: 999999,
      worker_id: @worker.id
    }
    
    post "/api/v1/assignments", params: assignment_params, as: :json
    assert_response :not_found
  end

  test "should return 404 for non-existent worker" do
    sign_in @user
    
    assignment_params = {
      shift_id: @shift.id,
      worker_id: 999999
    }
    
    post "/api/v1/assignments", params: assignment_params, as: :json
    assert_response :not_found
  end
end
