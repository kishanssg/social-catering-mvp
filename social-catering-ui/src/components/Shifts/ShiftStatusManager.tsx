import React, { useState } from 'react';
import { Archive, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface ShiftStatusManagerProps {
  shift: any;
  onStatusChange: () => void;
}

export function ShiftStatusManager({ shift, onStatusChange }: ShiftStatusManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await api.updateShiftStatus(shift.id, newStatus);

      if (response.status === 'success') {
        toast.success(`Shift ${newStatus} successfully`);
        onStatusChange();
      }
    } catch (error) {
      toast.error('Failed to update shift status');
      console.error('Status update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    switch (shift.status) {
      case 'draft':
        actions.push({
          label: 'Publish',
          status: 'published',
          icon: Send,
          className: 'btn-primary',
          description: 'Make visible to workers'
        });
        break;
      case 'published':
        if (shift.assigned_count >= shift.capacity) {
          actions.push({
            label: 'Mark Assigned',
            status: 'assigned',
            icon: CheckCircle,
            className: 'btn-green',
            description: 'Shift is fully staffed'
          });
        }
        break;
      case 'assigned':
        if (new Date(shift.end_time_utc) < new Date()) {
          actions.push({
            label: 'Mark Complete',
            status: 'completed',
            icon: CheckCircle,
            className: 'btn-green',
            description: 'Shift has been completed'
          });
        }
        break;
    }

    // Archive is available for all non-archived statuses
    if (shift.status !== 'archived') {
      actions.push({
        label: 'Archive',
        status: 'archived',
        icon: Archive,
        className: 'btn-secondary',
        description: 'Remove from active shifts'
      });
    }

    return actions;
  };

  const actions = getAvailableActions();

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Actions</h3>
      
      <div className="space-y-2">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.status}
              onClick={() => handleStatusChange(action.status)}
              disabled={isUpdating}
              className={`w-full ${action.className} flex items-center justify-center gap-2`}
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </button>
          );
        })}
      </div>

      {shift.status === 'published' && shift.assigned_count < shift.capacity && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Understaffed</p>
              <p>Need {shift.available_slots} more workers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
