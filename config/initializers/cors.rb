# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) to accept cross-origin requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Allow multiple origins (local + production)
    origins(
      'http://localhost:5173',
      'http://localhost:3000',
      'https://your-frontend-name.netlify.app',  # Update with actual URL
      'https://your-custom-domain.com',  # If you have custom domain
      /https:\/\/.*\.herokuapp\.com$/  # Allow all Heroku subdomains
    )
    
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      expose: ['Authorization']
  end
end
