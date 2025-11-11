import React, { useState, useEffect } from 'react';
import { safeToFixed } from '../utils/number';
import { cn } from '../lib/utils';
import { X, Check, Ban, AlertCircle, Clock, Edit2, User, Loader2, Plus, Minus, MapPin, XCircle } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Toast } from './common/Toast';
import { Avatar } from './common/Avatar';
import { format, parseISO } from 'date-fns';

interface AssignmentForApproval {
  id: number;
  worker_id: number;
  worker_name: string;
  worker_profile_photo_url?: string;
  shift_id: number;
  shift_role: string;
  shift_date: string;
  scheduled_start: string;
  scheduled_end: string;
  scheduled_hours: number;
  actual_start?: string;
  actual_end?: string;
  hours_worked?: number;
  effective_hours: number;
  hourly_rate: number;
  effective_hourly_rate: number;
  effective_pay: number;
  status: string;
  approved: boolean;
  approved_at?: string;
  approved_by_name?: string;
  original_hours_worked?: number;
  edited_at?: string;
  edited_by_name?: string;
  approval_notes?: string;
  can_edit_hours: boolean;
  can_approve: boolean;
}

interface ApprovalModalProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CostSummary {
  approved_cost: number;
  pending_cost: number;
  total_estimated_cost: number;
  approved_count: number;
  pending_count: number;
  total_count: number;
  all_approved: boolean;
}

interface WorkerRowProps {
  assignment: AssignmentForApproval;
  isEditing: boolean;
  editHours: string;
  isSavingEdit: boolean;
  wasApprovedBeforeEdit: boolean;
  isSelected: boolean;
  canSelect: boolean;
  onToggleSelect: (assignmentId: number) => void;
  onStartEdit: (assignment: AssignmentForApproval) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditHoursChange: (hours: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  calculateLiveTotal: (hours: string, rate: number) => string;
  onNoShow: (assignment: AssignmentForApproval) => void;
  onRemove: (assignment: AssignmentForApproval) => void;
  onReEdit: (assignment: AssignmentForApproval) => void;
}

function WorkerRow({ 
  assignment, 
  isEditing, 
  editHours,
  isSavingEdit,
  wasApprovedBeforeEdit,
  isSelected,
  canSelect,
  onToggleSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditHoursChange,
  onEditKeyDown,
  calculateLiveTotal,
  onNoShow, 
  onRemove, 
  onReEdit 
}: WorkerRowProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      // Humanized format: "Nov 7, 6:57 AM, 2025"
      return format(date, 'MMM d, h:mm a, yyyy');
    } catch {
      try {
        const d = new Date(dateString);
        const month = d.toLocaleString('en-US', { month: 'short' });
        const day = d.getDate();
        const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const year = d.getFullYear();
        return `${month} ${day}, ${time}, ${year}`;
      } catch {
        return 'N/A';
      }
    }
  };


  /**
   * Format time for display
   */
  const formatTime = (datetime?: string): string => {
    if (!datetime) return '';
    try {
      const date = parseISO(datetime);
      return format(date, 'h:mm a');
    } catch {
      return new Date(datetime).toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  /**
   * Get shift time display
   */
  const getShiftTime = (): string => {
    const start = assignment.actual_start || assignment.scheduled_start;
    const end = assignment.actual_end || assignment.scheduled_end;
    if (!start || !end) return 'Not set';
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  /**
   * Calculate shift duration in hours
   */
  const getShiftDuration = (): number => {
    const start = assignment.actual_start || assignment.scheduled_start;
    const end = assignment.actual_end || assignment.scheduled_end;
    if (!start || !end) return 0;
    
    try {
      const startDate = parseISO(start);
      const endDate = parseISO(end);
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return Math.round(diffHours * 10) / 10; // Round to 1 decimal
    } catch {
      return 0;
    }
  };

  /**
   * Quick adjust hours
   */
  const adjustHours = (delta: number) => {
    const current = parseFloat(editHours) || 0;
    const newValue = Math.max(0, Math.min(24, current + delta));
    onEditHoursChange(newValue.toFixed(2));
  };

  const isApproved = assignment.approved;
  const shiftTime = getShiftTime();
  const shiftDuration = getShiftDuration();

  return (
    <>
      {/* Desktop View (sm and up) */}
      <tr
            className={cn(
              "hidden sm:table-row group transition-all duration-150 ease-in-out border-b",
              isApproved && !isEditing && assignment.status !== 'no_show' && assignment.status !== 'cancelled' && assignment.status !== 'removed' && "bg-green-50/30 hover:bg-green-50/50",
              !isApproved && !isEditing && assignment.status === 'no_show' && "bg-red-50/30 opacity-60",
              !isApproved && !isEditing && (assignment.status === 'cancelled' || assignment.status === 'removed') && "bg-gray-50/30 opacity-60",
              !isApproved && !isEditing && assignment.status !== 'no_show' && assignment.status !== 'cancelled' && assignment.status !== 'removed' && "bg-white hover:bg-gray-50",
              isEditing && "bg-slate-50"
            )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
      {/* Checkbox */}
      <td className="py-4 px-3 w-12">
        {canSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(assignment.id)}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </td>
      
      {/* Worker Info */}
      <td className="py-4 px-3">
        <div className="flex items-center gap-3">
          {/* Avatar - using same component as worker directory */}
          <Avatar
            name={assignment.worker_name}
            src={assignment.worker_profile_photo_url}
            size={36}
          />
          {/* Info */}
          <div className="min-w-0">
            <div className={cn(
              "font-medium truncate",
              (assignment.status === 'cancelled' || assignment.status === 'removed') && "line-through text-gray-500",
              assignment.status === 'no_show' && "text-gray-700",
              !assignment.status || (assignment.status !== 'no_show' && assignment.status !== 'cancelled' && assignment.status !== 'removed') && "text-gray-900"
            )}>
              {assignment.worker_name}
            </div>
            <div className="text-xs text-gray-500">
              Scheduled: {safeToFixed(assignment.scheduled_hours, 2, '0.00')}h
            </div>
            {/* Status-specific metadata */}
            {assignment.status === 'no_show' && !isEditing && (
              <div className="mt-1 text-xs text-red-600 font-medium">
                {assignment.approved_by_name ? (
                  <span>
                    Marked as no-show by {assignment.approved_by_name.split('@')[0]} on {assignment.approved_at ? formatDateTime(assignment.approved_at) : 'N/A'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    <span>No-Show</span>
                  </span>
                )}
              </div>
            )}
            {(assignment.status === 'cancelled' || assignment.status === 'removed') && !isEditing && (
              <div className="mt-1 text-xs text-red-600 font-medium">
                {assignment.approved_by_name ? (
                  <span>
                    Denied by {assignment.approved_by_name.split('@')[0]} on {assignment.approved_at ? formatDateTime(assignment.approved_at) : 'N/A'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    <span>Denied</span>
                  </span>
                )}
              </div>
            )}
            {/* Approval metadata - only if approved and not no-show/removed */}
            {isApproved && !isEditing && assignment.approved_by_name && assignment.status !== 'no_show' && assignment.status !== 'cancelled' && assignment.status !== 'removed' && (
              <div className="mt-1 text-xs text-green-700 font-medium">
                Approved by {assignment.approved_by_name.split('@')[0]} on{' '}
                {assignment.approved_at ? formatDateTime(assignment.approved_at) : 'N/A'}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="py-4 px-3 text-sm text-gray-700">
        <span className={cn(
          (assignment.status === 'cancelled' || assignment.status === 'removed' || assignment.status === 'no_show') && "text-gray-400"
        )}>
          {assignment.shift_role || 'N/A'}
        </span>
      </td>

      {/* Time Worked */}
      <td className="py-4 px-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <Clock className={cn(
            "h-3.5 w-3.5 flex-shrink-0",
            (assignment.status === 'cancelled' || assignment.status === 'removed' || assignment.status === 'no_show') ? "text-gray-300" : "text-gray-400"
          )} />
          <span className={cn(
            "whitespace-nowrap",
            (assignment.status === 'cancelled' || assignment.status === 'removed' || assignment.status === 'no_show') && "text-gray-400"
          )}>
            {shiftTime}
          </span>
        </div>
      </td>

      {/* Hours */}
      <td className="py-4 px-3 text-sm font-medium text-right">
        {assignment.status === 'no_show' ? (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-red-600">0h</span>
          </div>
        ) : (assignment.status === 'cancelled' || assignment.status === 'removed') ? (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-gray-400">-</span>
          </div>
        ) : (
          <>
            <span className="text-gray-900">{safeToFixed(assignment.effective_hours, 2, '0.00')}h</span>
            {assignment.edited_at && (
              <span className="ml-1 text-xs text-orange-600" title="Edited">
                <Edit2 className="h-3 w-3 inline" />
              </span>
            )}
          </>
        )}
      </td>

      {/* Rate */}
      <td className="py-4 px-3 text-sm text-gray-700 text-right">
        <span className={cn(
          (assignment.status === 'cancelled' || assignment.status === 'removed' || assignment.status === 'no_show') && "text-gray-400"
        )}>
          ${safeToFixed(assignment.effective_hourly_rate, 2, '0.00')}/h
        </span>
      </td>

      {/* Total Pay */}
      <td className="py-4 px-3 text-sm font-semibold text-right">
        {assignment.status === 'no_show' ? (
          <span className="text-red-600 line-through">$0.00</span>
        ) : (assignment.status === 'cancelled' || assignment.status === 'removed') ? (
          <span className="text-gray-400">-</span>
        ) : (
          <span className="text-gray-900">${safeToFixed(assignment.effective_pay, 2, '0.00')}</span>
        )}
      </td>

      {/* Status & Actions */}
      <td className="py-4 text-right">
        {isEditing ? (
          // EDIT MODE - Show "Editing" badge
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
            <Edit2 className="h-3.5 w-3.5" />
            Editing
          </span>
        ) : (
          // VIEW MODE - Status badge + action buttons
          <div className="flex items-center justify-end gap-2">
            {assignment.status === 'no_show' ? (
              <>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                  <Ban className="h-3.5 w-3.5" />
                  No-Show
                </span>
              </>
            ) : assignment.status === 'cancelled' || assignment.status === 'removed' ? (
              <div className="flex items-center justify-end gap-3">
                {/* Status Badge */}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 rounded flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                  Cancelled
                </span>
                
                {/* Action Buttons - Allow editing cancelled workers - Always visible */}
                {assignment.can_edit_hours && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onStartEdit(assignment)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Hours"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3">
                {/* Status Badge */}
                {isApproved ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded flex-shrink-0">
                    <Check className="h-3.5 w-3.5" />
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded flex-shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    Pending
                  </span>
                )}

                {/* Action Buttons (on hover) */}
                {assignment.can_edit_hours && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => isApproved ? onReEdit(assignment) : onStartEdit(assignment)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title={isApproved ? "Re-edit" : "Edit"}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onNoShow(assignment)}
                      className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                      title="No-Show"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onRemove(assignment)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Deny"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>

    {/* Expanded Edit Panel - Below Row */}
    {isEditing && (
      <tr className="bg-slate-50">
        <td colSpan={8} className="px-3 py-0">
          <div className="overflow-hidden transition-all duration-300 ease-in-out">
            <div className="py-3">
              {/* CHANGED: Softer border (slate-300), less padding (p-3) */}
              <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Edit2 className="h-4 w-4 text-slate-600" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    Edit Hours Worked
                  </h4>
                </div>

                {/* CHANGED: Shift Context - Compact Inline (1 line, text-xs) */}
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <span>{shiftTime}</span>
                  {shiftDuration > 0 && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span>{shiftDuration} hour shift</span>
                    </>
                  )}
                </div>

                {/* CHANGED: Tighter spacing (space-y-3) */}
                <div className="space-y-3">
                  {/* Hours Input with Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjustHours(-1)}
                      disabled={isSavingEdit}
                      className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      type="button"
                      title="Decrease by 1 hour"
                    >
                      <Minus className="h-4 w-4 text-gray-600" />
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="24"
                      value={editHours}
                      onChange={(e) => onEditHoursChange(e.target.value)}
                      onKeyDown={onEditKeyDown}
                      disabled={isSavingEdit}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      placeholder="0.0"
                      autoFocus
                    />
                    <button
                      onClick={() => adjustHours(1)}
                      disabled={isSavingEdit}
                      className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      type="button"
                      title="Increase by 1 hour"
                    >
                      <Plus className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  {/* CHANGED: Compact Quick Adjust (smaller gaps) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Quick:</span>
                    <button
                      onClick={() => adjustHours(-1)}
                      disabled={isSavingEdit}
                      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      -1h
                    </button>
                    <button
                      onClick={() => adjustHours(-0.5)}
                      disabled={isSavingEdit}
                      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      -0.5h
                    </button>
                    <button
                      onClick={() => adjustHours(0.5)}
                      disabled={isSavingEdit}
                      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      +0.5h
                    </button>
                    <button
                      onClick={() => adjustHours(1)}
                      disabled={isSavingEdit}
                      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      +1h
                    </button>
                  </div>

                  {/* Updated Total Display */}
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Updated Total</div>
                    <div className="text-lg font-bold text-blue-600">
                      ${calculateLiveTotal(editHours, assignment.effective_hourly_rate || 0)}
                    </div>
                  </div>

                  {/* CHANGED: Compact Warning (single line, left border only) */}
                  {wasApprovedBeforeEdit && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-l-2 border-amber-400 rounded text-xs text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                      <span><strong>Note:</strong> Re-editing will un-approve these hours.</span>
                    </div>
                  )}

                  {/* CHANGED: Compact Action Row (pt-3, smaller buttons) */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    {/* Left: Destructive actions - CHANGED: Smaller (px-2.5 py-1.5) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onNoShow(assignment);
                          onCancelEdit();
                        }}
                        disabled={isSavingEdit}
                        className="px-2.5 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 flex items-center gap-1 disabled:opacity-50 transition-colors"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        No-Show
                      </button>
                      <button
                        onClick={() => {
                          onRemove(assignment);
                          onCancelEdit();
                        }}
                        disabled={isSavingEdit}
                        className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 flex items-center gap-1 disabled:opacity-50 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        Deny
                      </button>
                    </div>

                    {/* Right: Save/Cancel - CHANGED: py-1.5 instead of py-2 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onCancelEdit}
                        disabled={isSavingEdit}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={onSaveEdit}
                        disabled={isSavingEdit}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                      >
                        {isSavingEdit ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    )}

    {/* Mobile View (below sm) */}
    <tr className="sm:hidden">
      <td colSpan={8} className="py-3 px-3">
              <div className={cn(
                "p-3 rounded-lg space-y-2 transition-all duration-150",
                isEditing && "bg-blue-50 border-2 border-blue-500",
                !isEditing && isApproved && assignment.status !== 'no_show' && assignment.status !== 'cancelled' && assignment.status !== 'removed' && "bg-green-50 border border-green-200",
                !isEditing && assignment.status === 'no_show' && "bg-red-50 border border-red-200 opacity-60",
                !isEditing && (assignment.status === 'cancelled' || assignment.status === 'removed') && "bg-gray-50 border border-gray-200 opacity-60",
                !isEditing && assignment.status !== 'no_show' && assignment.status !== 'cancelled' && assignment.status !== 'removed' && "bg-white border border-gray-200"
              )}>
          {/* Worker name & role */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {/* Avatar - using same component as worker directory */}
                <Avatar
                  name={assignment.worker_name}
                  src={assignment.worker_profile_photo_url}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{assignment.worker_name}</div>
                  <div className="text-xs text-gray-500">{assignment.shift_role || 'N/A'}</div>
                </div>
              </div>
              {/* Shift Time */}
              <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1 ml-10">
                <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span>{shiftTime}</span>
              </div>
              {isApproved && !isEditing && assignment.approved_by_name && (
                <div className="text-xs text-green-700 mt-1 ml-10 font-medium">
                  Approved by {assignment.approved_by_name.split('@')[0]} on{' '}
                  {assignment.approved_at ? formatDateTime(assignment.approved_at) : 'N/A'}
                </div>
              )}
              {assignment.status === 'no_show' && !isEditing && (
                <div className="text-xs text-red-600 mt-1 ml-10 font-medium">
                  {assignment.approved_by_name ? (
                    <span>
                      Marked as no-show by {assignment.approved_by_name.split('@')[0]} on {assignment.approved_at ? formatDateTime(assignment.approved_at) : 'N/A'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Ban className="h-3 w-3" />
                      <span>No-Show</span>
                    </span>
                  )}
                </div>
              )}
              {(assignment.status === 'cancelled' || assignment.status === 'removed') && !isEditing && (
                <div className="text-xs text-red-600 mt-1 ml-10 font-medium">
                  {assignment.approved_by_name ? (
                    <span>
                      Denied by {assignment.approved_by_name.split('@')[0]} on {assignment.approved_at ? formatDateTime(assignment.approved_at) : 'N/A'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      <span>Denied</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            {assignment.approved ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                <Check className="h-3.5 w-3.5" />
                Approved
              </span>
            ) : assignment.status === 'no_show' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                <Ban className="h-3.5 w-3.5" />
                No-Show
              </span>
            ) : assignment.status === 'cancelled' || assignment.status === 'removed' ? (
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                  <XCircle className="h-3.5 w-3.5" />
                  Cancelled
                </span>
                {/* Allow editing cancelled workers in mobile view too */}
                {assignment.can_edit_hours && (
                  <button
                    onClick={() => onStartEdit(assignment)}
                    className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded">
                <Clock className="h-3.5 w-3.5" />
                Pending
              </span>
            )}
          </div>

          {/* Edit Form - Mobile */}
          {isEditing && (
            <div className="pt-2 border-t border-gray-200">
              <div className="bg-white border-2 border-blue-400 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Edit2 className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Edit Hours Worked</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hours Worked</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="24"
                      value={editHours}
                      onChange={(e) => onEditHoursChange(e.target.value)}
                      onKeyDown={onEditKeyDown}
                      disabled={isSavingEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      autoFocus
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Updated Total</div>
                    <div className="text-lg font-bold text-blue-600">
                      ${calculateLiveTotal(editHours, assignment.effective_hourly_rate || 0)}
                    </div>
                  </div>
                  {wasApprovedBeforeEdit && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <strong>Note:</strong> Re-editing will un-approve these hours.
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={onCancelEdit}
                      disabled={isSavingEdit}
                      className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onSaveEdit}
                      disabled={isSavingEdit}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:bg-blue-400"
                    >
                      {isSavingEdit ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid - View Mode */}
          {!isEditing && (
            // VIEW MODE
            <>
              <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t border-gray-200">
                <div>
                  <div className="text-xs text-gray-500">Hours</div>
                  <div className="font-medium flex items-center gap-1.5">
                    {assignment.status === 'no_show' ? (
                      <span className="text-red-600">0h</span>
                    ) : (assignment.status === 'cancelled' || assignment.status === 'removed') ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <span className="text-gray-900">{safeToFixed(assignment.effective_hours, 2, '0.00')}h</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Rate</div>
                  <div className="font-medium">${safeToFixed(assignment.effective_hourly_rate, 2, '0.00')}/h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-semibold">${safeToFixed(assignment.effective_pay, 2, '0.00')}</div>
                </div>
              </div>

              {/* Action buttons - Allow editing cancelled, removed, and no-show workers */}
              {assignment.can_edit_hours && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  {assignment.approved ? (
                    <button
                      onClick={() => onReEdit(assignment)}
                      className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Re-edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onStartEdit(assignment)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => onNoShow(assignment)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 rounded hover:bg-orange-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        No-Show
                      </button>
                      <button
                        onClick={() => onRemove(assignment)}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Deny
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
    </>
  );
}

export default function ApprovalModal({ event, isOpen, onClose, onSuccess }: ApprovalModalProps) {
  const [assignments, setAssignments] = useState<AssignmentForApproval[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);
  // Inline editing state (replaces old editingId/editData)
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [editHours, setEditHours] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [wasApprovedBeforeEdit, setWasApprovedBeforeEdit] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  // Selection state for checkboxes
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' }>({ isVisible: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message?: string;
    requireNote?: boolean;
    note?: string;
    onConfirm?: (note?: string) => Promise<void> | void;
    variant?: 'default' | 'warning' | 'danger';
  }>({ open: false, title: '', variant: 'default' });

  useEffect(() => {
    if (isOpen && event) {
      loadAssignments();
      setSelectedAssignmentIds(new Set()); // Reset selection when modal opens
    }
  }, [isOpen, event]);

  const loadAssignments = async () => {
    if (!event?.id) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/events/${event.id}/approvals`);
      const rawAssignments = response.data.data.assignments || [];
      
      // Frontend deduplication: Remove duplicates by assignment ID first
      const uniqueById = Array.from(
        new Map(rawAssignments.map((a: AssignmentForApproval) => [a.id, a])).values()
      );
      
      // Then deduplicate by [shift_id, worker_id] to catch duplicates on same shift
      const uniqueByShiftWorker = Array.from(
        new Map(
          uniqueById.map((a: AssignmentForApproval) => [
            `${a.shift_id}-${a.worker_id}`,
            a
          ])
        ).values()
      );
      
      // Final deduplication: If same worker appears on multiple shifts with identical details,
      // keep only the most recent one (by assignment ID, which typically reflects creation order)
      // This handles cases where a worker is accidentally assigned to duplicate shifts
      const finalAssignments = Array.from(
        new Map(
          uniqueByShiftWorker
            .sort((a, b) => b.id - a.id) // Sort by ID descending (most recent first)
            .map((a: AssignmentForApproval) => [
              `${a.worker_id}-${a.shift_role}-${a.scheduled_start}-${a.scheduled_end}`,
              a
            ])
        ).values()
      );
      
      console.log(`Loaded ${rawAssignments.length} assignments, deduplicated to ${finalAssignments.length}`, {
        before: rawAssignments.length,
        afterById: uniqueById.length,
        afterByShiftWorker: uniqueByShiftWorker.length,
        final: finalAssignments.length
      });
      
      setAssignments(finalAssignments);
      setCostSummary(response.data.data.cost_summary || null);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      setToast({
        isVisible: true,
        type: 'error',
        message: error.response?.data?.error || error.message || 'Unable to load assignments for approval'
      });
      setAssignments([]);
      setCostSummary(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start editing a worker's hours inline
   */
  const handleStartEdit = (assignment: AssignmentForApproval) => {
    setEditingAssignmentId(assignment.id);
    setEditHours(String(assignment.effective_hours || assignment.hours_worked || assignment.scheduled_hours || '0'));
    setWasApprovedBeforeEdit(false);
  };

  /**
   * Cancel editing and reset state
   */
  const handleCancelEdit = () => {
    setEditingAssignmentId(null);
    setEditHours('');
    setWasApprovedBeforeEdit(false);
  };

  /**
   * Save edited hours and update assignment
   */
  const handleSaveEdit = async () => {
    if (!editingAssignmentId) return;
    
    const hoursValue = parseFloat(editHours);
    
    // Validation
    if (isNaN(hoursValue) || hoursValue < 0) {
      setToast({ isVisible: true, type: 'error', message: 'Please enter a valid number of hours' });
      return;
    }
    
    if (hoursValue > 24) {
      setToast({ isVisible: true, type: 'error', message: 'Hours cannot exceed 24 per shift' });
      return;
    }
    
    setIsSavingEdit(true);
    
    try {
      const response = await apiClient.patch(`/approvals/${editingAssignmentId}/update_hours`, {
        hours_worked: hoursValue
      });
      
      // Refresh assignments data
      await loadAssignments();
      
      // Exit edit mode
      handleCancelEdit();
      
      if (response.data?.message) {
        setToast({ isVisible: true, type: 'success', message: response.data.message });
      } else {
        setToast({ isVisible: true, type: 'success', message: 'Hours updated successfully' });
      }
    } catch (error: any) {
      console.error('Error updating hours:', error);
      setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to update hours. Please try again.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  /**
   * Handle keyboard shortcuts in edit mode
   */
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  /**
   * Calculate live total pay while editing
   */
  const calculateLiveTotal = (hours: string, rate: number): string => {
    const hoursValue = parseFloat(hours);
    if (isNaN(hoursValue)) return '0.00';
    return (hoursValue * rate).toFixed(2);
  };

  /**
   * Handle re-editing an approved assignment
   * Shows confirmation, then enters inline edit mode
   */
  const handleReEdit = (assignment: AssignmentForApproval) => {
    setConfirmDialog({
      open: true,
      title: 'Re-Edit Approved Hours',
      message: `Re-editing will un-approve ${assignment.worker_name}'s hours. The assignment will need to be re-approved after you make changes. Continue?`,
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ open: false, title: '' });
        // Enter inline edit mode with approved flag
        setEditingAssignmentId(assignment.id);
        setEditHours(String(assignment.effective_hours || assignment.hours_worked || assignment.scheduled_hours || '0'));
        setWasApprovedBeforeEdit(true);
        setToast({ isVisible: true, type: 'success', message: 'Hours un-approved. Make your changes and save.' });
      }
    });
  };

  const handleMarkNoShow = (assignment: AssignmentForApproval) => {
    setConfirmDialog({
      open: true,
      title: 'Mark No-Show',
      message: `Mark ${assignment.worker_name} as no-show? This will set hours to 0.`,
      requireNote: true,
      note: '',
      variant: 'warning',
      onConfirm: async (note?: string) => {
        // Note is passed from the confirm button click handler
        const noteToSend = note || confirmDialog.note || '';
        setConfirmDialog({ open: false, title: '' });
        try {
          await apiClient.post(`/approvals/${assignment.id}/mark_no_show`, { notes: noteToSend });
          await loadAssignments();
          setToast({ isVisible: true, type: 'success', message: 'Marked as no-show' });
        } catch (error: any) {
          console.error('Error marking no-show:', error);
          setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to mark no-show' });
        }
      }
    });
  };

  const handleRemove = (assignment: AssignmentForApproval) => {
    setConfirmDialog({
      open: true,
      title: 'Deny Assignment',
      message: `Deny ${assignment.worker_name} from this job? This will cancel their assignment.`,
      requireNote: true,
      note: '',
      variant: 'danger',
      onConfirm: async (note?: string) => {
        // Note is passed from the confirm button click handler
        const noteToSend = note || confirmDialog.note || '';
        setConfirmDialog({ open: false, title: '' });
        try {
          await apiClient.delete(`/approvals/${assignment.id}/remove`, { data: { notes: noteToSend } });
          await loadAssignments();
          setToast({ isVisible: true, type: 'success', message: 'Assignment denied' });
        } catch (error: any) {
          console.error('Error removing assignment:', error);
          setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to deny assignment' });
        }
      }
    });
  };

  // Get eligible assignments for approval (pending, can approve, not no-show)
  const eligibleAssignments = assignments.filter(a => !a.approved && a.can_approve && a.status !== 'no_show' && a.status !== 'cancelled');
  
  // Get selected eligible assignments
  const selectedEligible = eligibleAssignments.filter(a => selectedAssignmentIds.has(a.id));
  
  // Toggle selection for a single assignment
  const toggleSelection = (assignmentId: number) => {
    setSelectedAssignmentIds(prev => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  };
  
  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedEligible.length === eligibleAssignments.length && eligibleAssignments.length > 0) {
      // Deselect all
      setSelectedAssignmentIds(new Set());
    } else {
      // Select all eligible
      setSelectedAssignmentIds(new Set(eligibleAssignments.map(a => a.id)));
    }
  };
  
  const handleApproveSelected = async () => {
    if (selectedEligible.length === 0) {
      setToast({ isVisible: true, type: 'error', message: 'Please select at least one assignment to approve' });
      return;
    }
    
    setConfirmDialog({
      open: true,
      title: 'Approve Selected Hours',
      message: `Approve hours for ${selectedEligible.length} selected ${selectedEligible.length === 1 ? 'worker' : 'workers'}?`,
      onConfirm: async () => {
        setIsApproving(true);
        try {
          await apiClient.post(`/events/${event.id}/approve_selected`, {
            assignment_ids: Array.from(selectedEligible.map(a => a.id))
          });
          await loadAssignments();
          setSelectedAssignmentIds(new Set()); // Clear selection after approval
          onSuccess();
          setToast({ isVisible: true, type: 'success', message: `Approved ${selectedEligible.length} ${selectedEligible.length === 1 ? 'assignment' : 'assignments'}` });
        } catch (error: any) {
          console.error('Error approving selected:', error);
          setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to approve selected hours' });
        } finally {
          setIsApproving(false);
          setConfirmDialog({ open: false, title: '' });
        }
      }
    });
  };
  
  const handleApproveAll = async () => {
    const pendingCount = eligibleAssignments.length;
    setConfirmDialog({
      open: true,
      title: 'Approve All Hours',
      message: `Approve hours for all ${pendingCount} eligible workers?`,
      onConfirm: async () => {
        setIsApproving(true);
        try {
          await apiClient.post(`/events/${event.id}/approve_all`);
          await loadAssignments();
          setSelectedAssignmentIds(new Set()); // Clear selection after approval
          onSuccess();
          setToast({ isVisible: true, type: 'success', message: `Approved ${pendingCount} assignments` });
        } catch (error: any) {
          console.error('Error approving all:', error);
          setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to approve all hours' });
        } finally {
          setIsApproving(false);
          setConfirmDialog({ open: false, title: '' });
        }
      }
    });
  };

  if (!isOpen) return null;

  // Calculate state for new layout - Show ALL assignments
  const allAssignments = assignments; // Show all, including no-shows and removed
  
  // Group assignments by status
  const activeAssignments = assignments.filter(a => 
    a.status !== 'no_show' && a.status !== 'cancelled' && a.status !== 'removed'
  );
  const noShowAssignments = assignments.filter(a => a.status === 'no_show');
  const removedAssignments = assignments.filter(a => 
    a.status === 'cancelled' || a.status === 'removed'
  );
  
  // Counts for active assignments only (for approval logic)
  const pendingCount = activeAssignments.filter(a => !a.approved).length;
  const approvedCount = activeAssignments.filter(a => a.approved).length;
  const totalActiveCount = activeAssignments.length;
  
  // Total assigned (all statuses)
  const totalAssignedCount = allAssignments.length;
  
  // Costs - only count active assignments
  const pendingCost = activeAssignments
    .filter(a => !a.approved)
    .reduce((sum, a) => sum + Number(a.effective_pay || 0), 0);

  const approvedCost = activeAssignments
    .filter(a => a.approved)
    .reduce((sum, a) => sum + Number(a.effective_pay || 0), 0);

  const totalCost = pendingCost + approvedCost;

  const totalHours = activeAssignments
    .reduce((sum, a) => sum + Number(a.effective_hours || 0), 0);
  
  const approvedHours = activeAssignments
    .filter(a => a.approved)
    .reduce((sum, a) => sum + Number(a.effective_hours || 0), 0);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return new Date(dateString).toLocaleDateString();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      {/* Render Toast at overlay level */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
      
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-5xl sm:rounded-lg shadow-xl overflow-hidden flex flex-col sm:max-h-[90vh] my-0 sm:my-4">
        {/* Header - Clean & Minimal */}
        <header className="border-b px-6 py-4 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">Approve Hours</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span className="font-medium text-gray-900">{event?.title}</span>
                {event?.schedule?.start_time_utc && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {format(parseISO(event.schedule.start_time_utc), 'MMM d, yyyy h:mm a')} - {format(parseISO(event.schedule.end_time_utc), 'h:mm a')}
                  </span>
                )}
                {event?.venue?.name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {event.venue.name}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Info Banner - Only show if pending assignments exist */}
        {pendingCount > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 px-6 py-3 flex-shrink-0">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <strong>{pendingCount}</strong> {pendingCount === 1 ? 'assignment' : 'assignments'} pending approval
            </p>
          </div>
        )}

        {/* Main Content - Table */}
        <div className="flex-1 overflow-auto px-3 sm:px-6 py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No assignments found for this event.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-200 hidden sm:table-header-group">
                <tr className="text-left">
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-12 px-3">
                    {eligibleAssignments.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedEligible.length === eligibleAssignments.length && eligibleAssignments.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                        title={selectedEligible.length === eligibleAssignments.length ? "Deselect all" : "Select all"}
                      />
                    )}
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">
                    Worker
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                    Role
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                    Time Worked
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[10%]">
                    Hours
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[10%]">
                    Rate
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[12%]">
                    Total
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[10%]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map(assignment => {
                  const canSelect = !assignment.approved && assignment.can_approve && assignment.status !== 'no_show' && assignment.status !== 'cancelled';
                  return (
                    <WorkerRow
                      key={assignment.id}
                      assignment={assignment}
                      isEditing={editingAssignmentId === assignment.id}
                      editHours={editHours}
                      isSavingEdit={isSavingEdit}
                      wasApprovedBeforeEdit={wasApprovedBeforeEdit}
                      isSelected={selectedAssignmentIds.has(assignment.id)}
                      canSelect={canSelect}
                      onToggleSelect={toggleSelection}
                      onStartEdit={handleStartEdit}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                      onEditHoursChange={setEditHours}
                      onEditKeyDown={handleEditKeyDown}
                      calculateLiveTotal={calculateLiveTotal}
                      onNoShow={handleMarkNoShow}
                      onRemove={handleRemove}
                      onReEdit={handleReEdit}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer - Summary & Actions */}
        <footer className="border-t bg-gray-50 px-3 sm:px-6 py-4 flex-shrink-0">
          {/* Breakdown Summary - Show all statuses */}
          {(noShowAssignments.length > 0 || removedAssignments.length > 0) && (
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm border-b border-gray-200 pb-4">
              <div>
                <div className="text-gray-500 text-xs">Total Assigned</div>
                <div className="text-base font-semibold text-gray-900">
                  {totalAssignedCount}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Approved</div>
                <div className="text-base font-semibold text-green-600">
                  {approvedCount}
                </div>
              </div>
              {noShowAssignments.length > 0 && (
                <div>
                  <div className="text-gray-500 text-xs">No-Shows</div>
                  <div className="text-base font-semibold text-red-600">
                    {noShowAssignments.length}
                  </div>
                </div>
              )}
              {removedAssignments.length > 0 && (
                <div>
                  <div className="text-gray-500 text-xs">Denied</div>
                  <div className="text-base font-semibold text-gray-500">
                    {removedAssignments.length}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            {/* Left: Cost Summary - Single line format */}
            <div className="text-sm">
              <span className="text-gray-600">
                {pendingCount === 0 ? 'Final approved cost:' : 'Total cost:'}
              </span>
              <span className="ml-2 text-lg font-bold text-gray-900">
                ${safeToFixed(pendingCount === 0 ? approvedCost : totalCost, 2, '0.00')}
              </span>
              <span className="ml-1 text-gray-600">
                ({pendingCount === 0 ? approvedCount : totalActiveCount} {pendingCount === 0 ? (approvedCount === 1 ? 'worker' : 'workers') : (totalActiveCount === 1 ? 'worker' : 'workers')}, {safeToFixed(pendingCount === 0 ? approvedHours : totalHours, 2, '0.00')}h)
              </span>
            </div>

            {/* Right: Action Buttons Only */}
            <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Close
            </button>
            
            {/* CHANGED: Single approve button - approves selected if any, otherwise all */}
            {pendingCount > 0 && (
              <button
                onClick={() => {
                  // If items are selected, approve selected; otherwise approve all
                  if (selectedEligible.length > 0) {
                    handleApproveSelected();
                  } else {
                    handleApproveAll();
                  }
                }}
                disabled={isApproving}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {selectedEligible.length > 0 
                      ? 'Approve Selected'
                      : 'Approve All'
                    }
                  </>
                )}
              </button>
            )}
            </div>
          </div>
        </footer>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDialog({ open: false, title: '' })}></div>
          <div className="relative bg-white w-full max-w-md rounded-lg shadow-xl p-5">
            <h3 className="text-lg font-semibold text-gray-900">{confirmDialog.title}</h3>
            {confirmDialog.message && (
              <p className="mt-2 text-sm text-gray-700">{confirmDialog.message}</p>
            )}
            {confirmDialog.requireNote && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={confirmDialog.note || ''}
                  onChange={(e) => setConfirmDialog(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDialog({ open: false, title: '' })}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Capture note from current dialog state before calling onConfirm
                  const currentNote = confirmDialog.note || '';
                  if (confirmDialog.onConfirm) {
                    await confirmDialog.onConfirm(currentNote);
                  }
                }}
                className={
                  `px-4 py-2 text-white text-sm font-medium rounded-md ` +
                  (confirmDialog.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700')
                }
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
