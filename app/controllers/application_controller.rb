class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
  
  # Configure authentication
  before_action :authenticate_user!, unless: :public_path?

  private

  def public_path?
    # Allow public access to SPA shell and health checks
    request.path == '/' || request.path.start_with?('/healthz') ||
      !request.path.start_with?('/api')
  end
end
