import api from './api';

export interface Assignment {
  id: number;
  worker_id: number;
  shift_id: number;
  status: 'assigned' | 'completed' | 'no_show' | 'cancelled';
  assigned_at_utc: string;
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
}): Promise<AssignmentsResponse> => {
  const response = await api.get('/assignments', { params });
  return response.data;
};

// Get single assignment
export const getAssignment = async (id: number): Promise<AssignmentResponse> => {
  const response = await api.get(`/assignments/${id}`);
  return response.data;
};

// Update assignment status
export const updateAssignmentStatus = async (
  id: number,
  status: 'assigned' | 'completed' | 'no_show' | 'cancelled'
): Promise<AssignmentResponse> => {
  const response = await api.put(`/assignments/${id}`, {
    assignment: { status }
  });
  return response.data;
};

// Delete assignment (unassign)
export const deleteAssignment = async (id: number): Promise<void> => {
  await api.delete(`/assignments/${id}`);
};
