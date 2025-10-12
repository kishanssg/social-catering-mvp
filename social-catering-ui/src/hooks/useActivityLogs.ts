import { useState, useEffect } from 'react';
import { getActivityLogs } from '../services/activityLogsApi';
import type { ActivityLog } from '../services/activityLogsApi';

interface UseActivityLogsParams {
  entity_type?: string;
  log_action?: string;
  actor_user_id?: number;
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
}

interface UseActivityLogsReturn {
  logs: ActivityLog[];
  loading: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  } | null;
  refetch: () => void;
}

export const useActivityLogs = (params?: UseActivityLogsParams): UseActivityLogsReturn => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseActivityLogsReturn['pagination']>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getActivityLogs(params);
      
      if (response.status === 'success') {
        setLogs(response.data.activity_logs);
        setPagination(response.data.pagination);
      } else {
        setError('Failed to fetch activity logs');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load activity logs');
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  return { logs, loading, error, pagination, refetch: fetchLogs };
};
