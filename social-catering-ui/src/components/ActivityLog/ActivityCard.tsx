import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ActivityLog } from './utils/activityTypes';
import { getActivityIcon } from './utils/activityIcons';
import { formatRelativeTime, formatFullDateTime } from '../../utils/dateUtils';
import { cn } from '../../lib/utils';
import ActivityCardExpanded from './ActivityCardExpanded';

interface ActivityCardProps {
  activity: ActivityLog;
  searchQuery?: string;
}

export default function ActivityCard({ activity, searchQuery = '' }: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const { icon: Icon, bgColor, textColor, borderColor } = getActivityIcon(activity.action);

  // Parse summary to make entities clickable and highlight search
  const renderSummary = () => {
    let summary = activity.summary;
    const details = activity.details;
    const query = searchQuery.trim();
    
    // Step 1: Make worker names clickable first (before highlighting)
    if (details?.worker_name) {
      const workerName = details.worker_name;
      const workerRegex = new RegExp(`\\b${workerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      summary = summary.replace(
        workerRegex,
        `<span class="font-semibold text-teal-600 hover:underline cursor-pointer" data-worker-id="${details.worker_id || ''}">${workerName}</span>`
      );
    }

    // Step 2: Make event names clickable (before highlighting)
    if (details?.event_name) {
      const eventName = details.event_name;
      const eventRegex = new RegExp(`\\b${eventName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      summary = summary.replace(
        eventRegex,
        `<span class="font-semibold text-blue-600 hover:underline cursor-pointer" data-event-id="${details.event_id || ''}">${eventName}</span>`
      );
    }

    // Step 3: Highlight search matches (works on plain text and preserves HTML tags)
    let rendered = summary;
    if (query) {
      // Split by HTML tags, highlight text nodes, then reassemble
      const parts = rendered.split(/(<[^>]+>)/);
      rendered = parts.map((part, index) => {
        // Skip HTML tags
        if (part.startsWith('<')) return part;
        
        // Highlight text content
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return part.replace(regex, '<mark class="bg-yellow-200 font-semibold">$1</mark>');
      }).join('');
    }

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: rendered }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.dataset.workerId) {
            navigate(`/workers/${target.dataset.workerId}`);
          } else if (target.dataset.eventId) {
            navigate(`/events/${target.dataset.eventId}`);
          }
        }}
      />
    );
  };

  return (
    <div className={cn(
      "bg-white rounded-lg shadow-sm border-l-4 hover:shadow-md transition-all duration-200",
      borderColor
    )}>
      {/* Main Card Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn("flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center", bgColor)}>
            <Icon className={cn("h-5 w-5", textColor)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Summary */}
            <div className="text-sm text-gray-900 mb-2">
              {renderSummary()}
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded">
                {activity.entity_type}
              </span>
              <span title={formatFullDateTime(activity.created_at)}>
                {formatRelativeTime(activity.created_at)}
              </span>
              <span className="hidden sm:inline">
                {formatFullDateTime(activity.created_at)}
              </span>
            </div>

            {/* Detail Chips */}
            {activity.details && Object.keys(activity.details).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activity.details.worker_name && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 text-teal-700 rounded text-xs">
                    <span className="font-medium">Worker:</span>
                    <span>{activity.details.worker_name}</span>
                  </div>
                )}
                {activity.details.event_name && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    <span className="font-medium">Event:</span>
                    <span>{activity.details.event_name}</span>
                  </div>
                )}
                {activity.details.role && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                    <span className="font-medium">Role:</span>
                    <span>{activity.details.role}</span>
                  </div>
                )}
                {activity.details.before_pay !== undefined && activity.details.after_pay !== undefined && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                    <span className="font-medium">Pay:</span>
                    <span>${activity.details.before_pay.toFixed(2)} → ${activity.details.after_pay.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <ActivityCardExpanded activity={activity} />
      )}
    </div>
  );
}

