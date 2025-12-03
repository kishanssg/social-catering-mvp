require "net/http"
require "json"

class GooglePlacesService
  AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
  TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"

  def initialize
    @api_key = ENV["GOOGLE_PLACES_API_KEY"] || Rails.application.credentials.dig(:google_places, :api_key)
    raise "Google Places API key not configured" if @api_key.blank?
  end

  # Combined search: Autocomplete + Text Search for better address matching
  # Uses session token for cost optimization
  def search_venues(input, session_token: nil)
    return { success: false, results: [] } if input.blank? || input.length < 3

    # Try autocomplete first (best for business names)
    autocomplete_results = autocomplete(input, session_token: session_token)

    # If autocomplete returns few/no results and query looks like an address, try text search
    if autocomplete_results[:results].count < 3 && looks_like_address?(input)
      text_search_results = text_search(input)
      # Merge results, avoiding duplicates
      all_results = (autocomplete_results[:results] + text_search_results[:results]).uniq { |r| r[:place_id] }
      return { success: true, results: all_results, session_token: autocomplete_results[:session_token] }
    end

    autocomplete_results
  end

  # Autocomplete search for venues (original method, kept for compatibility)
  # Uses session token for cost optimization
  def autocomplete(input, session_token: nil)
    return { success: false, results: [] } if input.blank? || input.length < 3

    params = {
      input: input,
      key: @api_key,
      types: "establishment",
      components: "country:us", # Restrict to US
      sessiontoken: session_token || SecureRandom.uuid
    }

    response = make_request(AUTOCOMPLETE_URL, params)

    if response[:success]
      results = response[:data]["predictions"].map do |prediction|
        {
          place_id: prediction["place_id"],
          description: prediction["description"],
          structured_formatting: prediction["structured_formatting"]
        }
      end
      { success: true, results: results, session_token: params[:sessiontoken] }
    else
      { success: false, error: response[:error], results: [] }
    end
  rescue => e
    Rails.logger.error("Google Places Autocomplete Error: #{e.message}")
    { success: false, error: e.message, results: [] }
  end

  # Fetch detailed place information
  def place_details(place_id, session_token: nil)
    return { success: false, error: "Place ID required" } if place_id.blank?

    params = {
      place_id: place_id,
      key: @api_key,
      fields: "place_id,name,formatted_address,geometry,formatted_phone_number,website,address_components",
      sessiontoken: session_token
    }

    response = make_request(PLACE_DETAILS_URL, params)

    if response[:success]
      result = response[:data]["result"]
      {
        success: true,
        place: {
          place_id: result["place_id"],
          name: result["name"],
          formatted_address: result["formatted_address"],
          latitude: result.dig("geometry", "location", "lat"),
          longitude: result.dig("geometry", "location", "lng"),
          phone: result["formatted_phone_number"],
          website: result["website"]
        }
      }
    else
      { success: false, error: response[:error] }
    end
  rescue => e
    Rails.logger.error("Google Places Details Error: #{e.message}")
    { success: false, error: e.message }
  end

  # Text search for addresses and general locations
  # More expensive but better for street addresses
  def text_search(query)
    return { success: false, results: [] } if query.blank?

    params = {
      query: "#{query}, Tallahassee, FL",  # Add location bias
      key: @api_key,
      type: "establishment"
    }

    response = make_request(TEXT_SEARCH_URL, params)

    if response[:success]
      results = response[:data]["results"].take(5).map do |result|
        {
          place_id: result["place_id"],
          description: "#{result['name']}, #{result['formatted_address']}",
          structured_formatting: {
            "main_text" => result["name"],
            "secondary_text" => result["formatted_address"]
          }
        }
      end
      { success: true, results: results }
    else
      { success: false, error: response[:error], results: [] }
    end
  rescue => e
    Rails.logger.error("Google Places Text Search Error: #{e.message}")
    { success: false, error: e.message, results: [] }
  end

  private

  # Check if query looks like a street address
  def looks_like_address?(query)
    # Contains numbers, common address keywords, or Dr/Ave/St/Rd
    query.match?(/\d+/) ||
    query.match?(/\b(street|avenue|drive|road|dr|ave|st|rd|blvd|boulevard|lane|ln|way|terrace)\b/i)
  end

  def make_request(url, params)
    uri = URI(url)
    uri.query = URI.encode_www_form(params)

    # Use Net::HTTP with proper SSL configuration
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    # In development, we can be more lenient with SSL verification
    # In production, this should be VERIFY_PEER with proper certificates
    http.verify_mode = Rails.env.production? ? OpenSSL::SSL::VERIFY_PEER : OpenSSL::SSL::VERIFY_NONE
    http.read_timeout = 10
    http.open_timeout = 10

    request = Net::HTTP::Get.new(uri.request_uri)
    response = http.request(request)

    if response.is_a?(Net::HTTPSuccess)
      data = JSON.parse(response.body)

      if data["status"] == "OK" || data["status"] == "ZERO_RESULTS"
        { success: true, data: data }
      else
        { success: false, error: "Google API Error: #{data['status']} - #{data['error_message']}" }
      end
    else
      { success: false, error: "HTTP Error: #{response.code} #{response.message}" }
    end
  rescue JSON::ParserError => e
    { success: false, error: "JSON Parse Error: #{e.message}" }
  rescue => e
    { success: false, error: "Request Error: #{e.message}" }
  end
end
