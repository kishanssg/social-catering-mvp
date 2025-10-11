import { useState } from 'react';
import type { AssignmentFilterParams } from '../../types';

interface AssignmentFiltersProps {
  filters: AssignmentFilterParams;
  onFilterChange: (filters: AssignmentFilterParams) => void;
}

export function AssignmentFilters({ filters, onFilterChange }: AssignmentFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStatusChange = (status: string) => {
    onFilterChange({ ...filters, status: status as any });
  };

  const handleTimeframeChange = (timeframe: string) => {
    onFilterChange({ ...filters, timeframe: timeframe as any });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {isExpanded ? 'Less' : 'More'} filters
            </button>
          </div>
        </div>

        {/* Quick filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusChange('')}
            className={`px-3 py-1 rounded-full text-sm ${
              !filters.status
                ? 'bg-primary-100 text-primary-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Status
          </button>
          <button
            onClick={() => handleStatusChange('assigned')}
            className={`px-3 py-1 rounded-full text-sm ${
              filters.status === 'assigned'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => handleStatusChange('completed')}
            className={`px-3 py-1 rounded-full text-sm ${
              filters.status === 'completed'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => handleStatusChange('no_show')}
            className={`px-3 py-1 rounded-full text-sm ${
              filters.status === 'no_show'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            No Shows
          </button>
        </div>

        {/* Expanded filters */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Timeframe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeframe
                </label>
                <select
                  value={filters.timeframe || ''}
                  onChange={(e) => handleTimeframeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All time</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="today">Today</option>
                  <option value="past">Past</option>
                </select>
              </div>

              {/* Worker ID (for future use) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Worker
                </label>
                <input
                  type="text"
                  placeholder="Worker ID (coming soon)"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
