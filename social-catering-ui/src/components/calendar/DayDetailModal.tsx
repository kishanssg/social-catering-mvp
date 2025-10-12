import { Link } from 'react-router-dom';
import { X, Clock, Users, MapPin, DollarSign, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import type { Shift } from '../../types';
import ShiftStatusBadge from '../ShiftStatusBadge';

interface DayDetailModalProps {
  date: Date;
  shifts: Shift[];
  onClose: () => void;
}

const DayDetailModal = ({ date, shifts, onClose }: DayDetailModalProps) => {
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return dateString;
    }
  };
  
  // Sort shifts by start time
  const sortedShifts = [...shifts].sort((a, b) => 
    new Date(a.start_time_utc).getTime() - new Date(b.start_time_utc).getTime()
  );
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {shifts.length} {shifts.length === 1 ? 'shift' : 'shifts'} scheduled
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {shifts.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No shifts scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedShifts.map((shift) => {
                const assignedCount = shift.assignments?.length || 0;
                const needsWorkers = assignedCount < shift.capacity;
                
                return (
                  <Link
                    key={shift.id}
                    to={`/shifts/${shift.id}`}
                    className="block bg-white border rounded-lg p-5 hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {shift.client_name}
                        </h3>
                        <p className="text-sm text-gray-600">{shift.role_needed}</p>
                      </div>
                      <ShiftStatusBadge status={shift.status} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {/* Time */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                        </span>
                      </div>
                      
                      {/* Staffing */}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className={needsWorkers ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>
                          {assignedCount}/{shift.capacity} assigned
                        </span>
                      </div>
                      
                      {/* Location */}
                      {shift.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{shift.location}</span>
                        </div>
                      )}
                      
                      {/* Pay Rate */}
                      {shift.pay_rate && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          <span>${shift.pay_rate}/hr</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Workers List */}
                    {assignedCount > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500 mb-2">Assigned Workers:</div>
                        <div className="flex flex-wrap gap-2">
                          {shift.assignments?.slice(0, 3).map((assignment) => {
                            const workerName = assignment.worker 
                              ? `${assignment.worker.first_name} ${assignment.worker.last_name}`
                              : `Worker ${assignment.worker_id}`;
                            
                            return (
                              <span
                                key={assignment.id}
                                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                              >
                                {workerName}
                              </span>
                            );
                          })}
                          {assignedCount > 3 && (
                            <span className="px-2 py-1 text-xs text-gray-500">
                              +{assignedCount - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Needs Workers Alert */}
                    {needsWorkers && shift.status === 'published' && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded">
                        <UserPlus className="h-4 w-4" />
                        <span>Needs {shift.capacity - assignedCount} more {shift.capacity - assignedCount === 1 ? 'worker' : 'workers'}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayDetailModal;
