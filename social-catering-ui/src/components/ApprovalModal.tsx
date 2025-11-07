import React, { useState, useEffect } from 'react';
import { safeToFixed } from '../utils/number';
import { cn } from '../lib/utils';
import { X, Check, Ban, Trash2, AlertCircle, Clock, Edit2, User, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Toast } from './common/Toast';
import { format, parseISO } from 'date-fns';

interface AssignmentForApproval {
  id: number;
  worker_id: number;
  worker_name: string;
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
  editData: any;
  onEdit: (assignment: AssignmentForApproval) => void;
  onSave: (assignmentId: number) => void;
  onCancel: () => void;
  onEditDataChange: (data: any) => void;
  onNoShow: (assignment: AssignmentForApproval) => void;
  onRemove: (assignment: AssignmentForApproval) => void;
  onReEdit: (assignment: AssignmentForApproval) => void;
}

function WorkerRow({ 
  assignment, 
  isEditing, 
  editData, 
  onEdit, 
  onSave, 
  onCancel, 
  onEditDataChange,
  onNoShow, 
  onRemove, 
  onReEdit 
}: WorkerRowProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch {
      return new Date(dateString).toLocaleString();
    }
  };

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={6} className="py-4 px-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-blue-900">Edit Hours Worked</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hours Worked
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={editData.hours_worked || ''}
                  onChange={(e) => onEditDataChange({ ...editData, hours_worked: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Actual Start Time
                </label>
                <input
                  type="datetime-local"
                  value={editData.actual_start_time_utc ? new Date(editData.actual_start_time_utc).toISOString().slice(0, 16) : ''}
                  onChange={(e) => onEditDataChange({ ...editData, actual_start_time_utc: new Date(e.target.value).toISOString() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Actual End Time
                </label>
                <input
                  type="datetime-local"
                  value={editData.actual_end_time_utc ? new Date(editData.actual_end_time_utc).toISOString().slice(0, 16) : ''}
                  onChange={(e) => onEditDataChange({ ...editData, actual_end_time_utc: new Date(e.target.value).toISOString() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onSave(assignment.id)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {/* Desktop View (sm and up) */}
      <tr
        className={`hidden sm:table-row group transition-all duration-150 ease-in-out ${
          assignment.approved 
            ? 'bg-green-50/30' 
            : assignment.status === 'no_show'
            ? 'bg-red-50/30'
            : assignment.status === 'cancelled'
            ? 'bg-gray-50/30'
            : 'hover:bg-gray-50'
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
      {/* Worker Info */}
      <td className="py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {assignment.worker_name}
            </div>
            <div className="text-xs text-gray-500">
              Scheduled: {safeToFixed(assignment.scheduled_hours, 2, '0.00')}h
            </div>
          </div>
        </div>
        
        {/* Approval metadata - only if approved */}
        {assignment.approved && assignment.approved_by_name && (
          <div className="mt-2 text-xs text-gray-500 ml-11">
            Approved by {assignment.approved_by_name} on {formatDateTime(assignment.approved_at)}
          </div>
        )}
      </td>

      {/* Role */}
      <td className="py-4 text-sm text-gray-700">
        {assignment.shift_role || 'N/A'}
      </td>

      {/* Hours */}
      <td className="py-4 text-right">
        <span className="text-sm font-medium text-gray-900">
          {safeToFixed(assignment.effective_hours, 2, '0.00')}h
          {assignment.edited_at && (
            <span className="ml-1 text-xs text-orange-600" title="Edited">
              <Edit2 className="h-3 w-3 inline" />
            </span>
          )}
        </span>
      </td>

      {/* Rate */}
      <td className="py-4 text-right text-sm text-gray-700">
        ${safeToFixed(assignment.effective_hourly_rate, 2, '0.00')}/h
      </td>

      {/* Total Pay */}
      <td className="py-4 text-right">
        <span className="text-sm font-semibold text-gray-900">
          ${safeToFixed(assignment.effective_pay, 2, '0.00')}
        </span>
      </td>

      {/* Status & Actions */}
      <td className="py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {assignment.status === 'no_show' ? (
            <>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                <Ban className="h-3.5 w-3.5" />
                No-Show
              </span>
            </>
          ) : assignment.status === 'cancelled' ? (
            <>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                <X className="h-3.5 w-3.5" />
                Cancelled
              </span>
            </>
          ) : assignment.approved ? (
            <>
              {/* Approved badge */}
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                <Check className="h-3.5 w-3.5" />
                Approved
              </span>
              {/* Re-edit button - only visible on hover */}
              {assignment.can_edit_hours && (
                <button
                  onClick={() => onReEdit(assignment)}
                  className={`text-xs text-gray-600 hover:text-gray-900 transition-all duration-200 ease-in-out ${
                    showActions ? 'opacity-100' : 'opacity-0'
                  }`}
                  title="Re-edit approved hours"
                >
                  Re-edit
                </button>
              )}
            </>
          ) : (
            <>
              {/* Pending badge */}
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded">
                <Clock className="h-3.5 w-3.5" />
                Pending
              </span>
              {/* Action buttons - only visible on hover */}
              {assignment.can_edit_hours && (
                <div
                  className={`flex items-center gap-1 transition-all duration-200 ease-in-out ${
                    showActions ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <button
                    onClick={() => onEdit(assignment)}
                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200 ease-in-out"
                    title="Edit hours"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onNoShow(assignment)}
                    className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-all duration-200 ease-in-out"
                    title="Mark no-show"
                  >
                    <AlertCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onRemove(assignment)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
                    title="Remove worker"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </td>
    </tr>

    {/* Mobile View (below sm) */}
    <tr className="sm:hidden">
      <td colSpan={6} className="py-3 px-3">
        <div className={cn(
          "p-3 rounded-lg space-y-2 transition-all duration-150",
          assignment.approved ? "bg-green-50 border border-green-200" : 
          assignment.status === 'no_show' ? "bg-red-50 border border-red-200" :
          assignment.status === 'cancelled' ? "bg-gray-50 border border-gray-200" :
          "bg-white border border-gray-200"
        )}>
          {/* Worker name & role */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{assignment.worker_name}</div>
              <div className="text-xs text-gray-500">{assignment.shift_role || 'N/A'}</div>
              {assignment.approved && assignment.approved_by_name && (
                <div className="text-xs text-gray-500 mt-1">
                  Approved by {assignment.approved_by_name} on {formatDateTime(assignment.approved_at)}
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
            ) : assignment.status === 'cancelled' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                <X className="h-3.5 w-3.5" />
                Cancelled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded">
                <Clock className="h-3.5 w-3.5" />
                Pending
              </span>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t border-gray-200">
            <div>
              <div className="text-xs text-gray-500">Hours</div>
              <div className="font-medium">
                {safeToFixed(assignment.effective_hours, 2, '0.00')}h
                {assignment.edited_at && (
                  <span className="ml-1 text-xs text-orange-600" title="Edited">
                    <Edit2 className="h-3 w-3 inline" />
                  </span>
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

          {/* Actions */}
          {assignment.can_edit_hours && assignment.status !== 'no_show' && assignment.status !== 'cancelled' && (
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
                    onClick={() => onEdit(assignment)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onNoShow(assignment)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 rounded hover:bg-orange-100 transition-colors"
                  >
                    No-Show
                  </button>
                  <button
                    onClick={() => onRemove(assignment)}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isApproving, setIsApproving] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' }>({ isVisible: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message?: string;
    requireNote?: boolean;
    note?: string;
    onConfirm?: () => Promise<void> | void;
    variant?: 'default' | 'warning' | 'danger';
  }>({ open: false, title: '', variant: 'default' });

  useEffect(() => {
    if (isOpen && event) {
      loadAssignments();
    }
  }, [isOpen, event]);

  const loadAssignments = async () => {
    if (!event?.id) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/events/${event.id}/approvals`);
      setAssignments(response.data.data.assignments || []);
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

  const handleEditHours = (assignment: AssignmentForApproval) => {
    setEditingId(assignment.id);
    setEditData({
      hours_worked: assignment.hours_worked || assignment.scheduled_hours,
      actual_start_time_utc: assignment.actual_start || assignment.scheduled_start,
      actual_end_time_utc: assignment.actual_end || assignment.scheduled_end,
      hourly_rate: assignment.hourly_rate
    });
  };

  const handleReEdit = (assignment: AssignmentForApproval) => {
    setConfirmDialog({
      open: true,
      title: 'Re-Edit Approved Hours',
      message: `Re-editing will un-approve this assignment. The assignment will need to be re-approved after you make changes. Continue?`,
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ open: false, title: '' });
        handleEditHours(assignment);
      }
    });
  };

  const handleSaveHours = async (assignmentId: number) => {
    try {
      const response = await apiClient.patch(`/approvals/${assignmentId}/update_hours`, editData);
      await loadAssignments();
      setEditingId(null);
      setEditData({});
      if (response.data?.message) {
        setToast({ isVisible: true, type: 'success', message: response.data.message });
      } else {
        setToast({ isVisible: true, type: 'success', message: 'Hours updated successfully' });
      }
    } catch (error: any) {
      console.error('Error updating hours:', error);
      setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to update hours' });
    }
  };

  const handleMarkNoShow = async (assignment: AssignmentForApproval) => {
    setConfirmDialog({
      open: true,
      title: 'Mark No-Show',
      message: `Mark ${assignment.worker_name} as no-show? This will set hours to 0.`,
      requireNote: true,
      note: '',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await apiClient.post(`/approvals/${assignment.id}/mark_no_show`, { notes: confirmDialog.note });
          await loadAssignments();
          setToast({ isVisible: true, type: 'success', message: 'Marked as no-show' });
        } catch (error: any) {
          console.error('Error marking no-show:', error);
          setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to mark no-show' });
        } finally {
          setConfirmDialog({ open: false, title: '' });
        }
      }
    });
  };

  const handleRemove = async (assignment: AssignmentForApproval) => {
    setConfirmDialog({
      open: true,
      title: 'Remove from Job',
      message: `Remove ${assignment.worker_name} from this job? This cannot be undone.`,
      requireNote: true,
      note: '',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/approvals/${assignment.id}/remove`, { data: { notes: confirmDialog.note } });
          await loadAssignments();
          setToast({ isVisible: true, type: 'success', message: 'Assignment removed' });
        } catch (error: any) {
          console.error('Error removing assignment:', error);
          setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to remove assignment' });
        } finally {
          setConfirmDialog({ open: false, title: '' });
        }
      }
    });
  };

  const handleApproveAll = async () => {
    const pendingCount = assignments.filter(a => !a.approved && a.can_approve && a.status !== 'no_show').length;
    setConfirmDialog({
      open: true,
      title: 'Approve All Hours',
      message: `Approve hours for all ${pendingCount} eligible workers?`,
      onConfirm: async () => {
        setIsApproving(true);
        try {
          await apiClient.post(`/events/${event.id}/approve_all`);
          await loadAssignments();
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

  // Calculate state for new layout
  const validAssignments = assignments.filter(a => a.status !== 'no_show' && a.status !== 'cancelled');
  const pendingCount = validAssignments.filter(a => !a.approved).length;
  const approvedCount = validAssignments.filter(a => a.approved).length;
  const totalCount = validAssignments.length;

  const pendingCost = validAssignments
    .filter(a => !a.approved)
    .reduce((sum, a) => sum + Number(a.effective_pay || 0), 0);

  const approvedCost = validAssignments
    .filter(a => a.approved)
    .reduce((sum, a) => sum + Number(a.effective_pay || 0), 0);

  const totalCost = pendingCost + approvedCost;

  const totalHours = validAssignments
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
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Approve Hours</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {event?.title} · {event?.event_date ? formatDate(event.event_date) : ''}
              </p>
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
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                    Hours
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                    Rate
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                    Total
                  </th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map(assignment => (
                  <WorkerRow
                    key={assignment.id}
                    assignment={assignment}
                    isEditing={editingId === assignment.id}
                    editData={editData}
                    onEdit={handleEditHours}
                    onSave={handleSaveHours}
                    onCancel={() => {
                      setEditingId(null);
                      setEditData({});
                    }}
                    onEditDataChange={setEditData}
                    onNoShow={handleMarkNoShow}
                    onRemove={handleRemove}
                    onReEdit={handleReEdit}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer - Summary & Actions */}
        <footer className="border-t bg-gray-50 px-3 sm:px-6 py-4 flex-shrink-0">
          {/* Cost Summary */}
          {pendingCount > 0 && approvedCount > 0 ? (
            // Mixed state - show breakdown
            <div className="mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Pending approval:</span>
                <span className="font-medium">
                  ${safeToFixed(pendingCost, 2, '0.00')} ({pendingCount} {pendingCount === 1 ? 'worker' : 'workers'})
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Approved:</span>
                <span className="font-medium">
                  ${safeToFixed(approvedCost, 2, '0.00')} ({approvedCount} {approvedCount === 1 ? 'worker' : 'workers'})
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between text-gray-900">
                <span className="font-semibold">Total:</span>
                <span className="font-semibold">
                  ${safeToFixed(totalCost, 2, '0.00')} ({totalCount} workers, {safeToFixed(totalHours, 2, '0.00')}h)
                </span>
              </div>
            </div>
          ) : pendingCount === 0 && approvedCount > 0 ? (
            // All approved - show final cost only
            <div className="mb-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Final approved cost:</span>
              <span className="text-lg font-bold text-green-600">${safeToFixed(approvedCost, 2, '0.00')}</span>
            </div>
          ) : (
            // All pending - show total only
            <div className="mb-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total cost:</span>
              <span className="text-lg font-bold text-gray-900">
                ${safeToFixed(totalCost, 2, '0.00')} ({totalCount} workers, {safeToFixed(totalHours, 2, '0.00')}h)
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-all duration-200 ease-in-out"
            >
              Close
            </button>
            {pendingCount > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={isApproving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all duration-200 ease-in-out"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Approve All ({pendingCount})
                  </>
                )}
              </button>
            )}
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
                onClick={async () => { await confirmDialog.onConfirm?.(); }}
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
