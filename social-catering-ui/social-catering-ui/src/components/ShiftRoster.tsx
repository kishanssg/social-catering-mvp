import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, Users, Phone, Mail, CheckCircle, 
  XCircle, AlertCircle, UserPlus 
} from 'lucide-react';
import type { Shift } from '../services/shiftsApi';
import { updateAssignmentStatus } from '../services/assignmentsApi';
import AssignmentStatusBadge from './Assignments/AssignmentStatusBadge';

interface ShiftRosterProps {
  shift: Shift;
  onUpdate: () => void;
  onAssignWorker: () => void;
}

const ShiftRoster = ({ shift, onUpdate, onAssignWorker }: ShiftRosterProps) => {
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  
  const assignments = shift.assignments || [];
  const workers = shift.workers || [];
  
  // Helper function to get worker info for an assignment
  const getWorkerForAssignment = (assignment: any) => {
    return workers.find(worker => worker.id === assignment.worker_id);
  };
  const assignedCount = assignments.length;
  const capacity = shift.capacity;
  const needsMoreWorkers = assignedCount < capacity;
  
  const handleStatusChange = async (assignmentId: number, newStatus: any) => {
    setUpdatingStatus(assignmentId);
    try {
      await updateAssignmentStatus(assignmentId, newStatus);
      onUpdate();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update assignment status');
    } finally {
      setUpdatingStatus(null);
    }
  };
  
  const getStatusCounts = () => {
    return {
      assigned: assignments.filter(a => a.status === 'assigned').length,
      completed: assignments.filter(a => a.status === 'completed').length,
      no_show: assignments.filter(a => a.status === 'no_show').length,
    };
  };
  
  const statusCounts = getStatusCounts();
  
  return (
    <div className="space-y-6">
      {/* Roster Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Shift Roster</h3>
          <p className="text-sm text-gray-500 mt-1">
            {assignedCount} of {capacity} workers assigned
          </p>
        </div>
        
        {needsMoreWorkers && (
          <button
            onClick={onAssignWorker}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Assign Worker
          </button>
        )}
      </div>
      
      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.assigned}</div>
          <div className="text-xs text-blue-700 mt-1">Assigned</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
          <div className="text-xs text-green-700 mt-1">Completed</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{statusCounts.no_show}</div>
          <div className="text-xs text-red-700 mt-1">No Show</div>
        </div>
      </div>
      
      {/* Staffing Alert */}
      {needsMoreWorkers && shift.status === 'published' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-900">Understaffed</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Need {capacity - assignedCount} more {capacity - assignedCount === 1 ? 'worker' : 'workers'} for this shift.
            </p>
          </div>
          <button
            onClick={onAssignWorker}
            className="bg-yellow-600 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-700"
          >
            Assign
          </button>
        </div>
      )}
      
      {/* Workers List */}
      {assignedCount === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No workers assigned yet</p>
          <button
            onClick={onAssignWorker}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Assign First Worker
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const isUpdating = updatingStatus === assignment.id;
            
            return (
              <div
                key={assignment.id}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-medium">
                        {getWorkerForAssignment(assignment)?.first_name[0] || '?'}{getWorkerForAssignment(assignment)?.last_name[0] || '?'}
                      </span>
                    </div>
                    
                    {/* Worker Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/workers/${assignment.worker_id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {getWorkerForAssignment(assignment)?.first_name || 'Unknown'} {getWorkerForAssignment(assignment)?.last_name || 'Worker'}
                      </Link>
                      
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                        {assignment.worker?.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <a
                              href={`mailto:${assignment.worker.email}`}
                              className="hover:text-blue-600"
                            >
                              {assignment.worker.email}
                            </a>
                          </div>
                        )}
                        
                        {assignment.worker?.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <a
                              href={`tel:${assignment.worker.phone}`}
                              className="hover:text-blue-600"
                            >
                              {assignment.worker.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <AssignmentStatusBadge status={assignment.status} />
                    
                    {/* Quick Action Buttons */}
                    {assignment.status === 'assigned' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStatusChange(assignment.id, 'completed')}
                          disabled={isUpdating}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                          title="Mark as completed"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(assignment.id, 'no_show')}
                          disabled={isUpdating}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Mark as no-show"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Empty Slots */}
      {needsMoreWorkers && (
        <div className="border-t pt-4">
          <div className="text-sm text-gray-500 mb-3">
            Open positions: {capacity - assignedCount}
          </div>
          <div className="space-y-2">
            {Array.from({ length: capacity - assignedCount }).map((_, index) => (
              <div
                key={index}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
              >
                <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Position {assignedCount + index + 1} available</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftRoster;
