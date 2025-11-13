import React from 'react';
import { Calendar } from 'lucide-react';
import { ActivityLog } from './utils/activityTypes';
import ActivityCard from './ActivityCard';
import { formatDateGroup } from './utils/activityHelpers';

interface TimelineGroupProps {
  date: string;
  activities: ActivityLog[];
  searchQuery?: string;
}

export default function TimelineGroup({ date, activities, searchQuery = '' }: TimelineGroupProps) {
  return (
    <div>
      {/* Date Header - Sticky */}
      <div className="sticky top-0 z-10 bg-gray-50 py-2 mb-4 -mx-4 px-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            {formatDateGroup(date)}
          </h3>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-500">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>
      </div>

      {/* Activities */}
      <div className="space-y-3 ml-6">
        {activities.map(activity => (
          <ActivityCard key={activity.id} activity={activity} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  );
}

