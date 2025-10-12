import { useState } from 'react';
import { 
  Filter, Clock, User, FileText, 
  Plus, Edit, Trash2, Eye, Calendar
} from 'lucide-react';
import { useActivityLogs } from '../hooks/useActivityLogs';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';

const ActivityLogsPage = () => {
  const [filters, setFilters] = useState({
    entity_type: '',
    log_action: '',
    actor_user_id: undefined as number | undefined,
    page: 1,
    per_page: 20,
    date_from: '',
    date_to: '',
    date_preset: '', // 'today', 'yesterday', 'this_week', 'last_week', 'custom'
  });

  const { logs, loading, error, pagination, refetch } = useActivityLogs(filters);

  // Date preset helpers
  const getDatePreset = (preset: string) => {
    const today = new Date();
    
    switch (preset) {
      case 'today':
        return {
          date_from: format(startOfDay(today), 'yyyy-MM-dd'),
          date_to: format(endOfDay(today), 'yyyy-MM-dd'),
        };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return {
          date_from: format(startOfDay(yesterday), 'yyyy-MM-dd'),
          date_to: format(endOfDay(yesterday), 'yyyy-MM-dd'),
        };
      case 'this_week':
        const startOfWeek = subDays(today, today.getDay());
        return {
          date_from: format(startOfDay(startOfWeek), 'yyyy-MM-dd'),
          date_to: format(endOfDay(today), 'yyyy-MM-dd'),
        };
      case 'last_week':
        const lastWeekStart = subDays(today, today.getDay() + 7);
        const lastWeekEnd = subDays(today, today.getDay() + 1);
        return {
          date_from: format(startOfDay(lastWeekStart), 'yyyy-MM-dd'),
          date_to: format(endOfDay(lastWeekEnd), 'yyyy-MM-dd'),
        };
      default:
        return { date_from: '', date_to: '' };
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'destroyed':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'destroyed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeIcon = (entityType: string) => {
    switch (entityType) {
      case 'Worker':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'Shift':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'Assignment':
        return <FileText className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatLogDescription = (log: any) => {
    const { entity_type, action, actor_user } = log;
    const actor = actor_user?.email || 'System';
    
    switch (action) {
      case 'created':
        return `${actor} created ${entity_type} #${log.entity_id}`;
      case 'updated':
        return `${actor} updated ${entity_type} #${log.entity_id}`;
      case 'destroyed':
        return `${actor} deleted ${entity_type} #${log.entity_id}`;
      default:
        return `${actor} performed ${action} on ${entity_type} #${log.entity_id}`;
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value,
        page: 1, // Reset to first page when filters change
      };

      // Handle date preset changes
      if (key === 'date_preset') {
        if (value === 'custom') {
          // Keep existing date_from and date_to when switching to custom
          return newFilters;
        } else if (value === '') {
          // Clear all date filters
          return {
            ...newFilters,
            date_from: '',
            date_to: '',
          };
        } else {
          // Apply preset dates
          const presetDates = getDatePreset(value);
          return {
            ...newFilters,
            date_from: presetDates.date_from,
            date_to: presetDates.date_to,
          };
        }
      }

      return newFilters;
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const clearFilters = () => {
    setFilters({
      entity_type: '',
      log_action: '',
      actor_user_id: undefined,
      page: 1,
      per_page: 20,
      date_from: '',
      date_to: '',
      date_preset: '',
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-600 mt-1">
            Track all changes and actions in the system
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {pagination && `${pagination.total_count} total logs`}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
          {/* Active Date Range Indicator */}
          {(filters.date_from || filters.date_to) && (
            <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg">
              {filters.date_preset === 'custom' ? (
                <>
                  {filters.date_from && filters.date_to ? (
                    <>📅 {filters.date_from} to {filters.date_to}</>
                  ) : filters.date_from ? (
                    <>📅 From {filters.date_from}</>
                  ) : filters.date_to ? (
                    <>📅 Until {filters.date_to}</>
                  ) : null}
                </>
              ) : (
                <>📅 {filters.date_preset?.charAt(0).toUpperCase() + filters.date_preset?.slice(1)}</>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Preset Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Date Range
            </label>
            <select
              value={filters.date_preset}
              onChange={(e) => handleFilterChange('date_preset', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date From */}
          {filters.date_preset === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Custom Date To */}
          {filters.date_preset === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Entity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select
              value={filters.entity_type}
              onChange={(e) => handleFilterChange('entity_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="Worker">Worker</option>
              <option value="Shift">Shift</option>
              <option value="Assignment">Assignment</option>
              <option value="User">User</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={filters.log_action}
              onChange={(e) => handleFilterChange('log_action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="destroyed">Deleted</option>
            </select>
          </div>

          {/* Per Page Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per Page
            </label>
            <select
              value={filters.per_page}
              onChange={(e) => handleFilterChange('per_page', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Logs List */}
      <div className="bg-white rounded-lg shadow">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity logs found</h3>
            <p className="text-gray-600">
              {Object.values(filters).some(f => f && f !== '') 
                ? 'Try adjusting your filters to see more results.'
                : 'Activity logs will appear here as users perform actions.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Action Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(log.action)}
                  </div>

                  {/* Log Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Entity Type Icon */}
                      <div className="flex items-center gap-2">
                        {getEntityTypeIcon(log.entity_type)}
                        <span className="text-sm font-medium text-gray-900">
                          {log.entity_type}
                        </span>
                      </div>

                      {/* Action Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>

                      {/* Entity ID */}
                      <span className="text-sm text-gray-500">
                        #{log.entity_id}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 mb-2">
                      {formatLogDescription(log)}
                    </p>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {log.created_at_utc ? format(parseISO(log.created_at_utc), 'MMM d, yyyy h:mm a') : 'Unknown date'}
                      </span>
                      {log.actor_user && (
                        <>
                          <span>•</span>
                          <span>by {log.actor_user.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                {Math.min(pagination.current_page * pagination.per_page, pagination.total_count)} of{' '}
                {pagination.total_count} results
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={!pagination.has_prev_page}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={!pagination.has_next_page}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogsPage;
