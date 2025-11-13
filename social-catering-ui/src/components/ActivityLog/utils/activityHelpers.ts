import { ActivityLogType, GroupedActivities, GroupedByEntity } from './activityTypes';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

/**
 * Group activities by date
 */
export function groupByDate(activities: ActivityLogType[]): GroupedActivities {
  const grouped: GroupedActivities = {};

  activities.forEach(activity => {
    const date = format(parseISO(activity.created_at), 'yyyy-MM-dd');
    
    if (!grouped[date]) {
      grouped[date] = [];
    }
    
    grouped[date].push(activity);
  });

  // Sort dates descending (newest first)
  const sortedGrouped: GroupedActivities = {};
  Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .forEach(date => {
      sortedGrouped[date] = grouped[date];
    });

  return sortedGrouped;
}

/**
 * Group activities by entity (Event or Worker)
 */
export function groupByEntity(activities: ActivityLogType[]): GroupedByEntity {
  const grouped: GroupedByEntity = {};

  activities.forEach(activity => {
    let entityKey: string;
    let entityName: string;
    let entityType: string;

    // Check for Assignment FIRST (before checking event_name which would group under Event)
    if (activity.entity_type === 'Assignment') {
      // For assignments, extract event name from all possible sources
      let eventName = activity.details?.event_name || 
                      activity.after_json?.event_name || 
                      activity.before_json?.event_name ||
                      activity.after_json?.shift_name || 
                      activity.before_json?.shift_name;
      
      // If still no event name, try to extract from summary text
      // Summary format: "Natalie assigned Charlie Williams to Wedding Reception as Server"
      if (!eventName && activity.summary) {
        const summaryMatch = activity.summary.match(/to\s+([^,\s]+(?:\s+[^,\s]+)*?)(?:\s+as|\s+\(|$|,)/i);
        if (summaryMatch && summaryMatch[1]) {
          eventName = summaryMatch[1].trim();
        }
      }
      
      // Extract worker name and role for better grouping
      const workerName = activity.details?.worker_name || 
                        activity.after_json?.worker_name || 
                        activity.before_json?.worker_name;
      const role = activity.details?.role || 
                  activity.after_json?.role || 
                  activity.before_json?.role ||
                  activity.after_json?.role_needed || 
                  activity.before_json?.role_needed;
      
      if (eventName && workerName && role) {
        // Format: "Assignment • {worker} — {event} ({role})"
        entityKey = `assignment-event-${eventName}-${workerName}`;
        entityName = `Assignment • ${workerName} — ${eventName} (${role})`;
        entityType = 'Assignment';
      } else if (eventName && workerName) {
        entityKey = `assignment-event-${eventName}-${workerName}`;
        entityName = `Assignment • ${workerName} — ${eventName}`;
        entityType = 'Assignment';
      } else if (eventName) {
        // Group by event name: "Assignment of [Event Name]"
        entityKey = `assignment-event-${eventName}`;
        entityName = `Assignment of ${eventName}`;
        entityType = 'Assignment';
      } else {
        // Fallback for assignments without event name
        entityKey = `assignment-${activity.entity_id}`;
        entityName = `Assignment #${activity.entity_id}`;
        entityType = 'Assignment';
      }
    } else if (activity.details?.event_name) {
      // Group events by event name
      entityKey = `event-${activity.details.event_id || activity.entity_id}`;
      entityName = activity.details.event_name;
      entityType = 'Event';
    } else if (activity.details?.worker_name) {
      // Group workers by worker name
      entityKey = `worker-${activity.details.worker_id || activity.entity_id}`;
      entityName = activity.details.worker_name;
      entityType = 'Worker';
    } else {
      // Fallback to entity type
      entityKey = `${activity.entity_type.toLowerCase()}-${activity.entity_id}`;
      entityName = `${activity.entity_type} #${activity.entity_id}`;
      entityType = activity.entity_type;
    }

    if (!grouped[entityKey]) {
      grouped[entityKey] = {
        type: entityType,
        name: entityName,
        activities: []
      };
    }

    grouped[entityKey].activities.push(activity);
  });

  // Sort by most recent activity
  const sortedGrouped: GroupedByEntity = {};
  Object.keys(grouped)
    .sort((a, b) => {
      const aLatest = grouped[a].activities[0]?.created_at || '';
      const bLatest = grouped[b].activities[0]?.created_at || '';
      return bLatest.localeCompare(aLatest);
    })
    .forEach(key => {
      sortedGrouped[key] = grouped[key];
    });

  return sortedGrouped;
}

/**
 * Format date for group header
 */
export function formatDateGroup(dateString: string): string {
  try {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return 'Today';
    }
    
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    
    if (isThisWeek(date)) {
      return format(date, 'EEEE'); // "Monday", "Tuesday", etc.
    }
    
    if (isThisMonth(date)) {
      return format(date, 'MMMM d'); // "November 10"
    }
    
    return format(date, 'MMMM d, yyyy'); // "November 10, 2025"
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Format relative time (e.g., "Just now", "42m ago", "2h ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Just now';
    }
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }
    
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    
    if (diffDays === 1) {
      return 'Yesterday';
    }
    
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    
    return format(date, 'MMM d');
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return dateString;
  }
}

/**
 * Format full date and time
 */
export function formatFullDateTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy, h:mm a'); // "Nov 12, 2025, 1:44 PM"
  } catch (error) {
    console.error('Error formatting full date time:', error);
    return dateString;
  }
}

/**
 * Search/filter activities
 */
export function filterActivities(
  activities: ActivityLogType[],
  searchQuery: string
): ActivityLogType[] {
  if (!searchQuery.trim()) {
    return activities;
  }

  const query = searchQuery.toLowerCase();

  return activities.filter(activity => {
    // Search in summary
    if (activity.summary.toLowerCase().includes(query)) {
      return true;
    }

    // Search in details
    if (activity.details) {
      if (activity.details.worker_name?.toLowerCase().includes(query)) {
        return true;
      }
      if (activity.details.event_name?.toLowerCase().includes(query)) {
        return true;
      }
      if (activity.details.role?.toLowerCase().includes(query)) {
        return true;
      }
    }

    // Search in actor name
    if (activity.actor_name.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });
}

/**
 * Extract worker names from summary (for short display)
 */
export function formatWorkerList(names: string[], maxDisplay: number = 3): string {
  if (names.length === 0) return '';
  
  if (names.length <= maxDisplay) {
    return names.join(', ');
  }
  
  const displayed = names.slice(0, maxDisplay);
  const remaining = names.length - maxDisplay;
  
  return `${displayed.join(', ')}, and ${remaining} more`;
}

/**
 * Calculate delta (change) with sign
 */
export function formatDelta(before: number, after: number, prefix: string = ''): string {
  const delta = after - before;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${prefix}${delta.toFixed(2)}`;
}

/**
 * Format money value
 */
export function formatMoney(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '$0.00';
  return `$${amount.toFixed(2)}`;
}

/**
 * Format hours
 */
export function formatHours(hours: number | undefined | null): string {
  if (hours === undefined || hours === null) return '0h';
  return `${hours.toFixed(1)}h`;
}

