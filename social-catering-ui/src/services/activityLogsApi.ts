import api from './api';

export interface ActivityLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  actor_user_id?: number;
  actor_user?: {
    id: number;
    email: string;
  };
  before_json?: any;
  after_json?: any;
  created_at_utc: string;
}

export interface ActivityLogsResponse {
  status: 'success';
  data: {
    activity_logs: ActivityLog[];
    pagination: {
      current_page: number;
      per_page: number;
      total_count: number;
      total_pages: number;
      has_next_page: boolean;
      has_prev_page: boolean;
    };
  };
}

// Get all activity logs with optional filters
export const getActivityLogs = async (params?: {
  entity_type?: string;
  log_action?: string;
  actor_user_id?: number;
  page?: number;
  per_page?: number;
}): Promise<ActivityLogsResponse> => {
  const response = await api.get('/activity_logs', { params });
  return response.data;
};
