class HomeController < ApplicationController
  # Serve the React SPA shell publicly (no auth)
  skip_before_action :authenticate_user!, raise: false

  def index
    # Ensure the SPA shell is never cached so new builds show immediately
    response.set_header("Cache-Control", "no-store, must-revalidate")
    # Render the prebuilt index.html from public/
    render file: Rails.root.join('public', 'index.html'), layout: false, content_type: 'text/html'
  end
end
