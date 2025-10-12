require "test_helper"

class Api::V1::ActivityLoggingTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  def setup
    @user = users(:one)
  end

  test "should create activity log when creating worker via API" do
    sign_in @user

    initial_count = ActivityLog.count

    worker_params = {
      worker: {
        first_name: "Test",
        last_name: "Worker",
        email: "test-activity@example.com",
        skills_json: [ "cooking" ]
      }
    }

    post "/api/v1/workers", params: worker_params, as: :json
    assert_response :created

    # Check that activity log was created
    assert_equal initial_count + 1, ActivityLog.count

    # Check the activity log details
    activity_log = ActivityLog.last
    assert_equal @user.id, activity_log.actor_user_id
    assert_equal "Worker", activity_log.entity_type
    assert_equal "created", activity_log.action
    assert activity_log.after_json.present?
  end

  test "should create activity log when updating worker via API" do
    sign_in @user

    # Create a worker first
    worker = Worker.create!(
      first_name: "Original",
      last_name: "Name",
      email: "original@example.com",
      active: true
    )

    initial_count = ActivityLog.count

    worker_params = {
      worker: {
        first_name: "Updated"
      }
    }

    patch "/api/v1/workers/#{worker.id}", params: worker_params, as: :json
    assert_response :success

    # Check that activity log was created
    assert_equal initial_count + 1, ActivityLog.count

    # Check the activity log details
    activity_log = ActivityLog.last
    assert_equal @user.id, activity_log.actor_user_id
    assert_equal "Worker", activity_log.entity_type
    assert_equal "updated", activity_log.action
    assert activity_log.before_json.present?
    assert activity_log.after_json.present?
  end

  test "should create activity log when creating shift via API" do
    sign_in @user

    initial_count = ActivityLog.count

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

    post "/api/v1/shifts", params: shift_params, as: :json
    assert_response :created

    # Check that activity log was created
    assert_equal initial_count + 1, ActivityLog.count

    # Check the activity log details
    activity_log = ActivityLog.last
    assert_equal @user.id, activity_log.actor_user_id
    assert_equal "Shift", activity_log.entity_type
    assert_equal "created", activity_log.action
    assert activity_log.after_json.present?
  end

  test "should create activity log when updating shift via API" do
    sign_in @user

    # Create a shift first
    shift = Shift.create!(
      client_name: "Original Client",
      role_needed: "Server",
      start_time_utc: 1.day.from_now,
      end_time_utc: 1.day.from_now + 4.hours,
      capacity: 2,
      created_by: @user
    )

    initial_count = ActivityLog.count

    shift_params = {
      shift: {
        client_name: "Updated Client"
      }
    }

    patch "/api/v1/shifts/#{shift.id}", params: shift_params, as: :json
    assert_response :success

    # Check that activity log was created
    assert_equal initial_count + 1, ActivityLog.count

    # Check the activity log details
    activity_log = ActivityLog.last
    assert_equal @user.id, activity_log.actor_user_id
    assert_equal "Shift", activity_log.entity_type
    assert_equal "updated", activity_log.action
    assert activity_log.before_json.present?
    assert activity_log.after_json.present?
  end

  test "should create activity log when creating assignment via API" do
    sign_in @user

    # Create a shift and worker for testing
    shift = Shift.create!(
      client_name: "Test Shift for Assignment",
      role_needed: "Server",
      start_time_utc: 1.day.from_now,
      end_time_utc: 1.day.from_now + 4.hours,
      capacity: 2,
      created_by: @user
    )

    worker = Worker.create!(
      first_name: "Test",
      last_name: "Worker for Assignment",
      email: "test-assignment@example.com",
      active: true
    )

    initial_count = ActivityLog.count

    assignment_params = {
      shift_id: shift.id,
      worker_id: worker.id
    }

    post "/api/v1/assignments", params: assignment_params, as: :json
    assert_response :created

    # Check that activity log was created (via service object)
    assert_equal initial_count + 1, ActivityLog.count

    # Check the activity log details
    activity_log = ActivityLog.last
    assert_equal @user.id, activity_log.actor_user_id
    assert_equal "Assignment", activity_log.entity_type
    assert_equal "created", activity_log.action
    assert activity_log.after_json.present?
  end

  test "should not create activity log when no user context" do
    # Test direct model creation without user context
    initial_count = ActivityLog.count

    Worker.create!(
      first_name: "No Context",
      last_name: "Worker",
      email: "no-context@example.com",
      active: true
    )

    # Should not create activity log without user context
    assert_equal initial_count, ActivityLog.count
  end
end
