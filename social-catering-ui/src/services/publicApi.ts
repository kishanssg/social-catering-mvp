import axios, { type AxiosInstance } from 'axios';
import { config } from '../config/environment';

// Public API client (no credentials required)
const publicApiClient: AxiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 10000,
  withCredentials: false, // No credentials for public endpoints
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Public API functions
export const getSkills = async () => {
  const response = await publicApiClient.get('/skills');
  return response.data;
};

export const getLocations = async () => {
  const response = await publicApiClient.get('/locations');
  return response.data;
};

export default publicApiClient;
