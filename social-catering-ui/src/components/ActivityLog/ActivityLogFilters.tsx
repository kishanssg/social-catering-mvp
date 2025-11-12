import React from 'react';
import { Filter, RefreshCw, Calendar } from 'lucide-react';
import { FilterState } from './utils/activityTypes';

interface ActivityLogFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onRefresh: () => void;
}

export default function ActivityLogFilters({
  filters,
  onFiltersChange,
  onRefresh
}: ActivityLogFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Filter Icon */}
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Filter className="h-4 w-4" />
          <span className="text-sm">Filters:</span>
        </div>

        {/* Entity Type Filter */}
        <select
          value={filters.entityType}
          onChange={(e) => onFiltersChange({ ...filters, entityType: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="all">All Entity Types</option>
          <option value="Worker">Workers</option>
          <option value="Event">Events</option>
          <option value="Assignment">Assignments</option>
          <option value="Shift">Shifts</option>
        </select>

        {/* Action Filter */}
        <select
          value={filters.action}
          onChange={(e) => onFiltersChange({ ...filters, action: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="all">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="assigned_worker">Assigned</option>
          <option value="marked_no_show">No Show</option>
          <option value="hours_re_edited">Hours Edited</option>
          <option value="event_hours_approved_selected">Hours Approved</option>
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || null })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || null })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="ml-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}

