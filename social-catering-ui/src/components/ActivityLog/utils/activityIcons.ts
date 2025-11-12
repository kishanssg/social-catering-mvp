import {
  CheckCircle,
  Edit2,
  UserPlus,
  UserMinus,
  XCircle,
  Calculator,
  AlertCircle,
  Trash2,
  RotateCcw,
  Lock,
  Unlock,
  DollarSign,
  Clock,
  FileText
} from 'lucide-react';

export interface ActivityIconConfig {
  icon: any;
  bgColor: string;
  textColor: string;
  borderColor: string;
  label: string;
}

/**
 * Get icon configuration for activity action
 */
export function getActivityIcon(action: string): ActivityIconConfig {
  const configs: Record<string, ActivityIconConfig> = {
    // Approvals (Green)
    'event_hours_approved_selected': {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-500',
      label: 'Hours Approved'
    },
    'event_hours_approved': {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-500',
      label: 'All Hours Approved'
    },
    'approved': {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-500',
      label: 'Approved'
    },

    // Edits (Blue)
    'hours_re_edited': {
      icon: Edit2,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-500',
      label: 'Hours Edited'
    },
    'hours_updated': {
      icon: Edit2,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-500',
      label: 'Hours Updated'
    },
    'updated': {
      icon: Edit2,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-500',
      label: 'Updated'
    },

    // Assignments (Purple)
    'assigned_worker': {
      icon: UserPlus,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-500',
      label: 'Worker Assigned'
    },
    'created': {
      icon: UserPlus,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-500',
      label: 'Created'
    },

    // Removals (Amber)
    'unassigned_worker': {
      icon: UserMinus,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-500',
      label: 'Worker Removed'
    },
    'removed_from_job': {
      icon: UserMinus,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-500',
      label: 'Removed from Job'
    },

    // Issues (Red)
    'marked_no_show': {
      icon: XCircle,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-500',
      label: 'No Show'
    },
    'deleted': {
      icon: Trash2,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-500',
      label: 'Deleted'
    },

    // Restorations (Teal)
    'restored_from_cancelled': {
      icon: RotateCcw,
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      borderColor: 'border-teal-500',
      label: 'Restored'
    },
    'hours_reopened_for_editing': {
      icon: Unlock,
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      borderColor: 'border-teal-500',
      label: 'Reopened for Editing'
    },

    // System (Gray)
    'totals_recalculated': {
      icon: Calculator,
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-500',
      label: 'Totals Recalculated'
    }
  };

  // Return config or default
  return configs[action] || {
    icon: FileText,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-500',
    label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  };
}

/**
 * Get action category
 */
export function getActionCategory(action: string): string {
  const categories: Record<string, string> = {
    'event_hours_approved_selected': 'Approvals',
    'event_hours_approved': 'Approvals',
    'approved': 'Approvals',
    'hours_re_edited': 'Edits',
    'hours_updated': 'Edits',
    'updated': 'Edits',
    'assigned_worker': 'Assignments',
    'created': 'Assignments',
    'unassigned_worker': 'Removals',
    'removed_from_job': 'Removals',
    'marked_no_show': 'Issues',
    'deleted': 'Issues',
    'restored_from_cancelled': 'Restorations',
    'hours_reopened_for_editing': 'Restorations',
    'totals_recalculated': 'System'
  };

  return categories[action] || 'Other';
}

/**
 * Get color for action category
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Approvals': 'text-green-600 bg-green-50',
    'Edits': 'text-blue-600 bg-blue-50',
    'Assignments': 'text-purple-600 bg-purple-50',
    'Removals': 'text-amber-600 bg-amber-50',
    'Issues': 'text-red-600 bg-red-50',
    'Restorations': 'text-teal-600 bg-teal-50',
    'System': 'text-gray-600 bg-gray-50'
  };

  return colors[category] || 'text-gray-600 bg-gray-50';
}

