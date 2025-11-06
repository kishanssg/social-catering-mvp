import React, { useState, useEffect } from 'react';
import { safeToFixed } from '../utils/number';
import { X, Check, Ban, Trash2, AlertCircle, Clock, Edit2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Toast } from './common/Toast';

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

export default function ApprovalModal({ event, isOpen, onClose, onSuccess }: ApprovalModalProps) {
  const [assignments, setAssignments] = useState<AssignmentForApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' }>({ isVisible: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message?: string;
    requireNote?: boolean;
    note?: string;
    onConfirm?: () => Promise<void> | void;
  }>({ open: false, title: '' });

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
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      setToast({
        isVisible: true,
        type: 'error',
        message: error.response?.data?.error || error.message || 'Unable to load assignments for approval'
      });
      setAssignments([]);
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

  const handleSaveHours = async (assignmentId: number) => {
    try {
      await apiClient.patch(`/approvals/${assignmentId}/update_hours`, editData);
      await loadAssignments();
      setEditingId(null);
      setEditData({ hours_worked: 0 });
    } catch (error: any) {
      console.error('Error updating hours:', error);
      setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to update hours' });
    }
  };

  const handleMarkNoShow = async (assignmentId: number, workerName: string) => {
    setConfirmDialog({
      open: true,
      title: 'Mark No-Show',
      message: `Mark ${workerName} as no-show? This will set hours to 0.`,
      requireNote: true,
      note: '',
      onConfirm: async () => {
        try {
          await apiClient.post(`/approvals/${assignmentId}/mark_no_show`, { notes: confirmDialog.note });
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

  const handleRemove = async (assignmentId: number, workerName: string) => {
    setConfirmDialog({
      open: true,
      title: 'Remove from Job',
      message: `Remove ${workerName} from this job? This cannot be undone.`,
      requireNote: true,
      note: '',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/approvals/${assignmentId}/remove`, { data: { notes: confirmDialog.note } });
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
    const unapprovedCount = assignments.filter(a => !a.approved && a.can_approve).length;
    setConfirmDialog({
      open: true,
      title: 'Approve All Hours',
      message: `Approve hours for all ${unapprovedCount} eligible workers?`,
      onConfirm: async () => {
        try {
          await apiClient.post(`/events/${event.id}/approve_all`);
          await loadAssignments();
          onSuccess();
          setToast({ isVisible: true, type: 'success', message: `Approved ${unapprovedCount} assignments` });
        } catch (error: any) {
          console.error('Error approving all:', error);
          setToast({ isVisible: true, type: 'error', message: error.response?.data?.message || 'Failed to approve all hours' });
        } finally {
          setConfirmDialog({ open: false, title: '' });
        }
      }
    });
  };

  if (!isOpen) return null;

  const unapprovedCount = assignments.filter(a => !a.approved && a.can_approve).length;
  const totalHours = assignments.reduce((sum, a) => sum + (Number(a.effective_hours) || 0), 0);
  const totalPay = assignments.reduce((sum, a) => sum + (Number(a.effective_pay) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      {/* Render Toast at overlay level to avoid clipping by overflow-hidden container */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-6xl sm:rounded-lg shadow-xl overflow-hidden flex flex-col sm:max-h-[90vh] my-0 sm:my-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Approve Hours</h2>
            <p className="text-sm text-gray-600 mt-1">
              {event?.title} - {event?.event_date ? new Date(event.event_date).toLocaleDateString() : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
            <>
              {/* Summary Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {unapprovedCount > 0 ? (
                        <>
                          {unapprovedCount} assignment{unapprovedCount !== 1 ? 's' : ''} pending approval
                        </>
                      ) : (
                        'All assignments have been approved'
                      )}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Review and confirm hours worked, mark no-shows, or remove workers from this job.
                    </p>
                  </div>
                </div>
              </div>

              {/* Assignments List */}
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`border rounded-lg p-4 transition-all ${
                      assignment.approved
                        ? 'bg-green-50 border-green-200'
                        : assignment.status === 'no_show'
                        ? 'bg-red-50 border-red-200'
                        : assignment.status === 'cancelled'
                        ? 'bg-gray-50 border-gray-300'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Worker Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {assignment.worker_name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-gray-600">{assignment.shift_role}</p>
                          <span className="text-gray-400">•</span>
                          <p className="text-sm text-gray-600">
                            {new Date(assignment.shift_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {assignment.approved && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Approved
                          </span>
                        )}
                        {assignment.status === 'no_show' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Ban className="h-3 w-3 mr-1" />
                            No-Show
                          </span>
                        )}
                        {assignment.status === 'cancelled' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <X className="h-3 w-3 mr-1" />
                            Cancelled
                          </span>
                        )}
                      </div>
                    </div>

                    {editingId === assignment.id ? (
                      /* Edit Mode */
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-blue-900 mb-3">Edit Hours Worked</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Hours Worked
                            </label>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              value={editData.hours_worked}
                              onChange={(e) => setEditData({ ...editData, hours_worked: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Actual Start Time
                            </label>
                            <input
                              type="datetime-local"
                              value={editData.actual_start_time_utc ? new Date(editData.actual_start_time_utc).toISOString().slice(0, 16) : ''}
                              onChange={(e) => setEditData({ ...editData, actual_start_time_utc: new Date(e.target.value).toISOString() })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Actual End Time
                            </label>
                            <input
                              type="datetime-local"
                              value={editData.actual_end_time_utc ? new Date(editData.actual_end_time_utc).toISOString().slice(0, 16) : ''}
                              onChange={(e) => setEditData({ ...editData, actual_end_time_utc: new Date(e.target.value).toISOString() })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Scheduled Hours</p>
                          <p className="font-medium text-gray-900">{safeToFixed(assignment.scheduled_hours, 2, '0.00')}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Hours Worked</p>
                          <p className="font-medium text-gray-900">
                            {safeToFixed(assignment.effective_hours, 2, '0.00')}h
                            {assignment.edited_at && (
                              <span className="ml-1 text-xs text-orange-600" title="Edited">
                                <Edit2 className="h-3 w-3 inline" />
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Hourly Rate</p>
                          <p className="font-medium text-gray-900">${safeToFixed(assignment.effective_hourly_rate, 2, '0.00')}/h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total Pay</p>
                          <p className="font-medium text-green-600">${safeToFixed(assignment.effective_pay, 2, '0.00')}</p>
                        </div>
                      </div>
                    )}

                    {/* Notes/Audit Trail */}
                    {(assignment.approval_notes || assignment.edited_by_name || assignment.approved_by_name) && (
                      <div className="bg-gray-50 rounded-md p-3 mb-3 text-sm">
                        {assignment.approval_notes && (
                          <p className="text-gray-700">
                            <span className="font-medium">Note:</span> {assignment.approval_notes}
                          </p>
                        )}
                        {assignment.edited_by_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            Edited by {assignment.edited_by_name} on{' '}
                            {assignment.edited_at ? new Date(assignment.edited_at).toLocaleString() : ''}
                          </p>
                        )}
                        {assignment.approved_by_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            Approved by {assignment.approved_by_name} on{' '}
                            {assignment.approved_at ? new Date(assignment.approved_at).toLocaleString() : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      {editingId === assignment.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveHours(assignment.id)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          {!assignment.approved && assignment.can_edit_hours && assignment.status !== 'no_show' && assignment.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleEditHours(assignment)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                              >
                                <Edit2 className="h-4 w-4" />
                                Edit Hours
                              </button>
                              <button
                                onClick={() => handleMarkNoShow(assignment.id, assignment.worker_name)}
                                className="px-3 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors flex items-center gap-1"
                              >
                                <Ban className="h-4 w-4" />
                                No-Show
                              </button>
                              <button
                                onClick={() => handleRemove(assignment.id, assignment.worker_name)}
                                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="text-sm">
            <p className="font-medium text-gray-900">
              Total: {safeToFixed(totalHours, 2, '0.00')} hours / ${safeToFixed(totalPay, 2, '0.00')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {assignments.length} worker{assignments.length !== 1 ? 's' : ''} assigned
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {unapprovedCount > 0 && (
              <button
                onClick={handleApproveAll}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Approve All ({unapprovedCount})
              </button>
            )}
          </div>
        </div>
      </div>
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
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
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


