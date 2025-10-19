import { apiClient } from '../lib/api';

export interface Shift {
  id: number;
  role_needed: string;
  start_time_utc: string;
  end_time_utc: string;
  location: string;
  staffing_progress: {
    assigned: number;
    required: number;
    percentage: number;
  };
}

export interface Assignment {
  id: number;
  worker: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  shift: Shift;
  event: {
    id: number;
    title: string;
    supervisor_name?: string;
  };
  hours_worked?: number;
  pay_rate?: number;
  total_pay?: number;
  status: string;
  is_completed: boolean;
}

export async function getStaffing(params?: {
  event_id?: number;
  worker_id?: number;
  status?: 'completed' | 'upcoming';
  start_date?: string;
  end_date?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (params) {
    if (params.event_id) queryParams.append('event_id', params.event_id.toString());
    if (params.worker_id) queryParams.append('worker_id', params.worker_id.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
  }
  
  const url = `/staffing${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  
  if (response.data.status === 'success') {
    return response.data.data as Assignment[];
  }
  
  throw new Error('Failed to fetch staffing');
}

export async function assignWorker(workerId: number, shiftId: number) {
  const response = await apiClient.post('/staffing', {
    staffing: {
      worker_id: workerId,
      shift_id: shiftId
    }
  });
  
  if (response.data.status === 'success') {
    return response.data.data;
  }
  
  throw new Error(response.data.errors?.join(', ') || 'Failed to assign worker');
}

export async function bulkAssignWorker(workerId: number, shiftIds: number[]) {
  const response = await apiClient.post('/staffing/bulk_create', {
    worker_id: workerId,
    shift_ids: shiftIds
  });
  
  if (response.data.status === 'success') {
    return response.data.data;
  }
  
  throw new Error('Failed to bulk assign worker');
}

export async function removeAssignment(assignmentId: number) {
  const response = await apiClient.delete(`/staffing/${assignmentId}`);
  
  if (response.data.status === 'success') {
    return true;
  }
  
  throw new Error('Failed to remove assignment');
}

export async function updateAssignment(assignmentId: number, updates: {
  hours_worked?: number;
  status?: string;
  notes?: string;
}) {
  const response = await apiClient.patch(`/staffing/${assignmentId}`, {
    staffing: updates
  });
  
  if (response.data.status === 'success') {
    return response.data.data;
  }
  
  throw new Error('Failed to update assignment');
}
