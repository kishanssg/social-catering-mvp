import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Check,
  AlertCircle,
  Download
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

type TabType = 'active' | 'past';
type FilterType = 'all' | 'needs_workers' | 'partially_filled' | 'fully_staffed';

interface Shift {
  id: number;
  role_needed: string;
  start_time_utc: string;
  end_time_utc: string;
  location: string;
  staffing_progress: {
    assigned: number;
    required: number;
    percentage: number;
  };
}

interface EventStaffing {
  id: number;
  title: string;
  venue: {
    id: number;
    name: string;
    formatted_address: string;
  };
  schedule: {
    start_time_utc: string;
    end_time_utc: string;
  };
  supervisor_name?: string;
  total_workers_needed: number;
  assigned_workers_count: number;
  unfilled_roles_count: number;
  staffing_percentage: number;
  staffing_status: string;
  shifts: Shift[];
}

interface Assignment {
  id: number;
  worker: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  shift: Shift;
  event: {
    id: number;
    title: string;
    supervisor_name?: string;
  };
  hours_worked?: number;
  pay_rate?: number;
  total_pay?: number;
  status: string;
  is_completed: boolean;
}

export function StaffingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial state from URL params
  const initialTab = (searchParams.get('tab') as TabType) || 'active';
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';
  const eventIdParam = searchParams.get('event_id');
  const roleParam = searchParams.get('role');
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [filterStatus, setFilterStatus] = useState<FilterType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Active tab data
  const [events, setEvents] = useState<EventStaffing[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  
  // Past tab data
  const [pastAssignments, setPastAssignments] = useState<Assignment[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: getDefaultStartDate(),
    end: new Date().toISOString().split('T')[0]
  });
  
  // Assignment modal
  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    shiftId?: number;
    eventId?: number;
    role?: string;
  }>({ isOpen: false });
  
  useEffect(() => {
    if (activeTab === 'active') {
      loadActiveEvents();
    } else {
      loadPastAssignments();
    }
  }, [activeTab, filterStatus]);
  
  // Auto-expand and scroll to specific event if coming from dashboard/events
  useEffect(() => {
    if (eventIdParam && activeTab === 'active' && events.length > 0) {
      const eventId = parseInt(eventIdParam);
      setExpandedEvents(new Set([eventId]));
      
      // Scroll to event after a short delay
      setTimeout(() => {
        const element = document.getElementById(`event-${eventId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [eventIdParam, events, activeTab]);
  
  async function loadActiveEvents() {
    setLoading(true);
    try {
      // Load shifts for published events
      const response = await apiClient.get('/shifts?status=needs_workers,partially_staffed,fully_staffed');
      
      if (response.data.status === 'success') {
        const shiftsData = response.data.data;
        
        // Group shifts by event
        const eventsMap = new Map<number, EventStaffing>();
        
        shiftsData.forEach((shift: any) => {
          const eventId = shift.event_id;
          
          if (!eventsMap.has(eventId)) {
            eventsMap.set(eventId, {
              id: eventId,
              title: shift.event_title,
              venue: {
                id: 0, // We'll need to get this from events API if needed
                name: 'Unknown Venue',
                formatted_address: ''
              },
              schedule: {
                start_time_utc: shift.start_time_utc,
                end_time_utc: shift.end_time_utc
              },
              supervisor_name: undefined,
              total_workers_needed: 0,
              assigned_workers_count: 0,
              unfilled_roles_count: 0,
              staffing_percentage: 0,
              staffing_status: 'needs_workers',
              shifts: []
            });
          }
          
          const event = eventsMap.get(eventId)!;
          event.shifts.push({
            id: shift.id,
            role_needed: shift.role_needed,
            start_time_utc: shift.start_time_utc,
            end_time_utc: shift.end_time_utc,
            location: shift.location || '',
            staffing_progress: shift.staffing_progress
          });
        });
        
        // Calculate event totals after all shifts are added
        eventsMap.forEach((event) => {
          // Group shifts by role to get unique role requirements
          const roleMap = new Map<string, { required: number; assigned: number }>();
          
          event.shifts.forEach((shift) => {
            const role = shift.role_needed;
            if (!roleMap.has(role)) {
              // Only set the values once per role (they're the same for all shifts of the same role)
              roleMap.set(role, { 
                required: shift.staffing_progress.required, 
                assigned: shift.staffing_progress.assigned 
              });
            }
          });
          
          // Sum up totals across all roles
          event.total_workers_needed = Array.from(roleMap.values()).reduce((sum, role) => sum + role.required, 0);
          event.assigned_workers_count = Array.from(roleMap.values()).reduce((sum, role) => sum + role.assigned, 0);
        });
        
        // Calculate staffing percentages and status
        const eventsData = Array.from(eventsMap.values()).map(event => {
          // Use API calculated unfilled_roles_count if available, otherwise calculate
          event.unfilled_roles_count = event.unfilled_roles_count || (event.total_workers_needed - event.assigned_workers_count);
          event.staffing_percentage = event.total_workers_needed > 0 
            ? Math.round((event.assigned_workers_count / event.total_workers_needed) * 100)
            : 0;
          
          // Check if any shifts need workers (assigned_count = 0)
          const hasUnassignedShifts = event.shifts.some(shift => shift.staffing_progress.assigned === 0);
          
          if (event.staffing_percentage === 100) {
            event.staffing_status = 'fully_staffed';
          } else if (hasUnassignedShifts) {
            event.staffing_status = 'needs_workers';
          } else {
            event.staffing_status = 'partially_staffed';
          }
          
          
          return event;
        });
        
        // Apply filter
        let filteredEvents = eventsData;
        if (filterStatus !== 'all') {
          filteredEvents = eventsData.filter((event: EventStaffing) => {
            switch (filterStatus) {
              case 'needs_workers':
                return event.staffing_status === 'needs_workers';
              case 'partially_filled':
                return event.staffing_status === 'partially_staffed';
              case 'fully_staffed':
                return event.staffing_status === 'fully_staffed';
              default:
                return true;
            }
          });
        }
        
        setEvents(filteredEvents);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }
  
  async function loadPastAssignments() {
    setLoading(true);
    try {
      const url = `/staffing?status=completed&start_date=${selectedDateRange.start}&end_date=${selectedDateRange.end}`;
      const response = await apiClient.get(url);
      
      if (response.data.status === 'success') {
        setPastAssignments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load past assignments:', error);
      setPastAssignments([]);
    } finally {
      setLoading(false);
    }
  }
  
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date.toISOString().split('T')[0];
  }
  
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  const handleFilterChange = (filter: FilterType) => {
    setFilterStatus(filter);
    const params = new URLSearchParams(searchParams);
    params.set('filter', filter);
    setSearchParams(params);
  };
  
  const toggleEvent = (eventId: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };
  
  const openAssignmentModal = (shiftId: number) => {
    setAssignmentModal({ isOpen: true, shiftId });
  };
  
  const closeAssignmentModal = () => {
    setAssignmentModal({ isOpen: false });
  };
  
  async function handleAssignmentSuccess() {
    closeAssignmentModal();
    loadActiveEvents();
  }
  
  // Filter events by search
  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      event.venue.name.toLowerCase().includes(query)
    );
  });
  
  // Filter past assignments by search
  const filteredPastAssignments = pastAssignments.filter(assignment => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      assignment.event.title.toLowerCase().includes(query) ||
      assignment.worker.first_name.toLowerCase().includes(query) ||
      assignment.worker.last_name.toLowerCase().includes(query) ||
      assignment.shift.role_needed.toLowerCase().includes(query)
    );
  });
  
  async function exportPastAssignments() {
    try {
      const url = `/reports/timesheet?start_date=${selectedDateRange.start}&end_date=${selectedDateRange.end}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to export:', error);
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Staffing</h1>
          <p className="text-gray-600 mt-1">Assign workers to event shifts</p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          <button
            onClick={() => handleTabChange('active')}
            className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
              activeTab === 'active'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Assignments
          </button>
          <button
            onClick={() => handleTabChange('past')}
            className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
              activeTab === 'past'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Past Assignments
          </button>
        </div>
        
        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'active' ? 'Search events...' : 'Search assignments...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          {/* Active Tab Filters */}
          {activeTab === 'active' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('needs_workers')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterStatus === 'needs_workers'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                Needs Workers
              </button>
              <button
                onClick={() => handleFilterChange('partially_filled')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterStatus === 'partially_filled'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                Partial
              </button>
              <button
                onClick={() => handleFilterChange('fully_staffed')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterStatus === 'fully_staffed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                Ready
              </button>
            </div>
          )}
          
          {/* Past Tab Date Range */}
          {activeTab === 'past' && (
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDateRange.start}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={selectedDateRange.end}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={loadPastAssignments}
                className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={exportPastAssignments}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Export CSV"
              >
                <Download size={20} />
              </button>
            </div>
          )}
        </div>
        
        {/* Content */}
        {loading ? (
          <LoadingSpinner message="Loading staffing data..." />
        ) : activeTab === 'active' ? (
          <ActiveAssignmentsTab
            events={filteredEvents}
            expandedEvents={expandedEvents}
            onToggleEvent={toggleEvent}
            onAssignWorker={openAssignmentModal}
            searchQuery={searchQuery}
          />
        ) : (
          <PastAssignmentsTab
            assignments={filteredPastAssignments}
            searchQuery={searchQuery}
            dateRange={selectedDateRange}
          />
        )}
      </div>
      
      {/* Assignment Modal */}
      {assignmentModal.isOpen && assignmentModal.shiftId && (
        <AssignmentModal
          shiftId={assignmentModal.shiftId}
          onClose={closeAssignmentModal}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </div>
  );
}

// Active Assignments Tab Component
interface ActiveAssignmentsTabProps {
  events: EventStaffing[];
  expandedEvents: Set<number>;
  onToggleEvent: (eventId: number) => void;
  onAssignWorker: (shiftId: number) => void;
  searchQuery: string;
}

function ActiveAssignmentsTab({ 
  events, 
  expandedEvents, 
  onToggleEvent, 
  onAssignWorker,
  searchQuery 
}: ActiveAssignmentsTabProps) {
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  const getStatusBadge = (percentage: number) => {
    if (percentage === 100) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <Check size={14} />
          Ready
        </span>
      );
    } else if (percentage > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
          <AlertCircle size={14} />
          Partial
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
          <X size={14} />
          Needs Workers
        </span>
      );
    }
  };
  
  if (events.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title={searchQuery ? 'No events found' : 'No events to staff'}
        description={
          searchQuery 
            ? 'Try adjusting your search query or filters'
            : 'Publish events to see them here and assign workers'
        }
        action={
          !searchQuery 
            ? {
                label: 'Go to Events',
                onClick: () => navigate('/events')
              }
            : undefined
        }
      />
    );
  }
  
  // Group shifts by role for each event
  const groupShiftsByRole = (shifts: Shift[]) => {
    return shifts.reduce((acc, shift) => {
      if (!acc[shift.role_needed]) {
        acc[shift.role_needed] = [];
      }
      acc[shift.role_needed].push(shift);
      return acc;
    }, {} as Record<string, Shift[]>);
  };
  
  return (
    <div className="space-y-4">
      {events.map((event) => {
        const isExpanded = expandedEvents.has(event.id);
        const shiftsByRole = groupShiftsByRole(event.shifts || []);
        
        return (
          <div 
            key={event.id} 
            id={`event-${event.id}`}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Event Header */}
            <button
              onClick={() => onToggleEvent(event.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <div className="flex items-start gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {event.title}
                  </h3>
                  {getStatusBadge(event.staffing_percentage)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-gray-400" />
                    {event.venue.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-400" />
                    {formatDate(event.schedule.start_time_utc)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-400" />
                    {formatTime(event.schedule.start_time_utc)}
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {event.assigned_workers_count} of {event.total_workers_needed} roles filled
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {event.staffing_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        event.staffing_percentage === 100
                          ? 'bg-green-500'
                          : event.staffing_percentage > 0
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${event.staffing_percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="ml-4">
                {isExpanded ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </div>
            </button>
            
            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="space-y-4">
                  {Object.entries(shiftsByRole).map(([roleName, shifts]) => {
                    const assignedCount = shifts.filter(s => s.staffing_progress.percentage === 100).length;
                    const totalCount = shifts.length;
                    const needsCount = totalCount - assignedCount;
                    
                    return (
                      <div key={roleName} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-gray-900">{roleName}</h4>
                            <span className="text-sm text-gray-600">
                              {assignedCount}/{totalCount} assigned
                            </span>
                          </div>
                          
                          {needsCount > 0 && (
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              {needsCount} needed
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {shifts.map((shift, index) => (
                            <div
                              key={shift.id}
                              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-600">
                                  #{index + 1}
                                </span>
                                <span className="text-sm text-gray-700">
                                  {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                                </span>
                              </div>
                              
                              {shift.staffing_progress.percentage === 100 ? (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                                  <Check size={16} />
                                  Assigned
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAssignWorker(shift.id);
                                  }}
                                  className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                                >
                                  Assign Worker
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Past Assignments Tab Component
interface PastAssignmentsTabProps {
  assignments: Assignment[];
  searchQuery: string;
  dateRange: { start: string; end: string };
}

function PastAssignmentsTab({ assignments, searchQuery, dateRange }: PastAssignmentsTabProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  if (assignments.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title={searchQuery ? 'No assignments found' : 'No past assignments'}
        description={
          searchQuery 
            ? 'Try adjusting your search query'
            : `No completed assignments between ${formatDate(dateRange.start)} and ${formatDate(dateRange.end)}`
        }
      />
    );
  }
  
  // Group assignments by event
  const assignmentsByEvent = assignments.reduce((acc, assignment) => {
    const eventId = assignment.event.id;
    if (!acc[eventId]) {
      acc[eventId] = {
        event: assignment.event,
        shift: assignment.shift,
        assignments: []
      };
    }
    acc[eventId].assignments.push(assignment);
    return acc;
  }, {} as Record<number, { event: any; shift: Shift; assignments: Assignment[] }>);
  
  return (
    <div className="space-y-4">
      {Object.values(assignmentsByEvent).map(({ event, shift, assignments: eventAssignments }) => {
        const totalHours = eventAssignments.reduce((sum, a) => sum + (a.hours_worked || 0), 0);
        const totalPay = eventAssignments.reduce((sum, a) => sum + (a.total_pay || 0), 0);
        
        return (
          <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Event Header */}
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {event.title}
                </h3>
                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  Completed
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" />
                  {formatDate(shift.start_time_utc)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-gray-400" />
                  {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-gray-400" />
                  {shift.location}
                </div>
              </div>
            </div>
            
            {/* Workers Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Role</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Worker</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Hours</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Rate</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Total Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {eventAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {assignment.shift.role_needed}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {assignment.worker.first_name} {assignment.worker.last_name}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700">
                        {assignment.hours_worked?.toFixed(2) || '—'}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700">
                        ${assignment.pay_rate?.toFixed(2) || '—'}/hr
                      </td>
                      <td className="py-3 px-3 text-sm text-right font-medium text-gray-900">
                        ${assignment.total_pay?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td colSpan={2} className="py-3 px-3 text-sm text-gray-900">
                      Total ({eventAssignments.length} workers)
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-900">
                      {totalHours.toFixed(2)} hrs
                    </td>
                    <td className="py-3 px-3"></td>
                    <td className="py-3 px-3 text-sm text-right text-gray-900">
                      ${totalPay.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Assignment Modal Component
interface AssignmentModalProps {
  shiftId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function AssignmentModal({ shiftId, onClose, onSuccess }: AssignmentModalProps) {
  const [shift, setShift] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    loadData();
  }, [shiftId]);
  
  async function loadData() {
    setLoading(true);
    try {
      // Load shift details
      const shiftResponse = await apiClient.get(`/shifts/${shiftId}`);
      
      if (shiftResponse.data.status === 'success') {
        setShift(shiftResponse.data.data);
      }
      
      // Load available workers
      const workersResponse = await apiClient.get('/workers?active=true');
      
      if (workersResponse.data.status === 'success') {
        setWorkers(workersResponse.data.data.workers || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }
  
  async function handleAssign() {
    if (!selectedWorkerId) {
      setError('Please select a worker');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/staffing', {
        staffing: {
          worker_id: selectedWorkerId,
          shift_id: shiftId
        }
      });
      
      if (response.data.status === 'success') {
        onSuccess();
      } else {
        setError(response.data.errors?.join(', ') || 'Failed to assign worker');
      }
    } catch (error) {
      console.error('Failed to assign worker:', error);
      setError('Failed to assign worker');
    } finally {
      setSubmitting(false);
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Filter workers by search and skills
  const filteredWorkers = (workers || []).filter(worker => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        worker.first_name.toLowerCase().includes(query) ||
        worker.last_name.toLowerCase().includes(query) ||
        worker.email.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }
    
    // Skills filter (if shift has required skill)
    if (shift?.role_needed) {
      const hasRequiredSkill = worker.skills_json?.includes(shift.role_needed);
      if (!hasRequiredSkill) return false;
    }
    
    return true;
  });
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Assign Worker</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <LoadingSpinner message="Loading data..." />
          ) : (
            <>
              {/* Shift Info */}
              {shift && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">{shift.client_name}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Users size={14} />
                      <span className="font-medium">{shift.role_needed}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{formatDate(shift.start_time_utc)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>{formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>{shift.location}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {/* Search Workers */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Worker
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              
              {/* Workers List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredWorkers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users size={48} className="mx-auto mb-2 text-gray-300" />
                    <p>No available workers found</p>
                    {searchQuery && (
                      <p className="text-sm mt-1">Try adjusting your search</p>
                    )}
                    {!searchQuery && shift?.role_needed && (
                      <p className="text-sm mt-1">No workers have the "{shift.role_needed}" skill</p>
                    )}
                  </div>
                ) : (
                  filteredWorkers.map((worker) => (
                    <button
                      key={worker.id}
                      onClick={() => setSelectedWorkerId(worker.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedWorkerId === worker.id
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {worker.first_name} {worker.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">{worker.email}</p>
                          {worker.phone && (
                            <p className="text-sm text-gray-500 mt-1">{worker.phone}</p>
                          )}
                          
                          {/* Skills */}
                          {worker.skills_json && worker.skills_json.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {worker.skills_json.map((skill: string) => (
                                <span
                                  key={skill}
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    skill === shift?.role_needed
                                      ? 'bg-teal-100 text-teal-700 font-medium'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {selectedWorkerId === worker.id && (
                          <div className="ml-4">
                            <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
                              <Check size={16} className="text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedWorkerId || submitting}
            className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Assigning...' : 'Assign Worker'}
          </button>
        </div>
      </div>
    </div>
  );
}