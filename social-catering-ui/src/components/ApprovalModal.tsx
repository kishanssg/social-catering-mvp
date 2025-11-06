import React, { useState, useEffect } from 'react';
import { X, Check, Ban, Trash2, AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/api';

interface AssignmentForApproval {
  id: number;
  worker_id: number;
  worker_name: string;
  shift_role: string;
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
  approval_notes?: string;
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

  useEffect(() => {
    if (isOpen && event) {
      loadAssignments();
    }
  }, [isOpen, event]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/events/${event.id}/approvals`);
      setAssignments(response.data.data.assignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
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
      setEditData({});
    } catch (error) {
      console.error('Error updating hours:', error);
      alert('Failed to update hours');
    }
  };

  const handleMarkNoShow = async (assignmentId: number) => {
    if (!confirm('Mark this worker as no-show? This will set hours to 0.')) return;
    const notes = prompt('Add a note (optional):') || undefined;
    try {
      await apiClient.post(`/approvals/${assignmentId}/mark_no_show`, { notes });
      await loadAssignments();
    } catch (error) {
      console.error('Error marking no-show:', error);
      alert('Failed to mark no-show');
    }
  };

  const handleRemove = async (assignmentId: number) => {
    if (!confirm('Remove this worker from the job? This cannot be undone.')) return;
    const notes = prompt('Reason for removal (optional):') || undefined;
    try {
      await apiClient.delete(`/approvals/${assignmentId}/remove`, { data: { notes } });
      await loadAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('Failed to remove assignment');
    }
  };

  const handleApproveAll = async () => {
    const count = assignments.filter(a => !a.approved).length;
    if (!confirm(`Approve hours for all ${count} workers?`)) return;
    try {
      await apiClient.post(`/events/${event.id}/approve_all`);
      await loadAssignments();
      onSuccess();
    } catch (error) {
      console.error('Error approving all:', error);
      alert('Failed to approve all hours');
    }
  };

  if (!isOpen) return null;

  const unapprovedCount = assignments.filter(a => !a.approved).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Approve Hours</h2>
            <p className="text-sm text-gray-600 mt-1">{event?.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {unapprovedCount} assignment{unapprovedCount !== 1 ? 's' : ''} pending approval
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Review and confirm hours worked, mark no-shows, or remove workers from this job.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {assignments.map((a) => (
                  <div key={a.id} className={`border rounded-lg p-4 ${a.approved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{a.worker_name}</h3>
                        <p className="text-sm text-gray-600">{a.shift_role}</p>
                      </div>
                      {a.approved && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" /> Approved
                        </span>
                      )}
                    </div>

                    {editingId === a.id ? (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Hours Worked</label>
                          <input type="number" step="0.25" value={editData.hours_worked}
                                 onChange={(e) => setEditData({ ...editData, hours_worked: parseFloat(e.target.value) })}
                                 className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Actual Start</label>
                          <input type="datetime-local" value={editData.actual_start_time_utc?.slice(0,16)}
                                 onChange={(e) => setEditData({ ...editData, actual_start_time_utc: e.target.value })}
                                 className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Actual End</label>
                          <input type="datetime-local" value={editData.actual_end_time_utc?.slice(0,16)}
                                 onChange={(e) => setEditData({ ...editData, actual_end_time_utc: e.target.value })}
                                 className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Scheduled</p>
                          <p className="font-medium">{a.scheduled_hours.toFixed(2)}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Worked</p>
                          <p className="font-medium">{a.effective_hours.toFixed(2)}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Rate</p>
                          <p className="font-medium">${a.effective_hourly_rate.toFixed(2)}/h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Pay</p>
                          <p className="font-medium text-green-600">${a.effective_pay.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-top border-gray-200">
                      {editingId === a.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveHours(a.id)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {!a.approved && (
                            <>
                              <button onClick={() => handleEditHours(a)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Edit Hours</button>
                              <button onClick={() => handleMarkNoShow(a.id)} className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 flex items-center gap-1"><Ban className="h-4 w-4" /> No-Show</button>
                              <button onClick={() => handleRemove(a.id)} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 flex items-center gap-1"><Trash2 className="h-4 w-4" /> Remove</button>
                            </>
                          )}
                        </div>
                      )}
                      {a.approval_notes && (
                        <p className="text-xs text-gray-600 italic">Note: {a.approval_notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Total: {assignments.reduce((sum, a) => sum + a.effective_hours, 0).toFixed(2)} hours / ${assignments.reduce((sum, a) => sum + a.effective_pay, 0).toFixed(2)}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
            {unapprovedCount > 0 && (
              <button onClick={handleApproveAll} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Approve All ({unapprovedCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


