export interface EventSkillRequirement {
  id?: number;
  skill_name: string;
  needed_workers: number;
  description?: string;
  uniform_name?: string;
  certification_name?: string;
  pay_rate?: number;
}

export interface EventSchedule {
  start_time_utc: string;
  end_time_utc: string;
  break_minutes: number;
}

export interface Shift {
  id: number;
  role_needed: string;
  capacity: number;
  start_time_utc: string;
  end_time_utc: string;
  status: string;
  staffing_progress: {
    assigned: number;
    required: number;
    percentage: number;
  };
  fully_staffed: boolean;
  assignments: Assignment[];
}

export interface Assignment {
  id: number;
  worker: {
    id: number;
    first_name: string;
    last_name: string;
  };
  hours_worked?: number;
  status: string;
}

export interface ShiftsByRole {
  role_name: string;
  total_shifts: number;
  filled_shifts: number;
  shifts: Shift[];
}

export interface Event {
  id: number;
  title: string;
  status: string;
  staffing_status: string;
  venue_id?: number;
  venue: {
    id: number;
    name: string;
    formatted_address: string;
  } | null;
  schedule: {
    start_time_utc: string;
    end_time_utc: string;
    break_minutes: number;
  } | null;
  total_workers_needed: number;
  assigned_workers_count: number;
  unfilled_roles_count: number;
  staffing_percentage: number;
  staffing_summary: string;
  shifts_count: number;
  shifts_by_role?: ShiftsByRole[];
  created_at: string;
  published_at?: string;
  check_in_instructions?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  skill_requirements?: EventSkillRequirement[];
}

import { apiClient } from '../lib/api';

export interface EventDetail extends Event {
  skill_requirements: Array<{
    id: number;
    skill_name: string;
    needed_workers: number;
    description?: string;
    uniform_name?: string;
    certification_name?: string;
    pay_rate?: number;
  }>;
  check_in_instructions?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  shifts: Array<{
    id: number;
    role_needed: string;
    status: string;
    staffing_progress: {
      assigned: number;
      required: number;
      percentage: number;
    };
    start_time_utc: string;
    end_time_utc: string;
    assignments_count: number;
  }>;
}

export async function getEvents(status?: 'draft' | 'published' | 'completed') {
  const url = status ? `/events?status=${status}` : '/events';
  const response = await apiClient.get(url);
  
  if (response.data.status === 'success') {
    return response.data.data as Event[];
  }
  
  throw new Error('Failed to fetch events');
}

export async function getEvent(id: number | string) {
  const response = await apiClient.get(`/events/${id}`);
  
  if (response.data.status === 'success') {
    return response.data.data as EventDetail;
  }
  
  throw new Error('Failed to fetch event');
}

export async function createEvent(eventData: any) {
  // Backend expects auto_publish at top-level (params[:auto_publish])
  const { auto_publish, ...event } = eventData || {};
  const payload: any = { event };
  if (typeof auto_publish !== 'undefined') {
    // Backend checks params[:auto_publish] == 'true'
    payload.auto_publish = String(Boolean(auto_publish));
  }

  try {
    const response = await apiClient.post('/events', payload);

    if (response.data.status === 'success') {
      return response.data.data;
    }

    const backendErrors = response.data?.errors;
    throw new Error(Array.isArray(backendErrors) ? backendErrors.join(', ') : (response.data?.message || 'Failed to create event'));
  } catch (err: any) {
    const data = err?.response?.data;
    // Prefer detailed backend messages when available
    const details = Array.isArray(data?.errors) ? data.errors.join(', ') : undefined;
    const message = data?.message || details || err?.message || 'Failed to create event';
    throw new Error(message);
  }
}

export async function updateEvent(id: number | string, eventData: any) {
  try {
    const response = await apiClient.patch(`/events/${id}`, { event: eventData });

    if (response.data.status === 'success') {
      return response.data.data;
    }

    const backendErrors = response.data?.errors;
    throw new Error(Array.isArray(backendErrors) ? backendErrors.join(', ') : (response.data?.message || 'Failed to update event'));
  } catch (err: any) {
    const data = err?.response?.data;
    const details = Array.isArray(data?.errors) ? data.errors.join(', ') : undefined;
    const message = data?.message || details || err?.message || 'Failed to update event';
    throw new Error(message);
  }
}

export async function publishEvent(id: number | string) {
  const response = await apiClient.post(`/events/${id}/publish`);
  
  if (response.data.status === 'success') {
    return response.data;
  }
  
  throw new Error(response.data.message || 'Failed to publish event');
}

export async function deleteEvent(id: number | string) {
  const response = await apiClient.delete(`/events/${id}`);
  
  if (response.data.status === 'success') {
    return {
      success: true,
      event_id: response.data.event_id,
      event_title: response.data.event_title
    };
  }
  
  throw new Error(response.data.message || 'Failed to delete event');
}

export async function restoreEvent(id: number | string) {
  const response = await apiClient.post(`/events/${id}/restore`);
  
  if (response.data.status === 'success') {
    return response.data.data;
  }
  
  throw new Error(response.data.message || 'Failed to restore event');
}
