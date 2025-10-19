// User types
export interface User {
  id: number;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// Worker types
export interface Worker {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  skills_json: string[];
  skills_text: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  certifications?: Certification[];
}

// Certification types
export interface Certification {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkerCertification {
  id: number;
  worker_id: number;
  cert_id: number;
  expires_at_utc: string;
  created_at: string;
  updated_at: string;
  certification?: Certification;
}

// Location types
export interface Location {
  id: number;
  name: string;
  address?: string;
  city: string;
  state: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  full_address: string;
  display_name: string;
}

// Skill types
export interface Skill {
  id: number;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Shift types
export interface Shift {
  id: number;
  client_name: string;
  role_needed: string;
  location?: string;
  location_id?: number;
  start_time_utc: string;
  end_time_utc: string;
  pay_rate?: string | number;
  capacity: number;
  status: 'draft' | 'published' | 'archived';
  notes?: string;
  required_cert_id?: number;
  created_by_id?: number;
  created_at: string;
  updated_at: string;
  assignments?: Assignment[];
  workers?: Worker[];
  created_by?: User;
  required_certification?: Certification;
  location?: Location;
  assigned_count?: number;
  available_slots?: number;
  duration_hours?: number;
}

// Assignment types
export interface Assignment {
  id: number;
  shift_id: number;
  worker_id: number;
  assigned_by: number;
  assigned_at_utc: string;
  status: 'assigned' | 'confirmed' | 'completed' | 'cancelled';
  hours_worked?: number;
  hourly_rate?: number;
  total_pay?: number;
  created_at: string;
  updated_at: string;
  shift?: Shift;
  worker?: Worker;
  assigned_by_user?: User;
}

// Activity Log types
export interface ActivityLog {
  id: number;
  actor_user_id?: number;
  entity_type: string;
  entity_id: number;
  action: string;
  before_json?: Record<string, any>;
  after_json?: Record<string, any>;
  created_at_utc: string;
  actor_user?: User;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  status: 'success' | 'error' | 'validation_error';
  error?: string;
  errors?: Record<string, string[]>;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

// Dashboard types
export interface DashboardStats {
  total_shifts: number;
  published_shifts: number;
  assigned_shifts: number;
  completed_shifts: number;
  total_workers: number;
  active_workers: number;
  total_assignments: number;
  pending_assignments: number;
}

// Search and Filter types
export interface WorkerSearchParams {
  query?: string;
  availability?: boolean;
  skills?: string[];
  certifications?: number[];
  page?: number;
  per_page?: number;
}

export interface ShiftFilterParams {
  status?: string;
  start_date?: string;
  end_date?: string;
  fill_status?: 'all' | 'available' | 'full';
  page?: number;
  per_page?: number;
}

export interface ActivityLogFilterParams {
  entity_type?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface AssignmentFilterParams {
  status?: 'assigned' | 'completed' | 'no_show' | 'cancelled';
  worker_id?: number;
  shift_id?: number;
  timeframe?: 'past' | 'today' | 'upcoming';
  page?: number;
  per_page?: number;
}
