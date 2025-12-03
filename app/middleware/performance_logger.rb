# frozen_string_literal: true

# Middleware to log slow requests for performance monitoring
class PerformanceLogger
  def initialize(app)
    @app = app
  end

  def call(env)
    start_time = Time.current

    status, headers, response = @app.call(env)

    duration_ms = ((Time.current - start_time) * 1000).round(2)

    # Log slow requests (>1000ms)
    if duration_ms > 1000
      path = env["REQUEST_PATH"]
      method = env["REQUEST_METHOD"]

      Rails.logger.warn "SLOW REQUEST: #{method} #{path} - #{duration_ms}ms"

      # Log to a separate file for analysis
      slow_log = Rails.root.join("log", "slow_requests.log")
      File.open(slow_log, "a") do |f|
        f.puts "[#{Time.current}] #{method} #{path} - #{duration_ms}ms"
      end
    end

    # Add performance header
    headers["X-Response-Time"] = "#{duration_ms}ms"

    [ status, headers, response ]
  end
end
