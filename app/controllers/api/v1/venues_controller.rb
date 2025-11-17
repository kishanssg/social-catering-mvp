class Api::V1::VenuesController < Api::V1::BaseController
  before_action :authenticate_user!
  
  # GET /api/v1/venues
  def index
    venues = Venue.all
    venues = venues.where("name ILIKE ?", "%#{params[:search]}%") if params[:search].present?
    
    render json: {
      status: 'success',
      data: venues
    }
  end
  
  # GET /api/v1/venues/search?query=...
  # Returns ONLY local venues from database (no Google API)
  def search
    query = params[:query].to_s.strip
    
    if query.blank? || query.length < 3
      # Return all venues for empty/short queries (show test venues)
      local_venues = Venue.distinct.order(:name).limit(20)
    else
      # Search local venues by name or address
      local_venues = Venue.where('name ILIKE ? OR formatted_address ILIKE ?', "%#{query}%", "%#{query}%")
                          .distinct
                          .order(:name)
                          .limit(20)
    end
    
    render json: {
      status: 'success',
      data: {
        cached: local_venues.map { |v| 
          { 
            id: v.id,
            place_id: v.place_id, 
            name: v.name, 
            address: v.formatted_address,
            source: 'local'
          } 
        },
        google_results: [],
        session_token: nil
      }
    }
  rescue => e
    Rails.logger.error("Venues Search Error: #{e.message}\n#{e.backtrace.join("\n")}")
    render json: { error: 'Search failed', message: e.message, status: 'error' }, status: 500
  end
  
  # POST /api/v1/venues/select
  # Selects a venue from local database ONLY
  def select
    place_id = params[:place_id]
    
    return render json: { error: 'Place ID required', status: 'error' }, status: 400 if place_id.blank?
    
    # Find venue in local database
    venue = Venue.find_by(place_id: place_id)
    
    if venue
      render json: {
        status: 'success',
        data: {
          venue: venue_json(venue),
          source: 'local'
        }
      }
    else
      render json: { 
        error: 'Venue not found in database', 
        status: 'error' 
      }, status: 404
    end
  rescue => e
    Rails.logger.error("Venue Select Error: #{e.message}\n#{e.backtrace.join("\n")}")
    render json: { error: 'Selection failed', message: e.message, status: 'error' }, status: 500
  end
  
  # PATCH /api/v1/venues/:id
  # Update venue instructions (arrival_instructions, parking_info)
  def update
    venue = Venue.find(params[:id])
    
    update_params = params.require(:venue).permit(:arrival_instructions, :parking_info)
    
    if venue.update(update_params)
      render json: {
        status: 'success',
        data: {
          venue: venue_json(venue)
        }
      }
    else
      render json: { error: 'Update failed', errors: venue.errors.full_messages, status: 'error' }, status: 422
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Venue not found', status: 'error' }, status: 404
  rescue => e
    Rails.logger.error("Venue Update Error: #{e.message}\n#{e.backtrace.join("\n")}")
    render json: { error: 'Update failed', message: e.message, status: 'error' }, status: 500
  end
  
  # GET /api/v1/venues/:id
  # Get venue details
  def show
    venue = Venue.find(params[:id])
    render json: {
      status: 'success',
      data: venue
    }
  rescue ActiveRecord::RecordNotFound
    render json: { status: 'error', error: 'Venue not found' }, status: :not_found
  end

  # POST /api/v1/venues
  def create
    venue = Venue.new(venue_params)
    
    if venue.save
      render json: {
        status: 'success',
        data: venue
      }, status: :created
    else
      render json: {
        status: 'validation_error',
        errors: venue.errors.full_messages
      }, status: :unprocessable_entity
    end
  end
  
  private
  
  def venue_params
    params.require(:venue).permit(:name, :formatted_address, :address, :city, :state, :zip, :notes)
  end

  def venue_json(venue)
    {
      id: venue.id,
      place_id: venue.place_id,
      name: venue.name,
      formatted_address: venue.formatted_address,
      address: venue.address,
      latitude: venue.latitude&.to_f,
      longitude: venue.longitude&.to_f,
      phone: venue.phone,
      website: venue.website,
      arrival_instructions: venue.arrival_instructions,
      parking_info: venue.parking_info,
      last_synced_at: venue.last_synced_at_utc&.iso8601
    }
  end
end

