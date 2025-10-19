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
  const response = await apiClient.post('/events', { event: eventData });
  
  if (response.data.status === 'success') {
    return response.data.data;
  }
  
  throw new Error(response.data.errors?.join(', ') || 'Failed to create event');
}

export async function updateEvent(id: number | string, eventData: any) {
  const response = await apiClient.patch(`/events/${id}`, { event: eventData });
  
  if (response.data.status === 'success') {
    return response.data.data;
  }
  
  throw new Error(response.data.errors?.join(', ') || 'Failed to update event');
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
    return true;
  }
  
  throw new Error(response.data.message || 'Failed to delete event');
}
