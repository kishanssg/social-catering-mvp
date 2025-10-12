class HealthController < ApplicationController
  skip_before_action :verify_authenticity_token

  def check
    ActiveRecord::Base.connection.execute("SELECT 1")
    render json: {
      status: "healthy",
      timestamp: Time.current.utc.iso8601,
      database: "connected"
    }
  rescue => e
    render json: {
      status: "unhealthy",
      error: e.message
    }, status: 503
  end
end
