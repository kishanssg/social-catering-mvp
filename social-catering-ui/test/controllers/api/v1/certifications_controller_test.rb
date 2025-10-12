require "test_helper"

class Api::V1::CertificationsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  def setup
    @user = users(:one)
  end

  test "should get index" do
    sign_in @user
    get "/api/v1/certifications"
    assert_response :success

    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert json_response["data"]["certifications"].is_a?(Array)

    # Check that certifications are ordered by name
    certifications = json_response["data"]["certifications"]
    if certifications.length > 1
      assert certifications[0]["name"] <= certifications[1]["name"]
    end
  end

  test "should return only id and name fields" do
    sign_in @user
    get "/api/v1/certifications"
    assert_response :success

    json_response = JSON.parse(response.body)
    certifications = json_response["data"]["certifications"]

    if certifications.any?
      certification = certifications.first
      assert certification.key?("id")
      assert certification.key?("name")
      assert_not certification.key?("created_at")
      assert_not certification.key?("updated_at")
    end
  end

  test "should require authentication" do
    get "/api/v1/certifications"
    assert_response :unauthorized
  end

  test "should return empty array when no certifications exist" do
    sign_in @user
    # Clear all worker certifications first, then certifications
    WorkerCertification.delete_all
    Certification.delete_all

    get "/api/v1/certifications"
    assert_response :success

    json_response = JSON.parse(response.body)
    assert_equal "success", json_response["status"]
    assert_equal [], json_response["data"]["certifications"]
  end
end
