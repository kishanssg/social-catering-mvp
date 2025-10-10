class HomeController < ApplicationController
  def index
    # Serve the React app for all routes
    render file: Rails.root.join('public', 'index.html'), layout: false
  end
end
