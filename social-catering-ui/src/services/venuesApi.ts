import { apiClient } from '../lib/api';
import type { Venue, VenueSearchResult, VenueSearchResponse, VenueSelectResponse } from '../types/venues';

// Re-export types for backward compatibility
export type { Venue, VenueSearchResult, VenueSearchResponse, VenueSelectResponse };

export const venuesApi = {
  // Search venues
  async search(query: string, sessionToken?: string): Promise<VenueSearchResponse> {
    const response = await apiClient.get('/venues/search', {
      params: { query, session_token: sessionToken }
    });
    return response.data.data;
  },

  // Select a venue from search results
  async select(placeId: string, sessionToken?: string): Promise<VenueSelectResponse> {
    const response = await apiClient.post('/venues/select', {
      place_id: placeId,
      session_token: sessionToken
    });
    return response.data.data;
  },

  // Update venue details
  async update(venueId: number, updates: Partial<Venue>): Promise<{ venue: Venue }> {
    const response = await apiClient.patch(`/venues/${venueId}`, updates);
    return response.data.data;
  },

  // Get all venues
  async getAll(): Promise<{ venues: Venue[] }> {
    const response = await apiClient.get('/venues');
    return response.data.data;
  }
};
