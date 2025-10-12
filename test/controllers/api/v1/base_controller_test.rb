require "test_helper"

class Api::V1::BaseControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  def setup
    @user = users(:one)
  end

  test "requires authentication" do
    get "/api/v1/workers"
    assert_response :unauthorized  # Devise returns 401 JSON for API
  end

  test "responds with JSON when authenticated" do
    sign_in @user
    get "/api/v1/workers"
    assert_response :success
    assert_equal "application/json", response.media_type
  end

  test "handles record not found" do
    sign_in @user
    get "/api/v1/workers/999999"
    assert_response :not_found

    json_response = JSON.parse(response.body)
    assert_equal "error", json_response["status"]
    assert_includes json_response["error"], "Record not found"
  end
end
