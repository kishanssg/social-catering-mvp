require "test_helper"

class Api::V1::ShiftsControllerFiltersTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @admin = users(:one)
    sign_in @admin
    
    # Clear existing shifts to get clean test data
    Assignment.delete_all
    Shift.delete_all
    
    # Create test shifts with different statuses and times
    @past_shift = Shift.create!(
      client_name: "Past Client",
      role_needed: "Server",
      start_time_utc: 2.days.ago,
      end_time_utc: 1.day.ago,
      capacity: 2,
      status: 'completed',
      created_by: @admin
    )
    
    @today_shift = Shift.create!(
      client_name: "Today Client",
      role_needed: "Server",
      start_time_utc: Time.current.beginning_of_day + 1.hour,
      end_time_utc: Time.current.beginning_of_day + 5.hours,
      capacity: 2,
      status: 'published',
      created_by: @admin
    )
    
    @upcoming_shift = Shift.create!(
      client_name: "Upcoming Client",
      role_needed: "Server",
      start_time_utc: 2.days.from_now,
      end_time_utc: 4.days.from_now,
      capacity: 1,
      status: 'published',
      created_by: @admin
    )
    
    @draft_shift = Shift.create!(
      client_name: "Draft Client",
      role_needed: "Server",
      start_time_utc: 1.day.from_now,
      end_time_utc: 2.days.from_now,
      capacity: 3,
      status: 'draft',
      created_by: @admin
    )
    
    # Create workers for assignments
    @worker1 = Worker.create!(
      first_name: "Worker",
      last_name: "One",
      email: "worker1@test.com",
      active: true
    )
    
    @worker2 = Worker.create!(
      first_name: "Worker",
      last_name: "Two", 
      email: "worker2@test.com",
      active: true
    )
    
    # Create assignments for fill status testing
    # Partial fill (1 of 2)
    Assignment.create!(
      shift: @today_shift,
      worker: @worker1,
      assigned_by: @admin,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
    
    # Full fill (2 of 2)
    Assignment.create!(
      shift: @upcoming_shift,
      worker: @worker1,
      assigned_by: @admin,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
    Assignment.create!(
      shift: @upcoming_shift,
      worker: @worker2,
      assigned_by: @admin,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
  end

  test "should filter by status" do
    get api_v1_shifts_url, params: { status: 'published' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should only return published shifts
    assert shifts.all? { |s| s['status'] == 'published' }
    assert_equal 2, shifts.length  # today_shift and upcoming_shift
  end

  test "should filter by timeframe past" do
    get api_v1_shifts_url, params: { timeframe: 'past' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should only return past shifts (including fixture data)
    past_shifts = shifts.select { |s| Time.parse(s['start_time_utc']) < Time.current }
    assert past_shifts.length >= 1
    assert past_shifts.any? { |s| s['id'] == @past_shift.id }
  end

  test "should filter by timeframe today" do
    get api_v1_shifts_url, params: { timeframe: 'today' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should only return today's shifts
    assert_equal 1, shifts.length
    assert_equal @today_shift.id, shifts.first['id']
  end

  test "should filter by timeframe upcoming" do
    get api_v1_shifts_url, params: { timeframe: 'upcoming' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should only return upcoming shifts
    assert shifts.length >= 2  # at least upcoming_shift and draft_shift
    shift_ids = shifts.map { |s| s['id'] }
    assert_includes shift_ids, @upcoming_shift.id
    assert_includes shift_ids, @draft_shift.id
  end

  test "should filter by fill_status unfilled" do
    get api_v1_shifts_url, params: { fill_status: 'unfilled' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should only return unfilled shifts
    assert_equal 2, shifts.length  # past_shift and draft_shift
    shift_ids = shifts.map { |s| s['id'] }
    assert_includes shift_ids, @past_shift.id
    assert_includes shift_ids, @draft_shift.id
  end

  test "should filter by fill_status partial" do
    get api_v1_shifts_url, params: { fill_status: 'partial' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should only return partially filled shifts
    assert_equal 1, shifts.length
    assert_equal @today_shift.id, shifts.first['id']
    assert_equal 1, shifts.first['assigned_count']  # 1 of 2 capacity
  end

  test "should filter by fill_status covered" do
    get api_v1_shifts_url, params: { fill_status: 'covered' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should only return fully covered shifts
    assert_equal 1, shifts.length
    assert_equal @upcoming_shift.id, shifts.first['id']
    assert_equal 2, shifts.first['assigned_count']  # 2 of 2 capacity
  end

  test "should combine multiple filters" do
    get api_v1_shifts_url, params: { 
      status: 'published', 
      timeframe: 'upcoming',
      fill_status: 'unfilled'
    }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should return published, upcoming, unfilled shifts
    # Only draft_shift matches (published + upcoming + unfilled)
    assert_equal 0, shifts.length  # No shifts match all criteria
  end

  test "should return all shifts when no filters applied" do
    get api_v1_shifts_url
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should return all 4 shifts
    assert_equal 4, shifts.length
  end

  test "should handle invalid status gracefully" do
    get api_v1_shifts_url, params: { status: 'invalid_status' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should return empty result for invalid status
    assert_equal 0, shifts.length
  end

  test "should handle invalid timeframe gracefully" do
    get api_v1_shifts_url, params: { timeframe: 'invalid_timeframe' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should return all shifts for invalid timeframe
    assert_equal 4, shifts.length
  end

  test "should handle invalid fill_status gracefully" do
    get api_v1_shifts_url, params: { fill_status: 'invalid_fill_status' }
    assert_response :success
    
    json = JSON.parse(response.body)
    shifts = json['data']['shifts']
    
    # Should return all shifts for invalid fill_status
    assert_equal 4, shifts.length
  end
end
