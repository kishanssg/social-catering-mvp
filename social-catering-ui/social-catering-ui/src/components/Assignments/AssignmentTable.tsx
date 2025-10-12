import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Assignment } from '../../services/assignmentsApi';
import AssignmentStatusBadge from './AssignmentStatusBadge';
import { format } from 'date-fns';

interface AssignmentTableProps {
  assignments: Assignment[];
  onStatusUpdate: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}

export function AssignmentTable({ assignments, onStatusUpdate, onDelete }: AssignmentTableProps) {
  const [editingStatus, setEditingStatus] = useState<number | null>(null);

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleStatusChange = (assignmentId: number, newStatus: string) => {
    onStatusUpdate(assignmentId, newStatus);
    setEditingStatus(null);
  };

  const statusOptions = [
    { value: 'assigned', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'no_show', label: 'No Show' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Worker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shift Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assignments.map((assignment) => (
              <tr key={assignment.id} className="hover:bg-gray-50">
                {/* Worker */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {assignment.worker?.first_name?.[0]}{assignment.worker?.last_name?.[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.worker?.first_name} {assignment.worker?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.worker?.email}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Shift Details */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    <Link
                      to={`/shifts/${assignment.shift_id}`}
                      className="font-medium text-primary-600 hover:text-primary-500"
                    >
                      {assignment.shift?.client_name}
                    </Link>
                  </div>
                  <div className="text-sm text-gray-500">
                    {assignment.shift?.role_needed} • {assignment.shift?.location}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDateTime(assignment.shift?.start_time_utc || '')}
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingStatus === assignment.id ? (
                    <select
                      value={assignment.status}
                      onChange={(e) => handleStatusChange(assignment.id, e.target.value)}
                      onBlur={() => setEditingStatus(null)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      autoFocus
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingStatus(assignment.id)}
                      className="hover:bg-gray-100 rounded px-2 py-1"
                    >
                      <AssignmentStatusBadge status={assignment.status} />
                    </button>
                  )}
                </td>

                {/* Assigned */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(assignment.assigned_at_utc)}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <Link
                      to={`/workers/${assignment.worker_id}/schedule`}
                      className="text-primary-600 hover:text-primary-500"
                    >
                      View Schedule
                    </Link>
                    <button
                      onClick={() => onDelete(assignment.id)}
                      className="text-red-600 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
