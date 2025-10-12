# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) to accept cross-origin requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  # Development - allow localhost on any port
  allow do
    origins "localhost:3000", "localhost:3001", "localhost:5173",
            "127.0.0.1:3000", "127.0.0.1:3001", "127.0.0.1:5173"

    resource "/api/*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      credentials: true
  end

  # Staging environment
  allow do
    origins "https://sc-mvp-staging-c6ef090c6c41.herokuapp.com",
            /https:\/\/.*\.herokuapp\.com/  # Allow any Heroku staging URLs

    resource "/api/*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      credentials: true
  end

  # Production environment (update with actual domain later)
  allow do
    origins ENV["FRONTEND_URL"] || "https://socialcatering.com"

    resource "/api/*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      credentials: true
  end
end
