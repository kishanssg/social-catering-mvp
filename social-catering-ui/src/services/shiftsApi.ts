import api from './api'

export interface Assignment {
  id: number
  worker_id: number
  shift_id: number
  status: 'assigned' | 'completed' | 'no_show' | 'cancelled'
  worker: {
    id: number
    first_name: string
    last_name: string
    email: string
    phone?: string
  }
}

export interface Shift {
  id: number
  client_name: string
  role_needed: string
  start_time_utc: string
  end_time_utc: string
  capacity: number
  status: 'draft' | 'published' | 'filled' | 'completed' | 'cancelled'
  required_certification_id?: number
  required_certification?: {
    id: number
    name: string
  }
  location?: string
  notes?: string
  pay_rate?: number
  assignments?: Assignment[]
  created_at: string
  updated_at: string
}

export interface ShiftsResponse {
  status: 'success'
  data: Shift[]
  meta?: {
    total_count: number
    page: number
    per_page: number
  }
}

export interface ShiftResponse {
  status: 'success'
  data: Shift
}

// Get all shifts with optional filters
export const getShifts = async (params?: {
  status?: string
  start_date?: string
  end_date?: string
  role?: string
}): Promise<ShiftsResponse> => {
  const response = await api.get('/shifts', { params })
  return response.data
}

// Get single shift
export const getShift = async (id: number): Promise<ShiftResponse> => {
  const response = await api.get(`/shifts/${id}`)
  return response.data
}

// Create shift
export const createShift = async (data: Partial<Shift>): Promise<ShiftResponse> => {
  const response = await api.post('/shifts', { shift: data })
  return response.data
}

// Update shift
export const updateShift = async (id: number, data: Partial<Shift>): Promise<ShiftResponse> => {
  const response = await api.put(`/shifts/${id}`, { shift: data })
  return response.data
}

// Delete shift
export const deleteShift = async (id: number): Promise<void> => {
  await api.delete(`/shifts/${id}`)
}

// Assign worker to shift
export const assignWorker = async (shiftId: number, workerId: number) => {
  const response = await api.post('/assignments', {
    shift_id: shiftId,
    worker_id: workerId,
  })
  return response.data
}

// Unassign worker from shift
export const unassignWorker = async (assignmentId: number) => {
  await api.delete(`/assignments/${assignmentId}`)
}


