// Activity Log Types

export interface ActivityLogType {
  id: number;
  actor_name: string;
  entity_type: string;
  entity_id: number;
  action: string;
  summary: string;
  details: ActivityDetails | null;
  created_at: string;
  before_json: Record<string, any>;
  after_json: Record<string, any>;
}

// Alias for backward compatibility
export type ActivityLog = ActivityLogType;

export interface ActivityDetails {
  worker_name?: string;
  worker_id?: number;
  event_name?: string;
  event_id?: number;
  role?: string;
  before_hours?: number;
  after_hours?: number;
  before_pay?: number;
  after_pay?: number;
  before_rate?: number;
  after_rate?: number;
  worker_count?: number;
  worker_names?: string[];
}

export type ViewMode = 'chronological' | 'grouped';

export interface FilterState {
  entityType: string;
  action: string;
  dateFrom: string | null;
  dateTo: string | null;
  actor: string;
}

export interface GroupedActivities {
  [key: string]: ActivityLogType[];
}

export interface EntityGroupData {
  type: string;
  name: string;
  activities: ActivityLogType[];
}

export interface GroupedByEntity {
  [key: string]: EntityGroupData;
}

