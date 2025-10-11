import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Clock, User, Briefcase, Calendar,
  ChevronDown, Check, X, AlertCircle, Users
} from 'lucide-react';
import { useAssignments } from '../hooks/useAssignments';
import { updateAssignmentStatus } from '../services/assignmentsApi';
import AssignmentStatusBadge from '../components/Assignments/AssignmentStatusBadge';
import BulkAssignModal from '../components/BulkAssignModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Toast from '../components/Toast';
import { format, parseISO } from 'date-fns';

const AssignmentsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { assignments, loading, error, refetch } = useAssignments();

  // Filter by search term, status, and date
  const filteredAssignments = assignments.filter(assignment => {
    // Search filter
    const matchesSearch = !searchTerm || 
      assignment.worker.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.worker.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.shift.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.shift.role_needed.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = !statusFilter || assignment.status === statusFilter;
    
    // Date filter
    const matchesDate = !dateFilter || 
      format(parseISO(assignment.shift.start_time_utc), 'yyyy-MM-dd') === dateFilter;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Group assignments by date
  const groupedAssignments = filteredAssignments.reduce((groups, assignment) => {
    const date = format(parseISO(assignment.shift.start_time_utc), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(assignment);
    return groups;
  }, {} as Record<string, typeof assignments>);

  const handleStatusChange = async (assignmentId: number, newStatus: any) => {
    setUpdatingStatus(assignmentId);
    try {
      await updateAssignmentStatus(assignmentId, newStatus);
      setToast({ 
        message: `Assignment status updated to ${newStatus}`, 
        type: 'success' 
      });
      refetch();
    } catch (err) {
      setToast({ 
        message: 'Failed to update assignment status', 
        type: 'error' 
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'EEE, MMM d, yyyy');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'no_show':
        return <X className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getUpcomingCount = () => {
    return assignments.filter(a => {
      const shiftDate = new Date(a.shift.start_time_utc);
      return shiftDate > new Date() && a.status === 'assigned';
    }).length;
  };

  const getCompletedCount = () => {
    return assignments.filter(a => a.status === 'completed').length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner message="Loading assignments..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <ErrorMessage message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-500 mt-1">
            Track worker assignments and shift staffing
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Bulk Assign Button */}
          <button
            onClick={() => setShowBulkAssignModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Bulk Assign
          </button>
          
          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center min-w-[100px]">
              <div className="text-2xl font-bold text-blue-600">{getUpcomingCount()}</div>
              <div className="text-xs text-blue-700 mt-1">Upcoming</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center min-w-[100px]">
              <div className="text-2xl font-bold text-green-600">{getCompletedCount()}</div>
              <div className="text-xs text-green-700 mt-1">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workers, shifts, or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
            <option value="no_show">No Show</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">View:</span>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'grouped'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Grouped by Date
          </button>
        </div>
      </div>

      {/* Assignments Display */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="max-w-sm mx-auto">
            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter || dateFilter ? 'No assignments found' : 'No assignments yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter || dateFilter
                ? 'Try adjusting your filters to see more results'
                : 'Start by creating shifts and assigning workers. Assignments will appear here as you schedule your team.'}
            </p>
            {!searchTerm && !statusFilter && !dateFilter && (
              <div className="flex gap-3 justify-center">
                <Link
                  to="/shifts/new"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Shift
                </Link>
                <Link
                  to="/workers"
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  View Workers
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'grouped' ? (
        // Grouped View
        <div className="space-y-6">
          {Object.keys(groupedAssignments)
            .sort()
            .reverse()
            .map((date) => (
              <div key={date} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Date Header */}
                <div className="bg-gray-50 px-6 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">
                    {formatDate(groupedAssignments[date][0].shift.start_time_utc)}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {groupedAssignments[date].length} {groupedAssignments[date].length === 1 ? 'assignment' : 'assignments'}
                  </p>
                </div>

                {/* Assignments */}
                <div className="divide-y">
                  {groupedAssignments[date].map((assignment) => (
                    <AssignmentRow
                      key={assignment.id}
                      assignment={assignment}
                      onStatusChange={handleStatusChange}
                      updatingStatus={updatingStatus}
                      formatTime={formatTime}
                      getStatusIcon={getStatusIcon}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y">
            {filteredAssignments.map((assignment) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                onStatusChange={handleStatusChange}
                updatingStatus={updatingStatus}
                formatTime={formatTime}
                formatDate={formatDate}
                getStatusIcon={getStatusIcon}
                showDate
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <BulkAssignModal
          onClose={() => setShowBulkAssignModal(false)}
          onSuccess={() => {
            refetch();
            setShowBulkAssignModal(false);
          }}
        />
      )}
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

// Assignment Row Component
const AssignmentRow = ({ 
  assignment, 
  onStatusChange, 
  updatingStatus,
  formatTime,
  formatDate,
  getStatusIcon,
  showDate = false
}: any) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const isUpdating = updatingStatus === assignment.id;

  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Worker Info */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Worker</div>
            <div className="flex items-center gap-2">
              <Link
                to={`/workers/${assignment.worker.id}`}
                className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                {assignment.worker.first_name} {assignment.worker.last_name}
              </Link>
              <Link
                to={`/workers/${assignment.worker.id}/schedule`}
                className="text-xs text-gray-500 hover:text-green-600"
                title="View schedule"
              >
                <Calendar className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Shift Info */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Shift</div>
            <Link
              to={`/shifts/${assignment.shift.id}`}
              className="font-medium text-gray-900 hover:text-blue-600"
            >
              {assignment.shift.client_name}
            </Link>
            <div className="text-sm text-gray-600">{assignment.shift.role_needed}</div>
          </div>

          {/* Time */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Time</div>
            {showDate && (
              <div className="text-sm text-gray-900 mb-1">
                {formatDate(assignment.shift.start_time_utc)}
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              {formatTime(assignment.shift.start_time_utc)} - {formatTime(assignment.shift.end_time_utc)}
            </div>
          </div>

          {/* Status */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Status</div>
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <AssignmentStatusBadge status={assignment.status} />
                {getStatusIcon(assignment.status)}
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* Status Dropdown */}
              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[150px]">
                  <button
                    onClick={() => {
                      onStatusChange(assignment.id, 'assigned');
                      setShowStatusMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <AssignmentStatusBadge status="assigned" size="sm" />
                  </button>
                  <button
                    onClick={() => {
                      onStatusChange(assignment.id, 'completed');
                      setShowStatusMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <AssignmentStatusBadge status="completed" size="sm" />
                  </button>
                  <button
                    onClick={() => {
                      onStatusChange(assignment.id, 'no_show');
                      setShowStatusMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <AssignmentStatusBadge status="no_show" size="sm" />
                  </button>
                  <button
                    onClick={() => {
                      onStatusChange(assignment.id, 'cancelled');
                      setShowStatusMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <AssignmentStatusBadge status="cancelled" size="sm" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentsList;
