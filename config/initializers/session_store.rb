# Be sure to restart your server when you modify this file.

Rails.application.config.session_store :cookie_store,
  key: '_social_catering_session',
  same_site: Rails.env.production? ? :none : :lax,  # :lax in dev, :none in prod with HTTPS
  secure: Rails.env.production?  # HTTPS only in production
  # Note: No domain restriction in development allows cookie sharing across ports
