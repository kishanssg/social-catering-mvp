import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { ApiResponse, LoginCredentials, AuthUser, Skill, Location, Shift, Assignment } from '../types';
import { config } from '../config/environment';

// API Configuration
const API_BASE_URL = config.API_BASE_URL;

// Export for use in other services
export { API_BASE_URL };

// Base fetch function with credentials
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',  // CRITICAL for sessions
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });
  
  if (response.status === 401) {
    // Redirect to login on unauthorized
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  
  return response;
};

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
    const response = await apiClient.post('/login', { user: credentials });
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response = await apiClient.delete('/logout');
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

  // Worker Certifications
  async addCertificationToWorker(workerId: number, data: any): Promise<ApiResponse> {
    const response = await apiClient.post(`/workers/${workerId}/certifications`, data);
    return response.data;
  }

  async removeCertificationFromWorker(workerId: number, certificationId: number): Promise<ApiResponse> {
    const response = await apiClient.delete(`/workers/${workerId}/certifications/${certificationId}`);
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

  async updateShiftStatus(id: number, status: string): Promise<ApiResponse> {
    const response = await apiClient.patch(`/shifts/${id}/status`, { status });
    return response.data;
  }

  // Assignments
  async getAssignments(params?: any): Promise<ApiResponse> {
    const response = await apiClient.get('/assignments', { params });
    return response.data;
  }

  async createAssignment(data: any): Promise<ApiResponse> {
    const response = await apiClient.post('/assignments', data);
    return response.data;
  }

  async updateAssignment(id: number, data: any): Promise<ApiResponse> {
    const response = await apiClient.put(`/assignments/${id}`, data);
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

  // Skills
  async getSkills(): Promise<ApiResponse> {
    const response = await apiClient.get('/skills');
    return response.data;
  }

  // Locations
  async getLocations(): Promise<ApiResponse> {
    const response = await apiClient.get('/locations');
    return response.data;
  }

  // Exports
  async exportTimesheet(params?: any): Promise<Blob> {
    const response = await apiClient.get('/exports/timesheet', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // Helper function to download CSV
  async downloadTimesheet(startDate: string, endDate: string): Promise<void> {
    try {
      const blob = await this.exportTimesheet({ start_date: startDate, end_date: endDate });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timesheet_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading timesheet:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export individual functions for convenience
export const getSkills = async (): Promise<Skill[]> => {
  const response = await apiClient.get('/skills');
  return response.data.data;
};

export const getLocations = async (): Promise<Location[]> => {
  const response = await apiClient.get('/locations');
  return response.data.data;
};

export const downloadTimesheet = async (startDate: string, endDate: string) => {
  const response = await apiClient.get('/exports/timesheet', {
    params: { start_date: startDate, end_date: endDate },
    responseType: 'blob'
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `timesheet_${startDate}_to_${endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const createShift = async (data: Partial<Shift>) => {
  const response = await apiClient.post('/shifts', { shift: data });
  return response.data;
};

export const createAssignment = async (data: Partial<Assignment>) => {
  const response = await apiClient.post('/assignments', { assignment: data });
  return response.data;
};

export const updateAssignment = async (id: number, data: Partial<Assignment>) => {
  const response = await apiClient.put(`/assignments/${id}`, { assignment: data });
  return response.data;
};

export default apiClient;
