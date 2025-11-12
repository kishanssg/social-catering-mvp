import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, User } from 'lucide-react';
import { ActivityLog } from './utils/activityTypes';
import ActivityCard from './ActivityCard';
import { cn } from '../../lib/utils';

interface EntityGroupProps {
  entityType: string;
  entityName: string;
  activities: ActivityLog[];
  searchQuery?: string;
}

export default function EntityGroup({ entityType, entityName, activities, searchQuery = '' }: EntityGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getEntityIcon = () => {
    switch (entityType) {
      case 'Event':
        return Calendar;
      case 'Worker':
        return User;
      default:
        return Calendar;
    }
  };

  const getEntityColor = () => {
    switch (entityType) {
      case 'Event':
        return 'text-blue-600 bg-blue-50';
      case 'Worker':
        return 'text-teal-600 bg-teal-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const Icon = getEntityIcon();
  const colorClass = getEntityColor();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}

        {/* Entity Icon */}
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Entity Name */}
        <div className="flex-1 text-left">
          <div className="font-semibold text-gray-900">{entityName}</div>
          <div className="text-xs text-gray-500">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </div>
        </div>

        {/* Entity Type Badge */}
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
          {entityType}
        </span>
      </button>

      {/* Expanded Activities */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
          {activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
}

