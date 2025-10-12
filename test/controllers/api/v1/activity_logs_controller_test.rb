require "test_helper"

class Api::V1::ActivityLogsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @admin = users(:one)
    sign_in @admin
  end

  test "should get activity logs" do
    get api_v1_activity_logs_url
    assert_response :success
    
    json = JSON.parse(response.body)
    assert_equal 'success', json['status']
    assert json['data']['activity_logs']
    assert json['data']['pagination']
  end

  test "should require authentication" do
    sign_out @admin
    get api_v1_activity_logs_url
    assert_response :unauthorized
  end

  test "should filter by entity type" do
    # Clear existing activity logs to avoid fixture interference
    ActivityLog.delete_all
    
    # Create test activity logs
    ActivityLog.create!(
      actor_user_id: @admin.id,
      entity_type: 'Shift',
      entity_id: 1,
      action: 'created',
      after_json: { 'client_name' => 'Test Client' },
      created_at_utc: Time.current
    )
    
    ActivityLog.create!(
      actor_user_id: @admin.id,
      entity_type: 'Worker',
      entity_id: 1,
      action: 'created',
      after_json: { 'first_name' => 'Test Worker' },
      created_at_utc: Time.current
    )
    
    get api_v1_activity_logs_url, params: { entity_type: 'Shift' }
    assert_response :success
    
    json = JSON.parse(response.body)
    activity_logs = json['data']['activity_logs']
    
    # Should only return Shift logs
    activity_logs.each do |log|
      assert_equal 'Shift', log['entity_type']
    end
  end

  test "should filter by action" do
    # Clear existing activity logs to avoid fixture interference
    ActivityLog.delete_all
    
    # Create test activity logs
    ActivityLog.create!(
      actor_user_id: @admin.id,
      entity_type: 'Shift',
      entity_id: 1,
      action: 'created',
      after_json: { 'client_name' => 'Test Client' },
      created_at_utc: Time.current
    )
    
    ActivityLog.create!(
      actor_user_id: @admin.id,
      entity_type: 'Shift',
      entity_id: 1,
      action: 'updated',
      before_json: { 'client_name' => 'Old Name' },
      after_json: { 'client_name' => 'New Name' },
      created_at_utc: Time.current
    )
    
    get api_v1_activity_logs_url, params: { action: 'created' }
    assert_response :success
    
    json = JSON.parse(response.body)
    activity_logs = json['data']['activity_logs']
    
    # Should only return created actions
    activity_logs.each do |log|
      assert_equal 'created', log['action']
    end
  end

  test "should filter by actor user" do
    # Clear existing activity logs to avoid fixture interference
    ActivityLog.delete_all
    
    other_admin = users(:two)
    
    # Create logs by different users
    ActivityLog.create!(
      actor_user_id: @admin.id,
      entity_type: 'Shift',
      entity_id: 1,
      action: 'created',
      after_json: { 'client_name' => 'Admin 1 Shift' },
      created_at_utc: Time.current
    )
    
    ActivityLog.create!(
      actor_user_id: other_admin.id,
      entity_type: 'Shift',
      entity_id: 2,
      action: 'created',
      after_json: { 'client_name' => 'Admin 2 Shift' },
      created_at_utc: Time.current
    )
    
    get api_v1_activity_logs_url, params: { actor_user_id: @admin.id }
    assert_response :success
    
    json = JSON.parse(response.body)
    activity_logs = json['data']['activity_logs']
    
    # Should only return logs by current admin
    activity_logs.each do |log|
      assert_equal @admin.id, log['actor_user_id']
    end
  end

  test "should paginate results" do
    get api_v1_activity_logs_url, params: { page: 1 }
    assert_response :success
    
    json = JSON.parse(response.body)
    activity_logs = json['data']['activity_logs']
    pagination = json['data']['pagination']
    
    # Verify pagination structure exists
    assert_equal 50, pagination['per_page']
    assert_equal 1, pagination['current_page']
    assert pagination['total_count'] >= 0
    assert pagination['total_pages'] >= 0
  end

  test "should include actor user information" do
    # Clear existing activity logs to avoid fixture interference
    ActivityLog.delete_all
    
    ActivityLog.create!(
      actor_user_id: @admin.id,
      entity_type: 'Shift',
      entity_id: 1,
      action: 'created',
      after_json: { 'client_name' => 'Test Client' },
      created_at_utc: Time.current
    )
    
    get api_v1_activity_logs_url
    assert_response :success
    
    json = JSON.parse(response.body)
    activity_logs = json['data']['activity_logs']
    
    # Should include actor_user information
    activity_logs.each do |log|
      assert log['actor_user']
      assert log['actor_user']['id']
      assert log['actor_user']['email']
    end
  end
end
