import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { Filter, Calendar, User, FileText, Clock } from 'lucide-react';

interface ActivityLogEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  actor_user_id: number | null;
  actor_user: {
    id: number;
    email: string;
  } | null;
  before_json: any;
  after_json: any;
  created_at: string;
}

interface PaginationInfo {
  current_page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    per_page: 50,
    total_count: 0,
    total_pages: 0,
    has_next_page: false,
    has_prev_page: false,
  });

  // Filters
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const entityTypes = ['Worker', 'Shift', 'Assignment', 'Event', 'Skill'];
  const actionTypes = ['created', 'updated', 'deleted', 'assigned_worker', 'unassigned_worker'];

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        per_page: 50,
      };

      if (selectedEntityType) params.entity_type = selectedEntityType;
      if (selectedAction) params.log_action = selectedAction;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      console.log('Activity Log: Fetching logs with params:', params);
      const response = await apiClient.get('/activity_logs', { params });
      console.log('Activity Log: API response:', response.data);

      setLogs(response.data.data.activity_logs || []);
      setPagination(response.data.data.pagination || pagination);
      console.log('Activity Log: Loaded', response.data.data.activity_logs?.length || 0, 'logs');
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [selectedEntityType, selectedAction, dateFrom, dateTo]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-700';
      case 'updated':
        return 'bg-blue-100 text-blue-700';
      case 'deleted':
        return 'bg-red-100 text-red-700';
      case 'assigned_worker':
        return 'bg-purple-100 text-purple-700';
      case 'unassigned_worker':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return '+';
      case 'updated':
        return '✎';
      case 'deleted':
        return '×';
      case 'assigned_worker':
        return '→';
      case 'unassigned_worker':
        return '←';
      default:
        return '•';
    }
  };

  const getActionDescription = (log: ActivityLogEntry) => {
    const actor = log.actor_user?.email || 'System';
    const entityType = log.entity_type;
    const entityId = log.entity_id;

    switch (log.action) {
      case 'created':
        return `${actor} created ${entityType} #${entityId}`;
      case 'updated':
        return `${actor} updated ${entityType} #${entityId}`;
      case 'deleted':
        return `${actor} deleted ${entityType} #${entityId}`;
      case 'assigned_worker':
        return `${actor} assigned ${log.after_json?.worker_name || 'worker'} to ${log.after_json?.shift_name || 'shift'}`;
      case 'unassigned_worker':
        return `${actor} unassigned ${log.before_json?.worker_name || 'worker'} from ${log.before_json?.shift_name || 'shift'}`;
      default:
        return `${actor} performed ${log.action} on ${entityType} #${entityId}`;
    }
  };

  const clearFilters = () => {
    setSelectedEntityType('');
    setSelectedAction('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">Activity Log</h1>
          <p className="text-gray-600 mt-1">Track all actions and changes in the system</p>
        </div>

        {/* Filters */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            {/* Entity Type Filter */}
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-color focus:border-transparent"
            >
              <option value="">All Entity Types</option>
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-color focus:border-transparent"
            >
              <option value="">All Actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>

            {/* Date From */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-color focus:border-transparent"
                placeholder="From"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-color focus:border-transparent"
                placeholder="To"
              />
            </div>

            {/* Clear Filters */}
            {(selectedEntityType || selectedAction || dateFrom || dateTo) && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-color hover:text-primary-color/80 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-8 py-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">Total Logs:</span>
              <span className="font-semibold text-gray-900">{pagination.total_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">Showing:</span>
              <span className="font-semibold text-gray-900">
                {logs.length} of {pagination.total_count}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Log Table */}
        <div className="px-8 py-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-color"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No activity logs found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start gap-4">
                    {/* Action Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg ${getActionColor(
                        log.action
                      )}`}
                    >
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getActionDescription(log)}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{log.actor_user?.email || 'System'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(log.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>
                                {log.entity_type} #{log.entity_id}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Badge */}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      {/* Details (if available) */}
                      {(log.after_json || log.before_json) && (
                        <details className="mt-3 text-xs">
                          <summary className="cursor-pointer text-primary-color hover:text-primary-color/80 font-medium">
                            View Details
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                            {log.before_json && Object.keys(log.before_json).length > 0 && (
                              <div>
                                <span className="font-semibold text-gray-700">Before:</span>
                                <pre className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                                  {JSON.stringify(log.before_json, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after_json && Object.keys(log.after_json).length > 0 && (
                              <div>
                                <span className="font-semibold text-gray-700">After:</span>
                                <pre className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                                  {JSON.stringify(log.after_json, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Page {pagination.current_page} of {pagination.total_pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchLogs(pagination.current_page - 1)}
                  disabled={!pagination.has_prev_page}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchLogs(pagination.current_page + 1)}
                  disabled={!pagination.has_next_page}
                  className="px-4 py-2 bg-primary-color text-white rounded-lg text-sm font-medium hover:bg-primary-color/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

