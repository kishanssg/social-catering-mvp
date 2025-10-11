import api from './api'

export interface WorkerCertification {
  certification_id: number
  expires_at_utc: string
}

export interface Worker {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  active: boolean
  skills_json: string[]
  certifications?: Array<{ certification_id: number; name?: string; expires_at_utc: string }>
  worker_certifications?: WorkerCertification[]
  created_at: string
  updated_at: string
}

export interface WorkersResponse {
  status: 'success'
  data: Worker[]
}

export const getWorkers = async (params?: { search?: string; status?: 'active' | 'inactive' | 'all' }): Promise<WorkersResponse> => {
  const response = await api.get('/workers', {
    params: {
      query: params?.search,
      status: params?.status && params.status !== 'all' ? params.status : undefined,
    },
  })
  return response.data
}

export interface WorkerResponse {
  status: 'success'
  data: Worker
}

export const getWorker = async (id: number): Promise<WorkerResponse> => {
  const response = await api.get(`/workers/${id}`)
  return response.data
}



