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
  // Quick filter presets
  const quickFilters = [
    { label: 'All', action: 'all', entityType: 'all' },
    { label: 'Approvals', action: 'event_hours_approved_selected', entityType: 'all' },
    { label: 'Edits', action: 'hours_re_edited', entityType: 'Assignment' },
    { label: 'No-Shows', action: 'marked_no_show', entityType: 'Assignment' },
    { label: 'Recalculations', action: 'totals_recalculated', entityType: 'Event' }
  ];

  const handleQuickFilter = (preset: typeof quickFilters[0]) => {
    if (preset.label === 'All') {
      // Reset all filters
      onFiltersChange({
        entityType: 'all',
        action: 'all',
        dateFrom: null,
        dateTo: null,
        actor: 'all'
      });
    } else {
      onFiltersChange({
        ...filters,
        action: preset.action,
        entityType: preset.entityType
      });
    }
  };

  // Get timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Quick filters:</span>
        {quickFilters.map((preset) => {
          const isActive = filters.action === preset.action && filters.entityType === preset.entityType;
          return (
            <button
              key={preset.label}
              onClick={() => handleQuickFilter(preset)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${isActive 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Timezone Label */}
      <div className="mb-4 text-xs text-gray-500">
        Times shown in {timezone}
      </div>

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

