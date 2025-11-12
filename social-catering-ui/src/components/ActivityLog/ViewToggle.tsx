import React from 'react';
import { List, Layers } from 'lucide-react';
import { ViewMode } from './utils/activityTypes';
import { cn } from '../../lib/utils';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">View:</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('chronological')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              viewMode === 'chronological'
                ? "bg-white text-teal-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <List className="h-4 w-4" />
            Chronological
          </button>
          <button
            onClick={() => onViewModeChange('grouped')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              viewMode === 'grouped'
                ? "bg-white text-teal-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Layers className="h-4 w-4" />
            Grouped by Entity
          </button>
        </div>
      </div>
    </div>
  );
}

