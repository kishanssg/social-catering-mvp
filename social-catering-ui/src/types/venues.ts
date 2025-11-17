export interface Venue {
  id: number;
  name: string;
  formatted_address: string;
  place_id?: string;
  arrival_instructions?: string;
  parking_info?: string;
  created_at: string;
  updated_at: string;
}

export interface VenueSearchResult {
  id?: number;
  place_id?: string;
  name: string;
  address: string;
  source?: string;
}

export interface VenueSearchResponse {
  cached: VenueSearchResult[];
  google_results: VenueSearchResult[];
  session_token: string;
}

export interface VenueSelectResponse {
  venue: Venue;
}
