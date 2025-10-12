require "test_helper"

class Api::V1::WorkersControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  def setup
    @user = users(:one)
    @worker = workers(:one)
  end

  test "should get index" do
    sign_in @user
    get "/api/v1/workers"
    assert_response :success

    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["workers"].is_a?(Array)
  end

  test "should search workers with query" do
    sign_in @user
    get "/api/v1/workers?query=cooking"
    assert_response :success

    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["workers"].is_a?(Array)
  end

  test "should filter workers by certification" do
    sign_in @user
    cert = certifications(:one)
    get "/api/v1/workers?certification_id=#{cert.id}"
    assert_response :success

    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["workers"].is_a?(Array)
  end

  test "should show worker" do
    sign_in @user
    get "/api/v1/workers/#{@worker.id}"
    assert_response :success

    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["worker"]["id"] == @worker.id
    assert json_response["data"]["worker"]["first_name"] == @worker.first_name
  end

  test "should create worker" do
    sign_in @user
    worker_params = {
      worker: {
        first_name: "Test",
        last_name: "Worker",
        email: "test@example.com",
        skills_json: [ "cooking", "serving" ]
      }
    }

    assert_difference "Worker.count", 1 do
      post "/api/v1/workers", params: worker_params, as: :json
    end

    assert_response :created

    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["worker"]["first_name"] == "Test"
  end

  test "should update worker" do
    sign_in @user
    worker_params = {
      worker: {
        first_name: "Updated",
        last_name: "Name"
      }
    }

    patch "/api/v1/workers/#{@worker.id}", params: worker_params, as: :json
    assert_response :success

    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["worker"]["first_name"] == "Updated"
  end

  test "should return validation errors on invalid create" do
    sign_in @user
    worker_params = {
      worker: {
        first_name: "",  # Invalid - required field
        last_name: "Worker"
      }
    }

    post "/api/v1/workers", params: worker_params, as: :json
    assert_response :unprocessable_entity

    json_response = JSON.parse(response.body)
    assert_equal "validation_error", json_response["status"]
    assert json_response["errors"].present?
  end

  test "should return validation errors on invalid update" do
    sign_in @user
    worker_params = {
      worker: {
        first_name: "",  # Invalid - required field
        last_name: "Worker"
      }
    }

    patch "/api/v1/workers/#{@worker.id}", params: worker_params, as: :json
    assert_response :unprocessable_entity

    json_response = JSON.parse(response.body)
    assert_equal "validation_error", json_response["status"]
    assert json_response["errors"].present?
  end

  test "should require authentication" do
    get "/api/v1/workers"
    assert_response :unauthorized
  end
end
