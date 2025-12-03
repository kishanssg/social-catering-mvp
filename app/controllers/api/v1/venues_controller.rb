require "set"

class Api::V1::VenuesController < Api::V1::BaseController
  before_action :authenticate_user!

  # GET /api/v1/venues
  def index
    venues = Venue.all
    venues = venues.where("name ILIKE ?", "%#{params[:search]}%") if params[:search].present?

    render json: {
      status: "success",
      data: venues
    }
  end

  # GET /api/v1/venues/search?query=...
  # Returns ONLY local venues from database (no Google API)
  def search
    query = params[:query].to_s.strip

    if query.blank? || query.length < 3
      # Return all venues for empty/short queries (show test venues)
      local_venues = Venue.order(:name).limit(20)
    else
      # Search local venues by name or address
      local_venues = Venue.where("name ILIKE ? OR formatted_address ILIKE ?", "%#{query}%", "%#{query}%")
                          .order(:name)
                          .limit(20)
    end

    # Deduplicate by name+address FIRST (most reliable), then by place_id
    # This handles cases where duplicate records have different place_ids but same name/address
    seen_name_address = Set.new
    seen_place_ids = Set.new
    deduplicated_venues = []

    local_venues.each do |venue|
      # Create normalized name+address key (primary deduplication)
      name_address_key = "#{venue.name.to_s.downcase.strip}|#{venue.formatted_address.to_s.downcase.strip}"

      # Skip if we've already seen this name+address combination
      if seen_name_address.include?(name_address_key)
        next
      end

      # Also skip if we've seen this place_id (secondary check for venues with same place_id)
      if venue.place_id.present? && seen_place_ids.include?(venue.place_id)
        next
      end

      # Add to seen sets
      seen_name_address.add(name_address_key)
      seen_place_ids.add(venue.place_id) if venue.place_id.present?

      # Add to results (keep the first occurrence)
      deduplicated_venues << venue
    end

    render json: {
      status: "success",
      data: {
        cached: deduplicated_venues.map { |v|
          {
            id: v.id,
            place_id: v.place_id,
            name: v.name,
            address: v.formatted_address,
            source: "local"
          }
        },
        google_results: [],
        session_token: nil
      }
    }
  rescue => e
    Rails.logger.error("Venues Search Error: #{e.message}\n#{e.backtrace.join("\n")}")
    render json: { error: "Search failed", message: e.message, status: "error" }, status: 500
  end

  # POST /api/v1/venues/select
  # Selects a venue from local database ONLY
  def select
    place_id = params[:place_id]

    return render json: { error: "Place ID required", status: "error" }, status: 400 if place_id.blank?

    # Find venue in local database
    venue = Venue.find_by(place_id: place_id)

    if venue
      render json: {
        status: "success",
        data: {
          venue: venue_json(venue),
          source: "local"
        }
      }
    else
      render json: {
        error: "Venue not found in database",
        status: "error"
      }, status: 404
    end
  rescue => e
    Rails.logger.error("Venue Select Error: #{e.message}\n#{e.backtrace.join("\n")}")
    render json: { error: "Selection failed", message: e.message, status: "error" }, status: 500
  end

  # PATCH /api/v1/venues/:id
  # Update venue instructions (arrival_instructions, parking_info)
  def update
    venue = Venue.find(params[:id])

    update_params = params.require(:venue).permit(:arrival_instructions, :parking_info)

    if venue.update(update_params)
      render json: {
        status: "success",
        data: {
          venue: venue_json(venue)
        }
      }
    else
      render json: { error: "Update failed", errors: venue.errors.full_messages, status: "error" }, status: 422
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Venue not found", status: "error" }, status: 404
  rescue => e
    Rails.logger.error("Venue Update Error: #{e.message}\n#{e.backtrace.join("\n")}")
    render json: { error: "Update failed", message: e.message, status: "error" }, status: 500
  end

  # GET /api/v1/venues/:id
  # Get venue details
  def show
    venue = Venue.find(params[:id])
    render json: {
      status: "success",
      data: venue
    }
  rescue ActiveRecord::RecordNotFound
    render json: { status: "error", error: "Venue not found" }, status: :not_found
  end

  # POST /api/v1/venues
  def create
    attrs = venue_params.to_h.symbolize_keys

    # Inline-created venues won't have a Google place_id; generate a stable UUID
    attrs[:place_id] ||= SecureRandom.uuid

    # If formatted_address is blank but address is present, use it as a fallback
    if attrs[:formatted_address].blank? && attrs[:address].present?
      attrs[:formatted_address] = attrs[:address]
    end

    # Map 'notes' to 'arrival_instructions' if present (frontend sends 'notes')
    # Always delete 'notes' since Venue model doesn't have this column
    if attrs[:notes].present?
      attrs[:arrival_instructions] = attrs[:notes]
    end
    attrs.delete(:notes) # Always remove, even if empty

    venue = Venue.new(attrs)

    if venue.save
      render json: {
        status: "success",
        data: venue_json(venue)
      }, status: :created
    else
      render json: {
        status: "validation_error",
        errors: venue.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  private

  def venue_params
    params.require(:venue).permit(:name, :formatted_address, :address, :notes)
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
