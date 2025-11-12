import React from 'react';
import { ExternalLink, User, Calendar, DollarSign, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityLog } from './utils/activityTypes';
import { formatFullDateTime } from '../../utils/dateUtils';

interface ActivityCardExpandedProps {
  activity: ActivityLog;
}

export default function ActivityCardExpanded({ activity }: ActivityCardExpandedProps) {
  const navigate = useNavigate();

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
        Full Details
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {/* Actor */}
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs text-gray-500">Action by</div>
            <div className="font-medium text-gray-900">{activity.actor_name}</div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs text-gray-500">Timestamp</div>
            <div className="font-medium text-gray-900">{formatFullDateTime(activity.created_at)}</div>
          </div>
        </div>

        {/* Worker (if applicable) */}
        {activity.details?.worker_name && (
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs text-gray-500">Worker</div>
              {activity.details.worker_id ? (
                <button
                  onClick={() => navigate(`/workers/${activity.details?.worker_id}`)}
                  className="font-medium text-teal-600 hover:underline flex items-center gap-1"
                >
                  {activity.details.worker_name}
                  <ExternalLink className="h-3 w-3" />
                </button>
              ) : (
                <div className="font-medium text-gray-900">{activity.details.worker_name}</div>
              )}
            </div>
          </div>
        )}

        {/* Event (if applicable) */}
        {activity.details?.event_name && (
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs text-gray-500">Event</div>
              {activity.details.event_id ? (
                <button
                  onClick={() => navigate(`/events/${activity.details?.event_id}`)}
                  className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                >
                  {activity.details.event_name}
                  <ExternalLink className="h-3 w-3" />
                </button>
              ) : (
                <div className="font-medium text-gray-900">{activity.details.event_name}</div>
              )}
            </div>
          </div>
        )}

        {/* Hours (if changed) */}
        {activity.details?.before_hours !== undefined && activity.details?.after_hours !== undefined && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Hours</div>
              <div className="font-medium text-gray-900">
                {activity.details.before_hours.toFixed(1)}h → {activity.details.after_hours.toFixed(1)}h
                <span className="text-xs text-gray-500 ml-1">
                  ({activity.details.after_hours - activity.details.before_hours > 0 ? '+' : ''}
                  {(activity.details.after_hours - activity.details.before_hours).toFixed(1)}h)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pay (if changed) */}
        {activity.details?.before_pay !== undefined && activity.details?.after_pay !== undefined && (
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Pay</div>
              <div className="font-medium text-gray-900">
                ${activity.details.before_pay.toFixed(2)} → ${activity.details.after_pay.toFixed(2)}
                <span className="text-xs text-gray-500 ml-1">
                  ({activity.details.after_pay - activity.details.before_pay > 0 ? '+' : ''}
                  ${(activity.details.after_pay - activity.details.before_pay).toFixed(2)})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Rate (if changed) */}
        {activity.details?.before_rate !== undefined && activity.details?.after_rate !== undefined && (
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Hourly Rate</div>
              <div className="font-medium text-gray-900">
                ${activity.details.before_rate.toFixed(2)}/h → ${activity.details.after_rate.toFixed(2)}/h
              </div>
            </div>
          </div>
        )}

        {/* Role (if applicable) */}
        {activity.details?.role && (
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Role</div>
              <div className="font-medium text-gray-900">{activity.details.role}</div>
            </div>
          </div>
        )}
      </div>

      {/* Raw JSON (for debugging - optional) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-3">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            View raw data (dev only)
          </summary>
          <pre className="mt-2 p-2 bg-gray-900 text-green-400 text-xs rounded overflow-auto max-h-48">
            {JSON.stringify({ before: activity.before_json, after: activity.after_json }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

