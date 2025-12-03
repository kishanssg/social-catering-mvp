class Api::V1::LocationsController < ApplicationController
  # No authentication required for locations (public data)
  before_action :set_cors_headers

  def index
    locations = Location.active.ordered.includes(:shifts)
    render json: {
      status: "success",
      data: locations.map do |location|
        location.as_json(
          only: [ :id, :name, :address, :city, :state, :zip ],
          methods: [ :full_address, :display_name ]
        ).merge(
          shift_count: location.shifts.count
        )
      end
    }
  end

  def create
    location = Location.new(location_params)

    if location.save
      ActivityLog.create!(
        entity_type: "Location",
        entity_id: location.id,
        action: "create",
        metadata: { location_name: location.display_name }
      )

      render json: {
        status: "success",
        data: location_json(location)
      }
    else
      render json: {
        status: "error",
        errors: location.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  private

  def location_params
    params.require(:location).permit(:name, :address, :city, :state, :zip, :display_order, :active)
  end

  def location_json(location)
    location.as_json(methods: [ :full_address, :display_name ])
  end

  private

  def set_cors_headers
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5175"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "Origin, Content-Type, Accept, Authorization, X-Requested-With"
  end
end
