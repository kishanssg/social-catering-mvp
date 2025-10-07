import axios, { AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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
    const response = await apiClient.get('/healthz')
    return response.data
  },
}
