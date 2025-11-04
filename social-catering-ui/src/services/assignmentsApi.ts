import { apiClient } from '../lib/api';

export interface Assignment {
  id: number;
  worker_id: number;
  shift_id: number;
  status: 'assigned' | 'confirmed' | 'completed' | 'cancelled';
  assigned_at_utc: string;
  hours_worked?: number;
  hourly_rate?: number;
  total_pay?: number;
  worker: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  shift: {
    id: number;
    client_name: string;
    role_needed: string;
    start_time_utc: string;
    end_time_utc: string;
    location?: string;
    status: string;
    pay_rate?: number;
    capacity: number;
    assigned_count?: number;
    available_slots?: number;
  };
  assigned_by?: {
    id: number;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AssignmentsResponse {
  status: 'success';
  data: {
    assignments: Assignment[];
  };
}

export interface AssignmentResponse {
  status: 'success';
  data: {
    assignment: Assignment;
  };
}

// Get all assignments with optional filters
export const getAssignments = async (params?: {
  worker_id?: number;
  shift_id?: number;
  status?: string;
  timeframe?: 'past' | 'today' | 'upcoming';
  start_date?: string;
  end_date?: string;
}): Promise<AssignmentsResponse> => {
  const response = await apiClient.get('/assignments', { params });
  return response.data;
};

// Get single assignment
export const getAssignment = async (id: number): Promise<AssignmentResponse> => {
  const response = await apiClient.get(`/assignments/${id}`);
  return response.data;
};

// Update assignment
export const updateAssignment = async (
  id: number,
  data: {
    status?: 'assigned' | 'confirmed' | 'completed' | 'cancelled';
    hours_worked?: number;
    hourly_rate?: number;
  }
): Promise<AssignmentResponse> => {
  const response = await apiClient.put(`/assignments/${id}`, {
    assignment: data
  });
  return response.data;
};

// Update assignment status (backward compatibility)
export const updateAssignmentStatus = async (
  id: number,
  status: 'assigned' | 'confirmed' | 'completed' | 'cancelled'
): Promise<AssignmentResponse> => {
  return updateAssignment(id, { status });
};

// Delete assignment (unassign)
export const deleteAssignment = async (id: number): Promise<void> => {
  await apiClient.delete(`/assignments/${id}`);
};
