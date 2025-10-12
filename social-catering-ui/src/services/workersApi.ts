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
  certifications?: Array<{ id: number; name: string }>
  worker_certifications?: WorkerCertification[]
  created_at: string
  updated_at: string
}

export interface WorkersResponse {
  status: 'success'
  data: {
    workers: Worker[]
  }
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
  data: {
    worker: Worker
  }
}

export const getWorker = async (id: number): Promise<WorkerResponse> => {
  const response = await api.get(`/workers/${id}`)
  return response.data
}

export const createWorker = async (workerData: Partial<Worker>): Promise<WorkerResponse> => {
  const response = await api.post('/workers', { worker: workerData })
  return response.data
}

export const updateWorker = async (id: number, workerData: Partial<Worker>): Promise<WorkerResponse> => {
  const response = await api.put(`/workers/${id}`, { worker: workerData })
  return response.data
}

export const deleteWorker = async (id: number): Promise<void> => {
  await api.put(`/workers/${id}`, { worker: { active: false } })
}

// Certification management
export interface AddCertificationRequest {
  certification_id: number
  expires_at_utc?: string
}

export interface AddCertificationResponse {
  status: 'success'
  data: {
    worker_certification: {
      id: number
      worker_id: number
      certification_id: number
      expires_at_utc: string
      created_at: string
      updated_at: string
      certification: {
        id: number
        name: string
      }
    }
  }
}

export const addCertificationToWorker = async (
  workerId: number, 
  certificationData: AddCertificationRequest
): Promise<AddCertificationResponse> => {
  const response = await api.post(`/workers/${workerId}/certifications`, certificationData)
  return response.data
}

export interface RemoveCertificationResponse {
  status: 'success'
  data: {
    message: string
  }
}

export const removeCertificationFromWorker = async (
  workerId: number, 
  certificationId: number
): Promise<RemoveCertificationResponse> => {
  const response = await api.delete(`/workers/${workerId}/certifications/${certificationId}`)
  return response.data
}
