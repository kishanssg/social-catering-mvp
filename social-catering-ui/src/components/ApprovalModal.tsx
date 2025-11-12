import React, { useState, useEffect } from 'react';
import { safeToFixed } from '../utils/number';
import { cn } from '../lib/utils';
import { X, Check, Ban, AlertCircle, Clock, Edit2, User, Loader2, Plus, Minus, MapPin, XCircle, Undo2, ChevronDown, ChevronRight, CheckCircle, MoreVertical, Save } from 'lucide-react';
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
  validationError?: string;
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
  validationError,
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
              isEditing && "bg-slate-50",
              isSavingEdit && "opacity-60 pointer-events-none"
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
          <span className="text-red-600">0h</span>
        ) : (assignment.status === 'cancelled' || assignment.status === 'removed') ? (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-gray-400">-</span>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            {isEditing ? (
              // Show inline diff: old value struck through, new value bold
              <>
                <span className="text-gray-400 line-through">
                  {safeToFixed(assignment.effective_hours || assignment.scheduled_hours || 0, 2, '0.00')}h
                </span>
                <span className="text-gray-900 font-bold">
                  → {editHours}h
                </span>
              </>
            ) : (
              <span className="text-gray-900">{safeToFixed(assignment.effective_hours, 2, '0.00')}h</span>
            )}
          </div>
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
          // EDIT MODE - Show subtle "Editing" tag
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-100 rounded">
            Editing
          </span>
        ) : (
          // VIEW MODE - Status badge + action buttons
          <div className="flex items-center justify-end gap-2">
            {assignment.status === 'no_show' ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                  <Ban className="h-3.5 w-3.5" />
                  No-Show
                </span>
                
                {/* Action Buttons - Allow editing no-show workers - Always visible */}
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
      <tr>
        <td colSpan={8} className="px-3 py-0">
          <div className="overflow-hidden transition-all duration-300 ease-in-out">
            <div className="py-2">
              {/* Neutral edit surface: soft gray panel */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Edit Hours Worked
                  </h4>
                  {/* Reset to scheduled link with undo icon */}
                  {assignment.scheduled_hours && (
                    <button
                      onClick={() => onEditHoursChange(String(assignment.scheduled_hours))}
                      className="text-xs text-gray-500 hover:text-gray-700 underline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 rounded px-1"
                      type="button"
                      aria-label={`Reset to scheduled ${assignment.scheduled_hours} hours`}
                    >
                      <Undo2 className="h-3 w-3" />
                      Reset to scheduled ({assignment.scheduled_hours}h)
                    </button>
                  )}
                </div>

                {/* Shift Context - Compact Inline */}
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-600 bg-white px-2 py-1 rounded">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <span>{shiftTime}</span>
                  {shiftDuration > 0 && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span>{shiftDuration} hour shift</span>
                    </>
                  )}
                </div>

                {/* Tighter spacing */}
                <div className="space-y-2.5">
                  {/* Hours Input with Controls + Updated Total on same row */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => adjustHours(-1)}
                        disabled={isSavingEdit}
                        className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1"
                        type="button"
                        aria-label="Decrease hours"
                        title="Decrease by 1 hour"
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={editHours}
                        onChange={(e) => onEditHoursChange(e.target.value)}
                        onKeyDown={onEditKeyDown}
                        disabled={isSavingEdit}
                        className="w-32 h-10 rounded-lg bg-white shadow-sm ring-1 ring-gray-300 focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 focus:outline-none px-3 text-center text-base font-semibold disabled:bg-gray-100"
                        placeholder="0.0"
                        autoFocus
                        aria-label="Hours worked"
                        aria-invalid={!!validationError}
                        aria-describedby={validationError ? `error-${assignment.id}` : undefined}
                      />
                      <button
                        onClick={() => adjustHours(1)}
                        disabled={isSavingEdit}
                        className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1"
                        type="button"
                        aria-label="Increase hours"
                        title="Increase by 1 hour"
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                    
                    {/* Updated Total + Inline Diff on right side */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xs text-gray-500">Updated Total</div>
                      <div 
                        className="text-lg font-bold text-gray-900"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        ${calculateLiveTotal(editHours, assignment.effective_hourly_rate || 0)}
                      </div>
                      {/* Inline diff: old → new */}
                      <div className="text-xs text-gray-600">
                        <span className="text-gray-400 line-through">
                          {safeToFixed(assignment.effective_hours || assignment.scheduled_hours || 0, 1, '0.0')}h
                        </span>
                        <span className="mx-1">→</span>
                        <span className="font-semibold text-gray-900">
                          {parseFloat(editHours).toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Validation error message */}
                  {validationError && (
                    <div id={`error-${assignment.id}`} className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {validationError}
                    </div>
                  )}

                  {/* Ghost quick buttons */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Quick:</span>
                    <button
                      onClick={() => adjustHours(-1)}
                      disabled={isSavingEdit}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors rounded"
                    >
                      -1h
                    </button>
                    <button
                      onClick={() => adjustHours(-0.5)}
                      disabled={isSavingEdit}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors rounded"
                    >
                      -0.5h
                    </button>
                    <button
                      onClick={() => adjustHours(0.5)}
                      disabled={isSavingEdit}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors rounded"
                    >
                      +0.5h
                    </button>
                    <button
                      onClick={() => adjustHours(1)}
                      disabled={isSavingEdit}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors rounded"
                    >
                      +1h
                    </button>
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
                    {/* Left: Destructive actions - Ghost buttons until hover */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onNoShow(assignment);
                          onCancelEdit();
                        }}
                        disabled={isSavingEdit}
                        className="px-2.5 py-1.5 text-xs font-medium text-orange-700 bg-transparent border border-transparent hover:bg-orange-50 hover:border-orange-200 rounded flex items-center gap-1 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-1"
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
                        className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-transparent border border-transparent hover:bg-red-50 hover:border-red-200 rounded flex items-center gap-1 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Deny
                      </button>
                    </div>

                    {/* Right: Save/Cancel - Primary only when dirty */}
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
                        disabled={isSavingEdit || parseFloat(editHours) === (assignment.effective_hours || assignment.scheduled_hours || 0)}
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-lg shadow-sm flex items-center gap-1.5 transition-colors",
                          parseFloat(editHours) !== (assignment.effective_hours || assignment.scheduled_hours || 0)
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
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

// Mobile Assignment Card Component
interface MobileAssignmentCardProps {
  assignment: AssignmentForApproval;
  event: any;
  isSelected: boolean;
  canSelect: boolean;
  onToggleSelect: (id: number) => void;
  onStatusChange: (id: number, status: string) => Promise<void>;
  editedValues: any;
  onEditValue: (id: number, field: string, value: any) => void;
  formatTimeInput: (date: string) => string;
  calculateHours: (timeIn: string, timeOut: string, breakMin: number, status: string) => string;
  getStatusValue: (assignment: AssignmentForApproval) => string;
  changingStatus: number | null;
}

function MobileAssignmentCard({
  assignment,
  event,
  isSelected,
  canSelect,
  onToggleSelect,
  onStatusChange,
  editedValues,
  onEditValue,
  formatTimeInput,
  calculateHours,
  getStatusValue,
  changingStatus
}: MobileAssignmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  
  const edited = editedValues[assignment.id] || {};
  const timeIn = edited.timeIn || assignment.scheduled_start;
  const timeOut = edited.timeOut || assignment.scheduled_end;
  const breakMinutes = edited.breakMinutes ?? (event?.schedule?.break_minutes || 0);
  const hourlyRate = edited.hourlyRate ?? assignment.effective_hourly_rate;
  const currentStatus = getStatusValue(assignment);
  
  const totalHours = calculateHours(timeIn, timeOut, breakMinutes, currentStatus);
  const totalPay = (parseFloat(totalHours) * hourlyRate).toFixed(2);
  
  const isDirty = Object.keys(edited).length > 0;

  return (
    <div 
      className={cn(
        "border rounded-lg overflow-hidden transition-all",
        currentStatus === 'approved' && "border-green-200 bg-green-50/30",
        currentStatus === 'no_show' && "border-red-200 bg-red-50/30",
        currentStatus === 'denied' && "border-gray-200 bg-gray-50/30",
        currentStatus === 'pending' && "border-amber-200 bg-white",
        isDirty && "ring-2 ring-teal-500"
      )}
    >
      {/* Card Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer active:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-2">
          {/* Worker Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {canSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect(assignment.id);
                }}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            
            <Avatar
              name={assignment.worker_name}
              src={assignment.worker_profile_photo_url}
              size={40}
            />
            
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">
                {assignment.worker_name}
              </div>
              <div className="text-sm text-gray-500">
                {assignment.shift_role}
              </div>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {currentStatus === 'approved' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3" />
                Approved
              </span>
            )}
            {currentStatus === 'pending' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                <Clock className="h-3 w-3" />
                Pending
              </span>
            )}
            {currentStatus === 'no_show' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                <XCircle className="h-3 w-3" />
                No Show
              </span>
            )}
            {currentStatus === 'denied' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                <Ban className="h-3 w-3" />
                Denied
              </span>
            )}
            
            {/* Expand Icon */}
            <button
              className="p-1 hover:bg-gray-100 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
        
        {/* Quick Summary (Collapsed State) */}
        {!isExpanded && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {totalHours}h × ${safeToFixed(hourlyRate, 2, '0.00')}
            </span>
            <span className="font-semibold text-gray-900">
              ${totalPay}
            </span>
          </div>
        )}
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4 bg-white">
          {/* Time Inputs */}
          <div className="space-y-3">
            {/* Time In */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Time In
              </label>
              <input
                type="time"
                value={formatTimeInput(timeIn)}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':').map(Number);
                  const date = new Date(timeIn);
                  date.setHours(hours, minutes, 0, 0);
                  onEditValue(assignment.id, 'timeIn', date.toISOString());
                }}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            {/* Time Out */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Time Out
              </label>
              <input
                type="time"
                value={formatTimeInput(timeOut)}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':').map(Number);
                  const date = new Date(timeOut);
                  date.setHours(hours, minutes, 0, 0);
                  onEditValue(assignment.id, 'timeOut', date.toISOString());
                }}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            {/* Break & Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Break (min)
                </label>
                <input
                  type="number"
                  min="0"
                  step="15"
                  value={breakMinutes}
                  onChange={(e) => onEditValue(assignment.id, 'breakMinutes', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-500 mt-1">
                  = {(breakMinutes / 60).toFixed(2)}h
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={hourlyRate}
                    onChange={(e) => onEditValue(assignment.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Calculation Summary */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Total Hours:</span>
              <span className="text-lg font-semibold text-gray-900">{totalHours}h</span>
            </div>
            <div className="text-xs text-gray-500 mb-3 text-right">
              ({formatTimeInput(timeIn)} - {formatTimeInput(timeOut)} - {breakMinutes}min)
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-300">
              <span className="text-sm text-gray-600">Total Pay:</span>
              <span className="text-xl font-bold text-gray-900">${totalPay}</span>
            </div>
            <div className="text-xs text-gray-500 text-right">
              ({totalHours}h × ${safeToFixed(hourlyRate, 2, '0.00')})
            </div>
          </div>
          
          {/* Status Change Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-between text-sm font-medium"
            >
              <span>Change Status</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                showActionMenu && "rotate-180"
              )} />
            </button>
            
            {showActionMenu && (
              <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg overflow-hidden">
                {/* If no-show, only show Cancel No Show */}
                {currentStatus === 'no_show' ? (
                  <button
                    onClick={async () => {
                      await onStatusChange(assignment.id, 'cancel_no_show');
                      setShowActionMenu(false);
                    }}
                    disabled={changingStatus === assignment.id}
                    className={cn(
                      "w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed",
                      currentStatus === 'no_show' && "bg-amber-50"
                    )}
                  >
                    {changingStatus === assignment.id ? (
                      <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                    ) : (
                      <Undo2 className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-sm font-medium text-amber-700">
                      {changingStatus === assignment.id ? 'Updating...' : 'Cancel No Show'}
                    </span>
                  </button>
                ) : (
                  <>
                    {/* Approve (if not already approved) */}
                    {currentStatus !== 'approved' && (
                      <button
                        onClick={async () => {
                          await onStatusChange(assignment.id, 'approved');
                          setShowActionMenu(false);
                        }}
                        disabled={changingStatus === assignment.id}
                        className={cn(
                          "w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {changingStatus === assignment.id ? (
                          <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        <span className="text-sm font-medium text-green-700">
                          {changingStatus === assignment.id ? 'Updating...' : 'Approve'}
                        </span>
                      </button>
                    )}
                    
                    {/* Reject (if not already denied) */}
                    {currentStatus !== 'denied' && (
                      <button
                        onClick={async () => {
                          await onStatusChange(assignment.id, 'denied');
                          setShowActionMenu(false);
                        }}
                        disabled={changingStatus === assignment.id}
                        className={cn(
                          "w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border-t"
                        )}
                      >
                        {changingStatus === assignment.id ? (
                          <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4 text-gray-600" />
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {changingStatus === assignment.id ? 'Updating...' : 'Reject'}
                        </span>
                      </button>
                    )}
                    
                    {/* No Show (if not already no-show) */}
                    {currentStatus !== 'no_show' && (
                      <button
                        onClick={async () => {
                          await onStatusChange(assignment.id, 'no_show');
                          setShowActionMenu(false);
                        }}
                        disabled={changingStatus === assignment.id}
                        className={cn(
                          "w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed border-t"
                        )}
                      >
                        {changingStatus === assignment.id ? (
                          <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium text-red-700">
                          {changingStatus === assignment.id ? 'Updating...' : 'No Show'}
                        </span>
                      </button>
                    )}
                    
                    {/* Unapprove (only if currently approved) */}
                    {currentStatus === 'approved' && (
                      <button
                        onClick={async () => {
                          await onStatusChange(assignment.id, 'pending');
                          setShowActionMenu(false);
                        }}
                        disabled={changingStatus === assignment.id}
                        className={cn(
                          "w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed border-t",
                          currentStatus === 'approved' && "bg-amber-50"
                        )}
                      >
                        {changingStatus === assignment.id ? (
                          <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-600" />
                        )}
                        <span className="text-sm font-medium text-amber-700">
                          {changingStatus === assignment.id ? 'Updating...' : 'Unapprove'}
                        </span>
                        {currentStatus === 'approved' && changingStatus !== assignment.id && (
                          <Check className="h-4 w-4 ml-auto text-amber-600" />
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
  const [validationErrors, setValidationErrors] = useState<{ [assignmentId: number]: string }>({});
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
  
  // Spreadsheet-style inline editing state
  const [editedValues, setEditedValues] = useState<{
    [assignmentId: number]: {
      timeIn?: string;
      timeOut?: string;
      breakMinutes?: number;
      hourlyRate?: number;
      notes?: string;
      status?: string;
      approved?: boolean;
    }
  }>({});
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Loading state for status changes
  const [changingStatus, setChangingStatus] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && event) {
      loadAssignments();
      setSelectedAssignmentIds(new Set()); // Reset selection when modal opens
      setEditedValues({}); // Reset edited values when modal opens
    }
  }, [isOpen, event]);
  
  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px = md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Get the current status value (handles approved flag + status field + edited values)
  const getStatusValue = (assignment: AssignmentForApproval): string => {
    const edited = editedValues[assignment.id];
    
    // If edited, use edited status
    if (edited?.status) {
      return edited.status;
    }
    
    // CRITICAL: Check status first (cancelled/removed/no_show override approved flag)
    // This ensures denied/no-show assignments show correctly even if approved flag is set
    if (assignment.status === 'cancelled' || assignment.status === 'removed') {
      return 'denied';
    }
    if (assignment.status === 'no_show') {
      return 'no_show';
    }
    
    // If approved flag is true and status is not cancelled/removed/no_show, status is approved
    if (assignment.approved) {
      return 'approved';
    }
    
    // Default to pending
    return 'pending';
  };

  // Calculate hours for an assignment (with edited values) - returns number for calculations
  const calculateHoursForAssignment = (assignment: AssignmentForApproval): number => {
    const edited = editedValues[assignment.id] || {};
    const status = getStatusValue(assignment);
    
    const timeIn = edited.timeIn || assignment.scheduled_start;
    const timeOut = edited.timeOut || assignment.scheduled_end;
    const breakMinutes = edited.breakMinutes ?? (event?.schedule?.break_minutes || 0);
    
    const hoursString = calculateHours(timeIn, timeOut, breakMinutes, status);
    return parseFloat(hoursString);
  };

  // Calculate pay for an assignment
  const calculatePayForAssignment = (assignment: AssignmentForApproval): number => {
    const edited = editedValues[assignment.id] || {};
    const hours = calculateHoursForAssignment(assignment);
    const rate = edited.hourlyRate ?? assignment.effective_hourly_rate;
    return hours * rate;
  };

  // Format time for input field (HH:MM)
  const formatTimeInput = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toTimeString().slice(0, 5); // "09:00"
    } catch (error) {
      console.error('Error formatting time:', error);
      return '09:00';
    }
  };

  // Format time (12-hour format: "1:00 PM")
  const formatTime = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  // Calculate scheduled hours from event schedule
  const calculateScheduledHours = (schedule: any): string => {
    if (!schedule?.start_time_utc || !schedule?.end_time_utc) return '0.00';
    
    try {
      const start = new Date(schedule.start_time_utc);
      const end = new Date(schedule.end_time_utc);
      const durationMs = end.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const breakHours = (schedule.break_minutes || 0) / 60;
      
      return Math.max(0, durationHours - breakHours).toFixed(2);
    } catch (error) {
      console.error('Error calculating scheduled hours:', error);
      return '0.00';
    }
  };

  // Handle time input changes
  const handleTimeChange = (
    assignmentId: number, 
    field: 'timeIn' | 'timeOut', 
    value: string,
    originalTime: string
  ) => {
    // Parse the time input (HH:MM)
    const [hours, minutes] = value.split(':').map(Number);
    
    // Use the original date but update time
    const date = new Date(originalTime);
    date.setHours(hours, minutes, 0, 0);
    
    setEditedValues(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: date.toISOString()
      }
    }));
  };

  // Calculate total hours (simple and clear)
  const calculateHours = (
    timeIn: string, 
    timeOut: string, 
    breakMinutes: number,
    status: string
  ): string => {
    // No-show and denied = 0 hours
    if (status === 'no_show' || status === 'denied') {
      return '0.00';
    }
    
    try {
      const start = new Date(timeIn);
      const end = new Date(timeOut);
      
      // Calculate duration in hours
      const durationMs = end.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      
      // Subtract break time
      const breakHours = breakMinutes / 60;
      
      // Return net hours (can't be negative)
      return Math.max(0, durationHours - breakHours).toFixed(2);
    } catch (error) {
      console.error('Error calculating hours:', error);
      return '0.00';
    }
  };

  // Handle cell edit (for break and hourly rate)
  const handleCellEdit = (assignmentId: number, field: 'breakMinutes' | 'hourlyRate', value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: value
      }
    }));
  };

  // Handle status change - Save immediately
  const handleStatusChange = async (assignmentId: number, newStatus: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    // Prevent multiple simultaneous changes
    if (changingStatus === assignmentId) return;
    
    setChangingStatus(assignmentId);
    try {
      if (newStatus === 'cancel_no_show') {
        // Cancel no-show: restore assignment to pending/assigned status by updating hours
        // This will restore status from no_show to 'assigned' and recalculate hours
        const edited = editedValues[assignmentId] || {};
        const timeIn = edited.timeIn || assignment.scheduled_start;
        const timeOut = edited.timeOut || assignment.scheduled_end;
        const breakMinutes = edited.breakMinutes ?? (event?.schedule?.break_minutes || 0);
        
        // Calculate hours from time in/out (use 'pending' status so hours are calculated)
        const hoursString = calculateHours(timeIn, timeOut, breakMinutes, 'pending');
        const calculatedHours = parseFloat(hoursString);
        
        // Update hours - this will restore status from no_show to 'assigned' and set hours
        await apiClient.patch(`/approvals/${assignmentId}/update_hours`, {
          hours_worked: calculatedHours
        });
      } else if (newStatus === 'approved') {
        // If assignment is no_show, cancelled, or removed, we need to restore it first
        // by updating hours (which restores status to 'assigned' and recalculates hours)
        if (assignment.status === 'no_show' || assignment.status === 'cancelled' || assignment.status === 'removed') {
          // First, restore the assignment and recalculate hours
          const edited = editedValues[assignmentId] || {};
          const timeIn = edited.timeIn || assignment.scheduled_start;
          const timeOut = edited.timeOut || assignment.scheduled_end;
          const breakMinutes = edited.breakMinutes ?? (event?.schedule?.break_minutes || 0);
          
          // Calculate hours from time in/out
          const hoursString = calculateHours(timeIn, timeOut, breakMinutes, 'approved');
          const calculatedHours = parseFloat(hoursString);
          
          // Update hours - this will restore status from no_show to 'assigned' and set hours
          await apiClient.patch(`/approvals/${assignmentId}/update_hours`, {
            hours_worked: calculatedHours
          });
        }
        
        // Now approve the assignment (it should be in 'assigned' status now)
        await apiClient.post(`/events/${event.id}/approve_selected`, {
          assignment_ids: [assignmentId]
        });
      } else if (newStatus === 'no_show') {
        // Mark as no-show
        await apiClient.post(`/approvals/${assignmentId}/mark_no_show`, {
          notes: ''
        });
      } else if (newStatus === 'denied') {
        // Remove/deny the assignment
        await apiClient.delete(`/approvals/${assignmentId}/remove`, {
          data: { notes: '' }
        });
      } else if (newStatus === 'pending') {
        // Unapprove: If it was approved, we need to un-approve it by updating hours
        // This will reset the approved status
        const edited = editedValues[assignmentId] || {};
        const timeIn = edited.timeIn || assignment.scheduled_start;
        const timeOut = edited.timeOut || assignment.scheduled_end;
        const breakMinutes = edited.breakMinutes ?? (event?.schedule?.break_minutes || 0);
        const calculatedHours = calculateHoursForAssignment(assignment);
        
        await apiClient.patch(`/approvals/${assignmentId}/update_hours`, {
          hours_worked: calculatedHours
        });
      }
      
      // Reload assignments to get updated status
      await loadAssignments();
      
      // Clear this assignment from editedValues since it's now saved
      setEditedValues(prev => {
        const next = { ...prev };
        if (next[assignmentId]) {
          // Keep other edits (time, rate, etc.) but remove status since it's saved
          const { status, approved, ...rest } = next[assignmentId];
          if (Object.keys(rest).length > 0) {
            next[assignmentId] = rest;
          } else {
            delete next[assignmentId];
          }
        }
        return next;
      });
      
      setToast({ 
        isVisible: true, 
        type: 'success', 
        message: `Status updated to ${newStatus.replace('_', ' ')}`
      });
    } catch (error: any) {
      console.error('Error changing status:', error);
      setToast({ 
        isVisible: true, 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to update status' 
      });
    } finally {
      setChangingStatus(null);
    }
  };

  // Save all changes
  const handleSaveAllChanges = async () => {
    const assignmentIds = Object.keys(editedValues).map(Number);
    if (assignmentIds.length === 0) return;
    
    setIsSavingEdit(true);
    try {
      await Promise.all(
        assignmentIds.map(async (assignmentId) => {
          const assignment = assignments.find(a => a.id === assignmentId);
          if (!assignment) return;
          
          const edited = editedValues[assignmentId];
          const timeIn = edited.timeIn || assignment.scheduled_start;
          const timeOut = edited.timeOut || assignment.scheduled_end;
          const breakMinutes = edited.breakMinutes ?? (event?.schedule?.break_minutes || 0);
          
          const calculatedHours = calculateHoursForAssignment(assignment);
          
          const updatePayload: any = {
            hours_worked: calculatedHours
          };
          
          if (edited.hourlyRate !== undefined) {
            updatePayload.hourly_rate = edited.hourlyRate;
          }
          
          if (edited.notes !== undefined) {
            updatePayload.approval_notes = edited.notes;
          }

          // Handle status changes
          if (edited.status !== undefined) {
            if (edited.status === 'approved') {
              // Approve the assignment
              return apiClient.post(`/events/${event.id}/approve_selected`, {
                assignment_ids: [assignmentId]
              });
            } else if (edited.status === 'no_show') {
              // Mark as no-show
              return apiClient.post(`/approvals/${assignmentId}/mark_no_show`, {
                notes: edited.notes || ''
              });
            } else if (edited.status === 'denied') {
              // Remove/deny the assignment
              return apiClient.delete(`/approvals/${assignmentId}/remove`, {
                data: { notes: edited.notes || '' }
              });
            } else if (edited.status === 'pending') {
              // If it was approved, we need to un-approve it
              // For now, just update hours - status will remain as is
              return apiClient.patch(`/approvals/${assignmentId}/update_hours`, updatePayload);
            }
          }

          return apiClient.patch(`/approvals/${assignmentId}/update_hours`, updatePayload);
        })
      );
      
      setToast({ isVisible: true, type: 'success', message: `Saved changes for ${assignmentIds.length} assignment(s)` });
      await loadAssignments();
      setEditedValues({});
    } catch (error: any) {
      console.error('Error saving changes:', error);
      setToast({ 
        isVisible: true, 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to save changes' 
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Approve single row
  const handleApproveRow = async (assignmentId: number) => {
    try {
      await apiClient.post(`/events/${event.id}/approve_selected`, {
        assignment_ids: [assignmentId]
      });
      await loadAssignments();
      onSuccess();
      setToast({ isVisible: true, type: 'success', message: 'Assignment approved' });
    } catch (error: any) {
      console.error('Error approving assignment:', error);
      setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to approve assignment' });
    }
  };

  /**
   * Start editing a worker's hours inline
   */
  const handleStartEdit = (assignment: AssignmentForApproval) => {
    setEditingAssignmentId(assignment.id);
    setEditHours(String(assignment.effective_hours || assignment.hours_worked || assignment.scheduled_hours || '0'));
    setWasApprovedBeforeEdit(false);
    // Clear validation error for this assignment
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[assignment.id];
      return next;
    });
  };

  /**
   * Cancel editing and reset state
   */
  const handleCancelEdit = () => {
    if (editingAssignmentId) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[editingAssignmentId];
        return next;
      });
    }
    setEditingAssignmentId(null);
    setEditHours('');
    setWasApprovedBeforeEdit(false);
  };

  /**
   * Validate hours input
   */
  const validateHours = (hours: string, assignment: AssignmentForApproval): string | null => {
    const hoursValue = parseFloat(hours);
    
    if (isNaN(hoursValue)) {
      return 'Please enter a valid number';
    }
    
    if (hoursValue < 0) {
      return 'Hours cannot be negative';
    }
    
    if (hoursValue > 24) {
      return 'Hours cannot exceed 24 per shift';
    }
    
    // Allow hours to exceed scheduled hours (for overtime, extended shifts, etc.)
    // Backend only validates 0-24 hours range
    
    return null;
  };

  /**
   * Handle hours change with validation
   */
  const handleEditHoursChange = (hours: string) => {
    setEditHours(hours);
    
    if (!editingAssignmentId) return;
    
    const assignment = assignments.find(a => a.id === editingAssignmentId);
    if (!assignment) return;
    
    const error = validateHours(hours, assignment);
    setValidationErrors(prev => ({
      ...prev,
      [editingAssignmentId]: error || ''
    }));
  };

  /**
   * Save edited hours and update assignment
   */
  const handleSaveEdit = async () => {
    if (!editingAssignmentId) return;
    
    const assignment = assignments.find(a => a.id === editingAssignmentId);
    if (!assignment) return;
    
    const hoursValue = parseFloat(editHours);
    
    // Validation
    const error = validateHours(editHours, assignment);
    if (error) {
      setValidationErrors(prev => ({
        ...prev,
        [editingAssignmentId]: error
      }));
      setToast({ isVisible: true, type: 'error', message: error });
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
      
      // Show success toast
      setToast({ 
        isVisible: true, 
        type: 'success', 
        message: response.data?.message || 'Hours updated successfully' 
      });
    } catch (error: any) {
      console.error('Error updating hours:', error);
      setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to update hours. Please try again.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  /**
   * Handle keyboard shortcuts in edit mode
   * Arrow keys: step by 0.5; Shift+Arrow: step by 1
   */
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseFloat(editHours) || 0;
      const step = e.shiftKey ? 1 : 0.5;
      const newValue = e.key === 'ArrowUp' 
        ? Math.min(24, current + step)
        : Math.max(0, current - step);
      setEditHours(newValue.toFixed(2));
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

  // Status badge component (professional pill-style) - Updated to match design system
  const StatusBadge = ({ assignment }: { assignment: AssignmentForApproval }) => {
    const status = getStatusValue(assignment);
    
    const statusConfig = {
      approved: {
        icon: CheckCircle,
        label: 'Approved',
        dotColor: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      pending: {
        icon: Clock,
        label: 'Pending',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      },
      no_show: {
        icon: XCircle,
        label: 'No Show',
        dotColor: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      denied: {
        icon: Ban,
        label: 'Denied',
        dotColor: 'bg-gray-500',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

  return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border",
        config.bgColor,
        config.textColor,
        config.borderColor
      )}>
        <div className={cn("h-2 w-2 rounded-full", config.dotColor)} />
        <Icon className="h-4 w-4" />
        <span>{config.label}</span>
      </div>
    );
  };

  // Action menu state
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  // Action menu component (3-dot menu) - Uses fixed positioning to escape modal overflow
  const ActionMenu = ({ assignmentId }: { assignmentId: number }) => {
    const isOpen = openActionMenu === assignmentId;
    const assignment = assignments.find(a => a.id === assignmentId);
    const currentStatus = getStatusValue(assignment || assignments[0]);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = React.useState<{ top: number; right: number } | null>(null);

    // Build menu items based on current status
    // Order: Approve, Reject, Unapprove (or Cancel No Show if no-show)
    const menuItems = React.useMemo(() => {
      const items = [];
      
      // If status is "no_show", show "Cancel No Show" instead of other options
      if (currentStatus === 'no_show') {
        items.push({
          value: 'cancel_no_show',
          label: 'Cancel No Show',
          icon: Undo2, // Use undo icon to indicate restoration
          color: 'text-amber-600',
          hoverBg: 'hover:bg-amber-50',
          disabled: false
        });
        return items; // Only show cancel option for no-show
      }
      
      // For all other statuses, show Approve, Reject, and No Show
      // Approve (if not already approved)
      if (currentStatus !== 'approved') {
        items.push({
          value: 'approved',
          label: 'Approve',
          icon: CheckCircle,
          color: 'text-green-600',
          hoverBg: 'hover:bg-green-50',
          disabled: false
        });
      }
      
      // Reject (if not already denied)
      if (currentStatus !== 'denied') {
        items.push({
          value: 'denied',
          label: 'Reject',
          icon: Ban,
          color: 'text-gray-600',
          hoverBg: 'hover:bg-gray-50',
          disabled: false
        });
      }
      
      // No Show (if not already no-show)
      if (currentStatus !== 'no_show') {
        items.push({
          value: 'no_show',
          label: 'No Show',
          icon: XCircle,
          color: 'text-red-600',
          hoverBg: 'hover:bg-red-50',
          disabled: false
        });
      }
      
      // Unapprove (only if currently approved)
      if (currentStatus === 'approved') {
        items.push({
          value: 'pending',
          label: 'Unapprove',
          icon: Clock,
          color: 'text-amber-600',
          hoverBg: 'hover:bg-amber-50',
          disabled: false
        });
      }
      
      return items;
    }, [currentStatus]);

    // Calculate menu position when opening
    React.useEffect(() => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 8, // 8px gap (mt-2)
          right: window.innerWidth - rect.right // Align right edge
        });
      } else {
        setMenuPosition(null);
      }
    }, [isOpen]);

    return (
      <>
        {/* Trigger Button */}
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setOpenActionMenu(isOpen ? null : assignmentId);
          }}
          className={cn(
            "p-1.5 rounded transition-colors",
            isOpen 
              ? "bg-gray-100 text-gray-600" 
              : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          )}
          title="Change status"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        
        {/* Menu Dropdown - Fixed positioning to escape modal overflow */}
        {isOpen && menuPosition && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={() => setOpenActionMenu(null)}
            />
            
            {/* Menu Dropdown - Fixed positioning */}
            <div 
              className="fixed w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[101]"
              style={{
                top: `${menuPosition.top}px`,
                right: `${menuPosition.right}px`
              }}
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                
                return (
                  <button
                    key={item.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!item.disabled && changingStatus !== assignmentId) {
                        handleStatusChange(assignmentId, item.value);
                        setOpenActionMenu(null);
                      }
                    }}
                    disabled={item.disabled || changingStatus === assignmentId}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors",
                      (item.disabled || changingStatus === assignmentId)
                        ? "opacity-40 cursor-not-allowed" 
                        : `${item.color} cursor-pointer`,
                      item.disabled && currentStatus === item.value && "bg-gray-50"
                    )}
                  >
                    {changingStatus === assignmentId ? (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>{changingStatus === assignmentId ? 'Updating...' : item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  };

  // Calculate totals (memoized for performance)
  const totals = React.useMemo(() => {
    let totalHours = 0;
    let totalPay = 0;
    let approvedPay = 0;
    let approvedCount = 0;
    let deniedCount = 0;
    
    assignments.forEach(assignment => {
      const status = getStatusValue(assignment);
      const hours = calculateHoursForAssignment(assignment);
      const pay = calculatePayForAssignment(assignment);
      
      // Only add hours/pay if not denied or no-show
      if (status !== 'no_show' && status !== 'denied') {
        totalHours += hours;
        totalPay += pay;
      }
      
      if (status === 'approved') {
        approvedPay += pay;
        approvedCount++;
      } else if (status === 'no_show' || status === 'denied') {
        deniedCount++;
      }
    });
    
    return {
      totalHours: totalHours.toFixed(2),
      totalPay: totalPay.toFixed(2),
      approvedPay: approvedPay.toFixed(2),
      approvedCount,
      deniedCount,
      pendingCount: assignments.length - approvedCount - deniedCount
    };
  }, [assignments, editedValues, event?.schedule?.break_minutes]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      {/* Render Toast at overlay level */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
      
      {/* Simple Modal Container */}
      <div className="bg-white rounded-lg w-full max-w-[95vw] max-h-[90vh] flex flex-col shadow-xl">
        {/* Header - Responsive */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Approve Hours</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Event Info - Stack on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
            <span className="font-medium">{event?.title}</span>
                {event?.schedule?.start_time_utc && (
              <>
                <span className="hidden sm:inline">•</span>
                <span>{format(parseISO(event.schedule.start_time_utc), 'MMM d, yyyy')}</span>
              </>
                )}
                {event?.venue?.name && (
              <>
                <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 sm:hidden" />
                    {event.venue.name}
                  </span>
              </>
                )}
              </div>
          
          {/* Original Schedule Box - More compact on mobile */}
          {event?.schedule && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 mb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Original Schedule:</span>
            </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700 ml-6 sm:ml-0">
                  <span>
                    <span className="font-medium">Time:</span> {formatTime(event.schedule.start_time_utc)} - {formatTime(event.schedule.end_time_utc)}
                  </span>
                  <span>
                    <span className="font-medium">Break:</span> {event.schedule.break_minutes || 0} min
                  </span>
                  <span>
                    <span className="font-medium">Scheduled:</span> {calculateScheduledHours(event.schedule)}h
                  </span>
          </div>
              </div>
          </div>
        )}

          {/* Status Pills - Wrap on mobile */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium">{totals.approvedCount} Approved</span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="font-medium">{totals.deniedCount} Denied</span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="font-medium">{totals.pendingCount} Pending</span>
            </span>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              <p className="mt-4 text-gray-600">Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No assignments found for this event.</p>
            </div>
          ) : isMobile ? (
            // ✅ MOBILE: Card Layout
            <div className="p-4 space-y-3">
              {assignments.map((assignment) => (
                <MobileAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  event={event}
                  isSelected={selectedAssignmentIds.has(assignment.id)}
                  canSelect={!assignment.approved && assignment.can_approve && assignment.status !== 'no_show' && assignment.status !== 'cancelled'}
                  onToggleSelect={toggleSelection}
                  onStatusChange={handleStatusChange}
                  editedValues={editedValues}
                  onEditValue={(id, field, value) => {
                    setEditedValues(prev => ({
                      ...prev,
                      [id]: {
                        ...prev[id],
                        [field]: value
                      }
                    }));
                  }}
                  formatTimeInput={formatTimeInput}
                  calculateHours={calculateHours}
                  getStatusValue={getStatusValue}
                  changingStatus={changingStatus}
                />
              ))}
            </div>
          ) : (
            // ✅ DESKTOP: Table Layout
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="w-12 px-4 py-3">
                    {eligibleAssignments.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedEligible.length === eligibleAssignments.length && eligibleAssignments.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        title={selectedEligible.length === eligibleAssignments.length ? "Deselect all" : "Select all"}
                      />
                    )}
                  </th>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time In</th>
                  <th className="px-4 py-3">Time Out</th>
                  <th className="px-4 py-3">Break</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Pay</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => {
                  const edited = editedValues[assignment.id] || {};
                  const timeIn = edited.timeIn || assignment.scheduled_start;
                  const timeOut = edited.timeOut || assignment.scheduled_end;
                  const breakMinutes = edited.breakMinutes ?? (event?.schedule?.break_minutes || 0);
                  const hourlyRate = edited.hourlyRate ?? assignment.effective_hourly_rate;
                  const currentStatus = getStatusValue(assignment);
                  const canSelect = !assignment.approved && assignment.can_approve && assignment.status !== 'no_show' && assignment.status !== 'cancelled';
                  
                  const totalHours = calculateHours(timeIn, timeOut, breakMinutes, currentStatus);
                  const totalPay = (parseFloat(totalHours) * hourlyRate).toFixed(2);
                  
                  return (
                    <tr 
                      key={assignment.id}
                      className="hover:bg-gray-50 border-l-4 border-l-transparent hover:border-l-teal-500"
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        {canSelect && (
                          <input
                            type="checkbox"
                            checked={selectedAssignmentIds.has(assignment.id)}
                            onChange={() => toggleSelection(assignment.id)}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                        )}
                      </td>
                      
                      {/* Worker */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-medium">
                            {assignment.worker_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                          </div>
              <div>
                            <div className={cn(
                              "font-medium text-gray-900",
                              (assignment.status === 'cancelled' || assignment.status === 'removed') && "line-through text-gray-500",
                              assignment.status === 'no_show' && "text-gray-700"
                            )}>
                              {assignment.worker_name}
                </div>
                            <div className="text-xs text-gray-500">
                              ID: {assignment.worker_id || 'N/A'}
              </div>
                </div>
              </div>
                      </td>
                      
                      {/* Position */}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {assignment.shift_role || 'N/A'}
                      </td>
                      
                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(assignment.shift_date || assignment.scheduled_start)}
                      </td>
                      
                      {/* Time In */}
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={formatTimeInput(timeIn)}
                          onChange={(e) => handleTimeChange(assignment.id, 'timeIn', e.target.value, timeIn)}
                          className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </td>
                      
                      {/* Time Out */}
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={formatTimeInput(timeOut)}
                          onChange={(e) => handleTimeChange(assignment.id, 'timeOut', e.target.value, timeOut)}
                          className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </td>
                      
                      {/* Break */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="15"
                            value={breakMinutes}
                            onChange={(e) => {
                              setEditedValues(prev => ({
                                ...prev,
                                [assignment.id]: {
                                  ...prev[assignment.id],
                                  breakMinutes: parseInt(e.target.value) || 0
                                }
                              }));
                            }}
                            className="w-16 px-2 py-2 text-sm border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <span className="text-xs text-gray-500">min</span>
                  </div>
                        <div className="text-xs text-gray-500 mt-1">
                          = {(breakMinutes / 60).toFixed(2)}h
                </div>
                      </td>
                      
                      {/* Total Hours - Calculated */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-gray-900">
                          {totalHours}h
                  </div>
                        <div className="text-xs text-gray-500">
                          ({formatTimeInput(timeIn)} - {formatTimeInput(timeOut)} - {breakMinutes}min)
                </div>
                      </td>
                      
                      {/* Hourly Rate */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={hourlyRate}
                            onChange={(e) => {
                              setEditedValues(prev => ({
                                ...prev,
                                [assignment.id]: {
                                  ...prev[assignment.id],
                                  hourlyRate: parseFloat(e.target.value) || 0
                                }
                              }));
                            }}
                            className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
            </div>
                      </td>
                      
                      {/* Total Pay - Calculated */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-gray-900">
                          ${totalPay}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({totalHours}h × ${safeToFixed(hourlyRate, 2, '0.00')})
                        </div>
                      </td>
                      
                      {/* Status - Simple Badge */}
                      <td className="px-4 py-3">
                        {currentStatus === 'approved' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approved
              </span>
                        )}
                        {currentStatus === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            Pending
              </span>
                        )}
                        {currentStatus === 'no_show' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                            <XCircle className="h-3.5 w-3.5" />
                            No Show
              </span>
                        )}
                        {currentStatus === 'denied' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            <Ban className="h-3.5 w-3.5" />
                            Denied
                          </span>
                        )}
                      </td>
                      
                      {/* Action Menu - Simple */}
                      <td className="px-4 py-3">
                        <ActionMenu assignmentId={assignment.id} />
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            </div>

        {/* Footer - Responsive */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Left: Close Button (full width on mobile) */}
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              Close
            </button>
            
            {/* Right: Action Buttons + Summary (stack on mobile) */}
            <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-3">
              {/* Action Buttons (stack on mobile) */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {totals.pendingCount > 0 && (
              <button
                    onClick={handleApproveAll}
                    disabled={isApproving}
                    className="w-full sm:w-auto px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                        Approve All Pending ({totals.pendingCount})
                      </>
                    )}
                  </button>
                )}
                
                {selectedEligible.length > 0 && (
                  <button
                    onClick={() => {
                      const selectedIds = Array.from(selectedEligible.map(a => a.id));
                      setConfirmDialog({
                        open: true,
                        title: 'Mark Selected as No-Show',
                        message: `Mark ${selectedIds.length} selected ${selectedIds.length === 1 ? 'worker' : 'workers'} as no-show?`,
                        requireNote: true,
                        note: '',
                        variant: 'warning',
                        onConfirm: async (note?: string) => {
                          const noteToSend = note || confirmDialog.note || '';
                          setConfirmDialog({ open: false, title: '' });
                          try {
                            await Promise.all(
                              selectedIds.map(id => 
                                apiClient.post(`/approvals/${id}/mark_no_show`, { notes: noteToSend })
                              )
                            );
                            await loadAssignments();
                            setSelectedAssignmentIds(new Set());
                            setToast({ isVisible: true, type: 'success', message: `Marked ${selectedIds.length} as no-show` });
                          } catch (error: any) {
                            console.error('Error marking no-show:', error);
                            setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to mark as no-show' });
                          }
                        }
                      });
                    }}
                    disabled={selectedEligible.length === 0}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="h-4 w-4" />
                    Mark Selected as No-Show ({selectedEligible.length})
                  </button>
                )}
                
                {Object.keys(editedValues).length > 0 && (
                  <button
                    onClick={handleSaveAllChanges}
                    disabled={isSavingEdit}
                    className="w-full sm:w-auto px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes ({Object.keys(editedValues).length})
                  </>
                )}
              </button>
            )}
            </div>
              
              {/* Summary Stats (grid on mobile, flex on desktop) */}
              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-8 text-sm">
                <div>
                  <span className="text-gray-600">Total Hours: </span>
                  <span className="font-semibold text-gray-900">{totals.totalHours}</span>
          </div>
                <div>
                  <span className="text-gray-600">Total Pay: </span>
                  <span className="font-semibold text-gray-900">${totals.totalPay}</span>
                </div>
                <div>
                  <span className="text-green-600">Approved: </span>
                  <span className="font-semibold text-green-700">${totals.approvedPay}</span>
                </div>
                <div>
                  <span className="text-amber-600">Pending: </span>
                  <span className="font-semibold text-amber-700">${(parseFloat(totals.totalPay) - parseFloat(totals.approvedPay)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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
