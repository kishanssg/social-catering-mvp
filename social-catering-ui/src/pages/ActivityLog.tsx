import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { Filter, Calendar, User, FileText, Clock } from 'lucide-react';

interface ActivityLogEntry {
  id: number;
  when: string;
  actor: string;
  entity_type: string;
  entity_id: number;
  entity_name?: string;
  action: string;
  summary: string;
  details: Record<string, any>;
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

  // Extract rich details from log entries
  const getRichDetails = (log: ActivityLogEntry) => {
    const details: any = {};
    
    // For assigned/unassigned worker actions
    if (log.action === 'assigned_worker' && log.after_json) {
      details.worker = log.after_json.worker_name || 'Unknown worker';
      details.shift = log.after_json.shift_name || 'Unknown shift';
      details.role = log.after_json.role || 'Unknown role';
      details.pay = log.after_json.hourly_rate ? `$${Number(log.after_json.hourly_rate)}/hr` : 'No rate';
    } else if (log.action === 'unassigned_worker' && log.before_json) {
      details.worker = log.before_json.worker_name || 'Unknown worker';
      details.shift = log.before_json.shift_name || 'Unknown shift';
      details.role = log.before_json.role || 'Unknown role';
    }
    
    // For worker creation/updates
    if (log.entity_type === 'Worker') {
      const data = log.after_json || log.before_json || {};
      if (data.first_name && data.last_name) {
        details.name = `${data.first_name} ${data.last_name}`;
      }
      if (data.email) details.email = data.email;
      if (data.phone) details.phone = data.phone;
      
      // Show skills differently for created vs updated
      if (log.action === 'created' && data.skills_json) {
        details.skills = Array.isArray(data.skills_json) 
          ? data.skills_json.join(', ') 
          : data.skills_json;
      } else if (log.action === 'updated' && log.after_json && log.before_json) {
        const beforeSkills = Array.isArray(log.before_json.skills_json) 
          ? log.before_json.skills_json 
          : JSON.parse(log.before_json.skills_json || '[]');
        const afterSkills = Array.isArray(log.after_json.skills_json) 
          ? log.after_json.skills_json 
          : JSON.parse(log.after_json.skills_json || '[]');
        
        const addedSkills = afterSkills.filter((s: string) => !beforeSkills.includes(s));
        const removedSkills = beforeSkills.filter((s: string) => !afterSkills.includes(s));
        
        if (addedSkills.length > 0) {
          details.skill_changes = `Added: ${addedSkills.join(', ')}`;
        }
        if (removedSkills.length > 0) {
          details.skill_changes = (details.skill_changes || '') + ` ${details.skill_changes ? '| Removed: ' : 'Removed: '}${removedSkills.join(', ')}`;
        }
      }
    }
    
    // For event creation/updates
    if (log.entity_type === 'Event' || log.entity_type === 'Shift') {
      const data = log.after_json || log.before_json || {};
      if (data.title) details.title = data.title;
      if (data.client_name) details.event = data.client_name;
      if (data.location) details.location = data.location;
      if (data.start_time_utc) {
        const date = new Date(data.start_time_utc);
        details.date = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        details.time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }
    
    return details;
  };

  const formatWhen = (timestamp: string) => {
    if (!timestamp) return '—';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return '—';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '—';
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // For older entries, show actual date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getDetailChips = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) return null;
    
    const order = ['worker_name', 'event_name', 'shift_name', 'role', 'pay_rate', 'email', 'phone'];
    const items = Object.entries(details)
      .filter(([k, v]) => {
        // Filter out technical fields and empty values
        return v != null && v !== '' && !k.includes('_id') && !k.includes('json') && !k.includes('Changes');
      })
      .sort((a, b) => {
        const aIdx = order.indexOf(a[0]);
        const bIdx = order.indexOf(b[0]);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });

    return items.map(([key, value]) => {
      const displayKey = key.replace(/_/g, ' ');
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return (
        <span
          key={key}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
        >
          <span className="font-medium capitalize">{displayKey}:</span> {displayValue}
        </span>
      );
    });
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
                            {log.summary || '—'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span className="capitalize">{log.entity_type}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimeAgo(log.when)}</span>
                            </div>
                          </div>
                          {/* Detail Chips */}
                          {Object.keys(log.details || {}).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {getDetailChips(log.details)}
                            </div>
                          )}
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

                      {/* Rich Detail Boxes */}
                      {(() => {
                        const details = getRichDetails(log);
                        const hasRichDetails = Object.keys(details).length > 0;
                        
                        if (!hasRichDetails) return null;
                        
                        return (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {/* Worker Box (Purple) */}
                            {details.worker && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 flex items-start gap-2">
                                <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-purple-700 text-xs font-bold">👤</span>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-purple-900">Worker</p>
                                  <p className="text-xs text-purple-700">{details.worker}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Shift Box (Blue) */}
                            {details.shift && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-start gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-700 text-xs font-bold">📅</span>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-blue-900">Event</p>
                                  <p className="text-xs text-blue-700">{details.shift}</p>
                                  {details.date && (
                                    <p className="text-xs text-blue-600">{details.date}</p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Role Box (Teal) */}
                            {details.role && (
                              <div className="bg-teal-50 border border-teal-200 rounded-lg p-2 flex items-start gap-2">
                                <div className="w-6 h-6 bg-teal-100 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-teal-700 text-xs font-bold">📋</span>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-teal-900">Role</p>
                                  <p className="text-xs text-teal-700">{details.role}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Pay Box (Green) */}
                            {details.pay && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-start gap-2">
                                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-green-700 text-xs font-bold">💰</span>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-green-900">Pay Rate</p>
                                  <p className="text-xs text-green-700 font-bold">{details.pay}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Worker Details (Name/Email/Phone) */}
                            {details.name && (
                              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 flex items-start gap-2">
                                <div className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-indigo-700 text-xs font-bold">👤</span>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-indigo-900">{details.name}</p>
                                  {details.email && (
                                    <p className="text-xs text-indigo-600">{details.email}</p>
                                  )}
                                  {details.phone && (
                                    <p className="text-xs text-indigo-600">{details.phone}</p>
                                  )}
                                  {details.skills && (
                                    <p className="text-xs text-indigo-500 mt-1">{details.skills}</p>
                                  )}
                                  {details.skill_changes && (
                                    <p className="text-xs text-indigo-600 font-semibold mt-1">
                                      Skills: {details.skill_changes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Event Details */}
                            {details.title && !details.shift && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
                                <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-amber-700 text-xs font-bold">🎉</span>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-amber-900">Event</p>
                                  <p className="text-xs text-amber-700">{details.title}</p>
                                  {details.location && (
                                    <p className="text-xs text-amber-600">{details.location}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Raw JSON hidden - showing meaningful details in color-coded boxes above */}
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

