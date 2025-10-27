import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { Modal } from './common/Modal';
import { apiClient } from '../lib/api';
import { Toast } from './common/Toast';

interface SkillRequirement {
  skill_name: string;
  needed_workers: number;
  pay_rate?: number;
  description?: string;
  uniform_id?: number;
  cert_id?: number;
}

interface EditableEvent {
  id: number;
  title: string;
  status: string;
  venue: {
    id: number;
    name: string;
    formatted_address: string;
  } | null;
  schedule?: {
    start_time_utc: string;
    end_time_utc: string;
    break_minutes: number;
  } | null;
  shifts_by_role?: any; // Accept flexible structure
}

interface EditEventModalProps {
  event: EditableEvent;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEventModal({ event, isOpen, onClose, onSuccess }: EditEventModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [roles, setRoles] = useState<SkillRequirement[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' }>({
    isVisible: false,
    message: '',
    type: 'error'
  });

  // Initialize roles from event
  useEffect(() => {
    if (event.shifts_by_role && Array.isArray(event.shifts_by_role)) {
      const initialRoles: SkillRequirement[] = event.shifts_by_role.map((role: any) => ({
        skill_name: role.skill_name || role.role_name || '',
        needed_workers: role.needed_workers || role.total_shifts || 1,
        // TODO: Extract pay_rate, description, etc. from shifts
        pay_rate: role.pay_rate || 15, // Placeholder
        description: '',
        uniform_id: undefined,
        cert_id: undefined
      }));
      setRoles(initialRoles);
    }
  }, [event]);

  const handleRoleChange = (index: number, field: keyof SkillRequirement, value: any) => {
    const newRoles = [...roles];
    newRoles[index] = { ...newRoles[index], [field]: value };
    setRoles(newRoles);
  };

  const handleAddRole = () => {
    setRoles([...roles, {
      skill_name: '',
      needed_workers: 1,
      pay_rate: 15,
      description: '',
      uniform_id: undefined,
      cert_id: undefined
    }]);
  };

  const handleRemoveRole = (index: number) => {
    if (roles[index].needed_workers > 0) {
      const roleData = event.shifts_by_role?.[index];
      const hasAssignedWorkers = roleData && 
        ((roleData as any).assigned_workers > 0 || (roleData as any).filled_shifts > 0);
      if (hasAssignedWorkers) {
        // TODO: Show confirmation for removing assigned roles
        setToast({
          isVisible: true,
          message: 'Cannot remove role with assigned workers. Please unassign workers first.',
          type: 'error'
        });
        return;
      }
    }
    setRoles(roles.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Check if event has started (client-side guard)
    if (event.schedule && new Date(event.schedule.start_time_utc) <= new Date()) {
      setToast({
        isVisible: true,
        message: 'Cannot edit event that has already started',
        type: 'error'
      });
      return;
    }
    
    setSaving(true);
    try {
      const response = await apiClient.patch(`/events/${event.id}`, {
        event: {
          roles: roles.map(role => ({
            skill_name: role.skill_name,
            needed: role.needed_workers,
            pay_rate: role.pay_rate,
            description: role.description,
            uniform_id: role.uniform_id,
            cert_id: role.cert_id
          }))
        }
      });

      if (response.data.status === 'success') {
        setToast({
          isVisible: true,
          message: response.data.message || 'Event updated successfully',
          type: 'success'
        });
        onSuccess();
        onClose();
      } else {
        setToast({
          isVisible: true,
          message: response.data.message || 'Failed to update event',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Failed to update event:', error);
      setToast({
        isVisible: true,
        message: error.response?.data?.message || 'Failed to update event',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const footerContent = (
    <div className="flex gap-2">
      <button
        onClick={onClose}
        disabled={saving}
        className="btn-secondary"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Edit Event: ${event.title}`}
        size="lg"
        footer={footerContent}
      >
        <div className="space-y-6">
          {/* Event Details (Read-only for now) */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Event Details</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Venue:</span>
                <span className="ml-2 font-medium text-gray-900">{event.venue.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Location:</span>
                <span className="ml-2 font-medium text-gray-900">{event.venue.formatted_address}</span>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(event.schedule.start_time_utc).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Time:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(event.schedule.start_time_utc).toLocaleTimeString()} - {new Date(event.schedule.end_time_utc).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Roles List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Roles</h4>
              <button
                onClick={handleAddRole}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus size={14} />
                Add Role
              </button>
            </div>

            {roles.map((role, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      value={role.skill_name}
                      onChange={(e) => handleRoleChange(index, 'skill_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Bartender"
                    />
                  </div>
                  
                  <div className="ml-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Needed Workers *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRoleChange(index, 'needed_workers', Math.max(1, role.needed_workers - 1))}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <span className="text-lg font-semibold">-</span>
                      </button>
                      <input
                        type="number"
                        value={role.needed_workers}
                        onChange={(e) => handleRoleChange(index, 'needed_workers', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        onClick={() => handleRoleChange(index, 'needed_workers', role.needed_workers + 1)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <span className="text-lg font-semibold">+</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveRole(index)}
                    className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove role"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Show assigned workers count */}
                {event.shifts_by_role?.[index] && (
                  ((event.shifts_by_role[index] as any).assigned_workers > 0 || (event.shifts_by_role[index] as any).filled_shifts > 0) && (
                    <div className="text-sm text-amber-600 font-medium">
                      {(event.shifts_by_role[index] as any).assigned_workers || (event.shifts_by_role[index] as any).filled_shifts} worker(s) assigned
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}

