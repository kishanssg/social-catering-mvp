import axios, { AxiosError } from 'axios'
import { normalizeEventsList, normalizeEvent } from './normalize'

// Resolve API base URL from env, falling back to same-origin for bundles
// Local dev should set VITE_API_URL (e.g. http://localhost:3001/api/v1)
const rawBase = import.meta.env.VITE_API_URL as string | undefined
const API_BASE_URL = rawBase ? rawBase.replace(/\/$/, '') : '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  validateStatus: (status) => {
    // Treat 200-299 AND 207 Multi-Status as success
    // This allows partial_success responses to go through to the try block
    return (status >= 200 && status < 300) || status === 207;
  }
})

apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url)
    try {
      const url = response.config.url || ''
      const data = response.data
      if (data && data.status === 'success') {
        // Normalize common payloads used by dashboard/events to avoid undefined property crashes
        if (url.endsWith('/events')) {
          response.data = { ...data, data: normalizeEventsList(data.data) }
        } else if (/\/events\/(\d+)$/.test(url) && data.data) {
          response.data = { ...data, data: normalizeEvent(data.data) }
        }
      }
    } catch (e) {
      // non-fatal normalization error; keep original response
    }
    return response
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.log('Unauthorized request')
    }
    return Promise.reject(error)
  }
)

export const api = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/login', { user: { email, password } })
    return response.data
  },
  logout: async () => {
    const response = await apiClient.delete('/logout')
    return response.data
  },
  healthCheck: async () => {
    const response = await axios.get('/healthz', { withCredentials: true })
    return response.data
  },
  // Dashboard
  dashboard: async () => {
    const response = await apiClient.get('/dashboard')
    return response.data
  },
  
  // Workers
  getWorkers: async (params?: { search?: string; status?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('query', params.search)
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status)
    
    const response = await apiClient.get(`/workers?${queryParams.toString()}`)
    return response.data
  },
  
  getWorker: async (id: number) => {
    const response = await apiClient.get(`/workers/${id}`)
    return response.data
  },
  
  createWorker: async (data: any) => {
    const response = await apiClient.post('/workers', { worker: data })
    return response.data
  },
  
  updateWorker: async (id: number, data: any) => {
    const response = await apiClient.patch(`/workers/${id}`, { worker: data })
    return response.data
  },
  
  deleteWorker: async (id: number) => {
    const response = await apiClient.delete(`/workers/${id}`)
    return response.data
  },
  
  // Certifications
  getCertifications: async () => {
    const response = await apiClient.get('/certifications')
    return response.data
  },
}
