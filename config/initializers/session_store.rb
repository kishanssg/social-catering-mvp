# Be sure to restart your server when you modify this file.

Rails.application.config.session_store :cookie_store,
  key: "_social_catering_session",
  same_site: :lax,  # Allow same-site requests
  secure: Rails.env.production?,  # Secure in production only
  httponly: false  # Allow JavaScript access to cookies
