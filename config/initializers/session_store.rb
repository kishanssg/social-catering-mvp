# Be sure to restart your server when you modify this file.

Rails.application.config.session_store :cookie_store,
  key: "_social_catering_session",
  same_site: :none,  # Allow cross-origin (React on different port)
  secure: Rails.env.production?  # HTTPS only in production
