class HomeController < ApplicationController
  def index
    # Serve the React app using Rails asset helpers
    render :index, layout: false
  end
end
