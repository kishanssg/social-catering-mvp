import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, LoginCredentials, AuthUser } from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// API Service class
class ApiService {
  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthUser>> {
    const response = await apiClient.post('/users/sign_in', { user: credentials });
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response = await apiClient.delete('/users/sign_out');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response = await apiClient.get('/healthz');
    return response.data;
  }

  // Dashboard
  async getDashboard(): Promise<ApiResponse> {
    const response = await apiClient.get('/dashboard');
    return response.data;
  }

  // Workers
  async getWorkers(params?: any): Promise<ApiResponse> {
    const response = await apiClient.get('/workers', { params });
    return response.data;
  }

  async getWorker(id: number): Promise<ApiResponse> {
    const response = await apiClient.get(`/workers/${id}`);
    return response.data;
  }

  async createWorker(data: any): Promise<ApiResponse> {
    const response = await apiClient.post('/workers', data);
    return response.data;
  }

  async updateWorker(id: number, data: any): Promise<ApiResponse> {
    const response = await apiClient.put(`/workers/${id}`, data);
    return response.data;
  }

  // Shifts
  async getShifts(params?: any): Promise<ApiResponse> {
    const response = await apiClient.get('/shifts', { params });
    return response.data;
  }

  async getShift(id: number): Promise<ApiResponse> {
    const response = await apiClient.get(`/shifts/${id}`);
    return response.data;
  }

  async createShift(data: any): Promise<ApiResponse> {
    const response = await apiClient.post('/shifts', data);
    return response.data;
  }

  async updateShift(id: number, data: any): Promise<ApiResponse> {
    const response = await apiClient.put(`/shifts/${id}`, data);
    return response.data;
  }

  async deleteShift(id: number): Promise<ApiResponse> {
    const response = await apiClient.delete(`/shifts/${id}`);
    return response.data;
  }

  // Assignments
  async createAssignment(data: any): Promise<ApiResponse> {
    const response = await apiClient.post('/assignments', data);
    return response.data;
  }

  async deleteAssignment(id: number): Promise<ApiResponse> {
    const response = await apiClient.delete(`/assignments/${id}`);
    return response.data;
  }

  // Certifications
  async getCertifications(): Promise<ApiResponse> {
    const response = await apiClient.get('/certifications');
    return response.data;
  }

  // Activity Logs
  async getActivityLogs(params?: any): Promise<ApiResponse> {
    const response = await apiClient.get('/activity_logs', { params });
    return response.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiClient;
