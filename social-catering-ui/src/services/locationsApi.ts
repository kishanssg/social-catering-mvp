import { apiClient } from '../lib/api';

export interface Location {
  id: number;
  name: string;
  address?: string;
  city: string;
  state: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  display_name?: string;
}

export interface LocationsResponse {
  status: 'success';
  data: Location[];
}

// Get all active locations
export const getLocations = async (): Promise<LocationsResponse> => {
  const response = await apiClient.get('/locations');
  return response.data;
};
