class HealthController < ApplicationController
  skip_before_action :verify_authenticity_token
  skip_before_action :authenticate_user!, only: [ :check, :metrics ]

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

  def metrics
    render json: {
      database: {
        events_count: Event.count,
        workers_count: Worker.count,
        shifts_count: Shift.count,
        assignments_count: Assignment.count,
        active_events: Event.where(status: "published").count,
        completed_events: Event.where(status: "completed").count
      },
      cache: {
        active_workers_cached: Rails.cache.exist?("active_workers_list")
      }
    }
  rescue => e
    render json: {
      status: "error",
      error: e.message
    }, status: 500
  end
end
