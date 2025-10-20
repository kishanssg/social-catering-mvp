import axios, { AxiosError } from 'axios'

// In production, default to same-origin /api/v1; allow override via VITE_API_URL
const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '/api/v1')
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1')

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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
