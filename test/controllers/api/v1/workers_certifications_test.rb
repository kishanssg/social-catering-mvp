require "test_helper"

class Api::V1::WorkersCertificationsTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  
  setup do
    @user = users(:one)
    @worker = workers(:one)
    @certification = certifications(:one)
    @other_certification = certifications(:two)
    
    # Clear any existing worker certifications
    @worker.worker_certifications.destroy_all
  end

  test "should add certification to worker" do
    sign_in @user
    post "/api/v1/workers/#{@worker.id}/certifications", 
         params: { 
           certification_id: @certification.id,
           expires_at_utc: "2025-12-31T23:59:59Z"
         }
    
    assert_response :created
    
    json = JSON.parse(response.body)
    assert_equal "success", json["status"]
    assert_equal @certification.id, json["data"]["worker_certification"]["certification_id"]
    assert_equal @worker.id, json["data"]["worker_certification"]["worker_id"]
    
    # Verify certification was added
    @worker.reload
    assert @worker.certifications.include?(@certification)
  end

  test "should not add duplicate certification to worker" do
    sign_in @user
    # First add certification
    @worker.worker_certifications.create!(certification: @certification, expires_at_utc: 1.year.from_now)
    
    # Try to add same certification again
    post "/api/v1/workers/#{@worker.id}/certifications", 
         params: { 
           certification_id: @certification.id,
           expires_at_utc: "2025-12-31T23:59:59Z"
         }
    
    assert_response :unprocessable_entity
    
    json = JSON.parse(response.body)
    assert_equal "error", json["status"]
    assert_equal "Worker already has this certification", json["error"]
  end

  test "should remove certification from worker" do
    sign_in @user
    # Add certification first
    worker_cert = @worker.worker_certifications.create!(certification: @certification, expires_at_utc: 1.year.from_now)
    
    delete "/api/v1/workers/#{@worker.id}/certifications/#{@certification.id}"
    
    assert_response :success
    
    json = JSON.parse(response.body)
    assert_equal "success", json["status"]
    assert_equal "Certification removed from worker", json["data"]["message"]
    
    # Verify certification was removed
    @worker.reload
    assert_not @worker.certifications.include?(@certification)
  end

  test "should not remove non-existent certification from worker" do
    sign_in @user
    delete "/api/v1/workers/#{@worker.id}/certifications/999"
    
    assert_response :not_found
    
    json = JSON.parse(response.body)
    assert_equal "error", json["status"]
    assert_equal "Certification not found for this worker", json["error"]
  end

  test "should require authentication for adding certification" do
    post "/api/v1/workers/#{@worker.id}/certifications", 
         params: { 
           certification_id: @certification.id,
           expires_at_utc: "2025-12-31T23:59:59Z"
         }
    
    assert_response :unauthorized
  end

  test "should require authentication for removing certification" do
    delete "/api/v1/workers/#{@worker.id}/certifications/#{@certification.id}"
    
    assert_response :unauthorized
  end

  test "should use default expiration date when not provided" do
    sign_in @user
    post "/api/v1/workers/#{@worker.id}/certifications", 
         params: { 
           certification_id: @certification.id
         }
    
    assert_response :created
    
    json = JSON.parse(response.body)
    expires_at = Time.parse(json["data"]["worker_certification"]["expires_at_utc"])
    
    # Should be approximately 1 year from now
    assert_in_delta 1.year.from_now, expires_at, 1.minute
  end
end
