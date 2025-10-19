import { apiClient } from '../lib/api';

export interface Venue {
  id: number;
  place_id: string;
  name: string;
  formatted_address: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  arrival_instructions?: string;
  parking_info?: string;
  last_synced_at?: string;
}

export interface VenueSearchResult {
  id?: number;
  place_id: string;
  name: string;
  address: string;
  source: 'cached' | 'google';
}

export interface VenueSearchResponse {
  cached: VenueSearchResult[];
  google_results: VenueSearchResult[];
  session_token: string;
  status: string;
}

export interface VenueSelectResponse {
  venue: Venue;
  source: 'cached' | 'google';
  status: string;
}

export const venuesApi = {
  // Search venues (cached + Google autocomplete)
  async search(query: string, sessionToken?: string): Promise<VenueSearchResponse> {
    const params = new URLSearchParams();
    params.append('query', query);
    if (sessionToken) {
      params.append('session_token', sessionToken);
    }
    
    const response = await apiClient.get(`/venues/search?${params.toString()}`);
    return response.data;
  },

  // Select a venue (fetch from cache or Google)
  async select(placeId: string, sessionToken?: string): Promise<VenueSelectResponse> {
    const response = await apiClient.post('/venues/select', {
      place_id: placeId,
      session_token: sessionToken,
    });
    return response.data;
  },

  // Update venue instructions
  async update(
    venueId: number,
    data: { arrival_instructions?: string; parking_info?: string }
  ): Promise<{ venue: Venue; status: string }> {
    const response = await apiClient.patch(`/venues/${venueId}`, {
      venue: data,
    });
    return response.data;
  },

  // Get venue details
  async getVenue(venueId: number): Promise<{ venue: Venue; status: string }> {
    const response = await apiClient.get(`/venues/${venueId}`);
    return response.data;
  },
};

