import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, DollarSign,
  AlertCircle, Download, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getWorker } from '../services/workersApi';
import type { Worker } from '../services/workersApi';
import { useAssignments } from '../hooks/useAssignments';
import AssignmentStatusBadge from '../components/Assignments/AssignmentStatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

const WorkerSchedule = () => {
  const { id } = useParams();
  
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('');
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  
  const { assignments, loading: assignmentsLoading } = useAssignments({
    worker_id: id ? parseInt(id) : undefined,
    start_date: format(weekStart, 'yyyy-MM-dd'),
    end_date: format(weekEnd, 'yyyy-MM-dd'),
    status: statusFilter || undefined,
  });
  
  useEffect(() => {
    if (id) {
      loadWorker(parseInt(id));
    }
  }, [id]);
  
  const loadWorker = async (workerId: number) => {
    try {
      setLoading(true);
      const response = await getWorker(workerId);
      setWorker(response.data);
    } catch (err: any) {
      setError('Failed to load worker');
      console.error('Error loading worker:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'EEE, MMM d');
    } catch {
      return dateString;
    }
  };
  
  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch {
      return dateString;
    }
  };
  
  const calculateTotalHours = () => {
    return assignments.reduce((total, assignment) => {
      if (assignment.status === 'cancelled') return total;
      const start = new Date(assignment.shift.start_time_utc);
      const end = new Date(assignment.shift.end_time_utc);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };
  
  const calculateEstimatedPay = () => {
    return assignments.reduce((total, assignment) => {
      if (assignment.status === 'cancelled' || !assignment.shift.pay_rate) return total;
      const start = new Date(assignment.shift.start_time_utc);
      const end = new Date(assignment.shift.end_time_utc);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + (hours * assignment.shift.pay_rate);
    }, 0);
  };
  
  const getUpcomingAssignments = () => {
    const now = new Date();
    return assignments.filter(a => 
      new Date(a.shift.start_time_utc) > now && a.status === 'assigned'
    );
  };
  
  const getCompletedAssignments = () => {
    return assignments.filter(a => a.status === 'completed');
  };

  // Conflict detection
  const detectConflicts = () => {
    const conflicts = [];
    const activeAssignments = assignments.filter(a => a.status === 'assigned');
    
    for (let i = 0; i < activeAssignments.length; i++) {
      for (let j = i + 1; j < activeAssignments.length; j++) {
        const assignment1 = activeAssignments[i];
        const assignment2 = activeAssignments[j];
        
        const start1 = new Date(assignment1.shift.start_time_utc);
        const end1 = new Date(assignment1.shift.end_time_utc);
        const start2 = new Date(assignment2.shift.start_time_utc);
        const end2 = new Date(assignment2.shift.end_time_utc);
        
        // Check for time overlap
        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            type: 'time_overlap',
            assignments: [assignment1, assignment2],
            message: `Time conflict: ${assignment1.shift.client_name} (${formatTime(assignment1.shift.start_time_utc)}-${formatTime(assignment1.shift.end_time_utc)}) overlaps with ${assignment2.shift.client_name} (${formatTime(assignment2.shift.start_time_utc)}-${formatTime(assignment2.shift.end_time_utc)})`
          });
        }
      }
    }
    
    return conflicts;
  };

  const conflicts = detectConflicts();

  // Week navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const formatWeekRange = () => {
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  };
  
  const exportSchedule = () => {
    if (!worker) return;
    
    // Enhanced CSV export with more details
    const csvContent = [
      // Header row
      ['Date', 'Start Time', 'End Time', 'Client', 'Role', 'Location', 'Status', 'Pay Rate', 'Hours', 'Estimated Pay'].join(','),
      // Data rows
      ...assignments.map(a => {
        const start = new Date(a.shift.start_time_utc);
        const end = new Date(a.shift.end_time_utc);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const estimatedPay = a.shift.pay_rate ? (hours * a.shift.pay_rate).toFixed(2) : 'N/A';
        
        return [
          format(parseISO(a.shift.start_time_utc), 'yyyy-MM-dd'),
          formatTime(a.shift.start_time_utc),
          formatTime(a.shift.end_time_utc),
          `"${a.shift.client_name}"`,
          `"${a.shift.role_needed}"`,
          `"${a.shift.location || 'N/A'}"`,
          a.status,
          a.shift.pay_rate ? `$${a.shift.pay_rate}` : 'N/A',
          hours.toFixed(1),
          estimatedPay ? `$${estimatedPay}` : 'N/A'
        ].join(',');
      }),
      // Summary row
      ['', '', '', '', '', '', 'TOTAL', '', calculateTotalHours().toFixed(1), `$${calculateEstimatedPay().toFixed(2)}`].join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${worker.first_name}_${worker.last_name}_schedule_${formatWeekRange().replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner message="Loading worker schedule..." />
      </div>
    );
  }
  
  if (error || !worker) {
    return (
      <div className="py-8">
        <ErrorMessage 
          message={error || 'Worker not found'} 
          onRetry={() => id && loadWorker(parseInt(id))} 
        />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link to="/dashboard" className="hover:text-gray-900">Home</Link>
          <span>/</span>
          <Link to="/workers" className="hover:text-gray-900">Workers</Link>
          <span>/</span>
          <Link to={`/workers/${worker.id}`} className="hover:text-gray-900">
            {worker.first_name} {worker.last_name}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Schedule</span>
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {worker.first_name} {worker.last_name}'s Schedule
            </h1>
            <p className="text-gray-500 mt-1">{worker.email}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={exportSchedule}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <Link
              to={`/workers/${worker.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>
      
      {/* Week Navigator */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousWeek}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Week
          </button>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatWeekRange()}
            </div>
            <button
              onClick={goToCurrentWeek}
              className="text-sm text-blue-600 hover:text-blue-700 mt-1"
            >
              Go to Current Week
            </button>
          </div>
          
          <button
            onClick={goToNextWeek}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            Next Week
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        {/* Status Filter */}
        <div className="mt-4 flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
            <option value="no_show">No Show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Schedule List */}
        <div className="lg:col-span-3 space-y-4">
          {assignmentsLoading ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <LoadingSpinner message="Loading assignments..." />
            </div>
          ) : assignments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No shifts this week
              </h3>
              <p className="text-gray-500 mb-6">
                {worker.first_name} doesn't have any scheduled shifts for this week. 
                Try selecting a different week or create a new shift assignment.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={goToCurrentWeek}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Go to Current Week
                </button>
                <Link
                  to="/shifts"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View All Shifts
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Conflict Detection Display */}
              {conflicts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 mb-2">
                        Schedule Conflicts Detected
                      </h4>
                      <div className="space-y-2">
                        {conflicts.map((conflict, index) => (
                          <div key={index} className="text-sm text-red-700">
                            {conflict.message}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-red-600 mt-2">
                        Please resolve these conflicts by adjusting shift times or reassigning workers.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {assignments.map((assignment) => {
                const hasConflict = conflicts.some(c => 
                  c.assignments.some(a => a.id === assignment.id)
                );
                
                return (
                <div
                  key={assignment.id}
                  className={`rounded-lg shadow p-6 hover:shadow-md transition-shadow ${
                    hasConflict ? 'bg-red-50 border border-red-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Conflict Warning */}
                      {hasConflict && (
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Schedule Conflict</span>
                        </div>
                      )}
                      
                      {/* Date & Time */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2 text-gray-900">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <span className="font-semibold">
                            {formatDate(assignment.shift.start_time_utc)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            {formatTime(assignment.shift.start_time_utc)} - {formatTime(assignment.shift.end_time_utc)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Shift Details */}
                      <Link
                        to={`/shifts/${assignment.shift.id}`}
                        className="text-lg font-semibold text-blue-600 hover:text-blue-700 mb-2 block"
                      >
                        {assignment.shift.client_name}
                      </Link>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium">{assignment.shift.role_needed}</span>
                        
                        {assignment.shift.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {assignment.shift.location}
                          </div>
                        )}
                        
                        {assignment.shift.pay_rate && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${assignment.shift.pay_rate}/hr
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="ml-6">
                      <AssignmentStatusBadge status={assignment.status} />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Week Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Week Summary</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Total Shifts</div>
                <div className="text-2xl font-bold text-gray-900">
                  {assignments.length}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Upcoming</div>
                <div className="text-2xl font-bold text-blue-600">
                  {getUpcomingAssignments().length}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Completed</div>
                <div className="text-2xl font-bold text-green-600">
                  {getCompletedAssignments().length}
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="text-sm text-gray-500">Total Hours</div>
                <div className="text-2xl font-bold text-gray-900">
                  {calculateTotalHours().toFixed(1)}
                </div>
              </div>
              
              {calculateEstimatedPay() > 0 && (
                <div>
                  <div className="text-sm text-gray-500">Est. Earnings</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${calculateEstimatedPay().toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Worker Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Worker Info</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="text-gray-900">{worker.phone || 'N/A'}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="text-gray-900 text-sm break-words">{worker.email}</div>
              </div>
              
              {worker.skills_json && worker.skills_json.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {worker.skills_json.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Conflicts Warning */}
          {assignments.some(a => {
            // Check for overlapping assignments (simplified)
            const thisStart = new Date(a.shift.start_time_utc);
            const thisEnd = new Date(a.shift.end_time_utc);
            return assignments.some(other => {
              if (other.id === a.id) return false;
              const otherStart = new Date(other.shift.start_time_utc);
              const otherEnd = new Date(other.shift.end_time_utc);
              return (thisStart < otherEnd && thisEnd > otherStart);
            });
          }) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Scheduling Conflicts</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This worker has overlapping shift assignments this week.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerSchedule;
