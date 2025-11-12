import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import ActivityLogHeader from './ActivityLogHeader';
import ActivityLogFilters from './ActivityLogFilters';
import ViewToggle from './ViewToggle';
import ActivityCard from './ActivityCard';
import TimelineGroup from './TimelineGroup';
import EntityGroup from './EntityGroup';
import EmptyState from './EmptyState';
import { Loader2 } from 'lucide-react';
import { ActivityLog as ActivityLogType, ViewMode, FilterState } from './utils/activityTypes';
import { groupByDate, groupByEntity, filterActivities } from './utils/activityHelpers';

export default function ActivityLog() {
  // State
  const [activities, setActivities] = useState<ActivityLogType[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('chronological');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    entityType: 'all',
    action: 'all',
    dateFrom: null,
    dateTo: null,
    actor: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0
  });

  // Load activities
  useEffect(() => {
    loadActivities();
  }, [filters, pagination.page]);

  // Filter activities when search changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = filterActivities(activities, searchQuery);
      setFilteredActivities(filtered);
    } else {
      setFilteredActivities(activities);
    }
  }, [searchQuery, activities]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        per_page: pagination.perPage
      };

      if (filters.entityType !== 'all') params.entity_type = filters.entityType;
      if (filters.action !== 'all') params.log_action = filters.action;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.actor !== 'all') params.actor_user_id = filters.actor;

      const response = await apiClient.get('/activity_logs', { params });
      
      // Handle API response structure: { data: { activity_logs: [...], pagination: {...} }, status: "success" }
      const responseData = response.data.data || {};
      const logs = responseData.activity_logs || [];
      const paginationData = responseData.pagination || {};
      
      // Map logs to match our ActivityLog type
      // Backend returns: { id, when, actor, entity_type, entity_id, action, summary, details }
      const mappedLogs: ActivityLogType[] = logs.map((log: any) => ({
        id: log.id,
        actor_name: log.actor || log.actor_name || 'System',
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        summary: log.summary || '',
        details: log.details || log.details_json || null,
        created_at: log.when || log.created_at || log.created_at_utc,
        before_json: log.before_json || {},
        after_json: log.after_json || {}
      }));
      
      setActivities(mappedLogs);
      setFilteredActivities(mappedLogs);
      setPagination(prev => ({
        ...prev,
        total: paginationData.total_count || mappedLogs.length
      }));
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render helpers
  const renderChronologicalView = () => {
    const grouped = groupByDate(filteredActivities);
    
    return (
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, activities]) => (
          <TimelineGroup 
            key={date} 
            date={date} 
            activities={activities}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    );
  };

  const renderGroupedView = () => {
    const grouped = groupByEntity(filteredActivities);
    
    return (
      <div className="space-y-4">
        {Object.entries(grouped).map(([entityKey, data]) => (
          <EntityGroup
            key={entityKey}
            entityType={data.type}
            entityName={data.name}
            activities={data.activities}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    );
  };

  const hasFilters = filters.entityType !== 'all' || filters.action !== 'all' || filters.dateFrom || filters.dateTo;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <ActivityLogHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalLogs={pagination.total}
          showingLogs={filteredActivities.length}
        />

        {/* Filters */}
        <ActivityLogFilters
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={loadActivities}
        />

        {/* View Toggle */}
        <ViewToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <span className="ml-3 text-gray-600">Loading activities...</span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <EmptyState 
              searchQuery={searchQuery}
              hasFilters={hasFilters}
            />
          ) : (
            <>
              {viewMode === 'chronological' && renderChronologicalView()}
              {viewMode === 'grouped' && renderGroupedView()}
            </>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredActivities.length > 0 && (
          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.perPage + 1} to{' '}
              {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
              {pagination.total} activities
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page * pagination.perPage >= pagination.total}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

