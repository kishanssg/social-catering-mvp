import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Calendar,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Check,
  X,
  Download,
  DollarSign,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

type TabType = 'draft' | 'active' | 'past';
type FilterType = 'all' | 'needs_workers' | 'partially_filled' | 'fully_staffed';

interface Event {
  id: number;
  title: string;
  status: string;
  staffing_status: string;
  venue: {
    id: number;
    name: string;
    formatted_address: string;
  } | null;
  schedule: {
    start_time_utc: string;
    end_time_utc: string;
    break_minutes: number;
  } | null;
  total_workers_needed: number;
  assigned_workers_count: number;
  unfilled_roles_count: number;
  staffing_percentage: number;
  shifts_count: number;
  shifts?: Shift[];
  created_at: string;
}

interface Shift {
  id: number;
  role_needed: string;
  status: string;
  staffing_progress: {
    assigned: number;
    required: number;
    percentage: number;
  };
  start_time_utc: string;
  end_time_utc: string;
  assignments: Assignment[];
}

interface Assignment {
  id: number;
  worker: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  hours_worked?: number;
  status: string;
}

export function EventsPageUnified() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialTab = (searchParams.get('tab') as TabType) || 'active';
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [filterStatus, setFilterStatus] = useState<FilterType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'staffing'>('date');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  
  // Assignment modal state
  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    shiftId?: number;
  }>({ isOpen: false });
  
  useEffect(() => {
    loadEvents();
  }, [activeTab, filterStatus]);
  
  async function loadEvents() {
    setLoading(true);
    try {
      const url = `/api/v1/events?tab=${activeTab}${
        filterStatus !== 'all' ? `&filter=${filterStatus}` : ''
      }`;
      
      const response = await apiClient.get(url);
      
      if (response.data.status === 'success') {
        // Ensure we have an array of events
        const eventsData = Array.isArray(response.data.data) ? response.data.data : [];
        setEvents(eventsData);
      } else {
        console.error('API returned error:', response.data);
        setEvents([]);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }
  
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setFilterStatus('all'); // Reset filter on tab change
  };
  
  const handleFilterChange = (filter: FilterType) => {
    setFilterStatus(filter);
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
  
  async function handleDelete(eventId: number) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const response = await apiClient.delete(`/events/${eventId}`);
      
      if (response.data.status === 'success') {
        loadEvents();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }
  
  async function handlePublish(eventId: number) {
    if (!confirm('Publish this event? This will create shifts and make them available for staffing.')) return;
    
    try {
      const response = await apiClient.post(`/events/${eventId}/publish`);
      
      if (response.data.status === 'success') {
        alert(response.data.message);
        loadEvents();
      } else {
        alert(response.data.message || 'Failed to publish event');
      }
    } catch (error) {
      console.error('Failed to publish event:', error);
    }
  }
  
  const openAssignmentModal = (shiftId: number) => {
    setAssignmentModal({ isOpen: true, shiftId });
  };
  
  const closeAssignmentModal = () => {
    setAssignmentModal({ isOpen: false });
  };
  
  const handleAssignmentSuccess = () => {
    closeAssignmentModal();
    loadEvents();
  };
  
  // Filter events
  const filteredEvents = (events || [])
    .filter(event => {
      if (!event || !searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (event.title || '').toLowerCase().includes(query) ||
        (event.venue?.name || '').toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (!a || !b) return 0;
      switch (sortBy) {
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'staffing':
          return (a.staffing_percentage || 0) - (b.staffing_percentage || 0);
        case 'date':
        default:
          const dateA = a.schedule?.start_time_utc || a.created_at;
          const dateB = b.schedule?.start_time_utc || b.created_at;
          return new Date(dateA || 0).getTime() - new Date(dateB || 0).getTime();
      }
    });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">Manage events and assign workers</p>
          </div>
          
          <button
            onClick={() => navigate('/events/create')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            Create New Event
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          <button
            onClick={() => handleTabChange('draft')}
            className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
              activeTab === 'draft'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Draft Events
          </button>
          <button
            onClick={() => handleTabChange('active')}
            className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
              activeTab === 'active'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Events
          </button>
          <button
            onClick={() => handleTabChange('past')}
            className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
              activeTab === 'past'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Past Events
          </button>
        </div>
        
        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search events or venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            {activeTab !== 'draft' && <option value="staffing">Sort by Staffing</option>}
          </select>
          
          {/* Status Filters (Active tab only) */}
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
        </div>
        
        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {activeTab === 'draft' && (
              <DraftEventsTab
                events={filteredEvents}
                onDelete={handleDelete}
                onPublish={handlePublish}
                onNavigate={(path) => navigate(path)}
                searchQuery={searchQuery}
              />
            )}
            
            {activeTab === 'active' && (
              <ActiveEventsTab
                events={filteredEvents}
                expandedEvents={expandedEvents}
                onToggleEvent={toggleEvent}
                onAssignWorker={openAssignmentModal}
                searchQuery={searchQuery}
              />
            )}
            
            {activeTab === 'past' && (
              <PastEventsTab
                events={filteredEvents}
                expandedEvents={expandedEvents}
                onToggleEvent={toggleEvent}
                searchQuery={searchQuery}
              />
            )}
          </>
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

// Draft Events Tab Component
interface DraftEventsTabProps {
  events: Event[];
  onDelete: (id: number) => void;
  onPublish: (id: number) => void;
  onNavigate: (path: string) => void;
  searchQuery: string;
}

function DraftEventsTab({ events, onDelete, onPublish, onNavigate, searchQuery }: DraftEventsTabProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No draft events"
        description={searchQuery ? "No events match your search criteria" : "Create your first event to get started"}
        action={
          !searchQuery ? {
            label: "Create Event",
            onClick: () => onNavigate('/events/create')
          } : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{event.title || 'Untitled Event'}</h3>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  Draft
                </span>
              </div>
              
              {event.venue && (
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MapPin size={16} />
                  <span>{event.venue.name || 'Unknown Venue'}</span>
                </div>
              )}
              
              {event.schedule && (
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Clock size={16} />
                  <span>
                    {event.schedule.start_time_utc ? new Date(event.schedule.start_time_utc).toLocaleDateString() : 'No date'} • 
                    {event.schedule.start_time_utc ? new Date(event.schedule.start_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} - 
                    {event.schedule.end_time_utc ? new Date(event.schedule.end_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users size={16} />
                  <span>{event.total_workers_needed || 0} workers needed</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  <span>Created {new Date(event.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate(`/events/${event.id}/edit`)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit size={16} />
                Edit
              </button>
              
              <button
                onClick={() => onPublish(event.id)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Check size={16} />
                Publish
              </button>
              
              <button
                onClick={() => onDelete(event.id)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Active Events Tab Component (Merged with Staffing functionality)
interface ActiveEventsTabProps {
  events: Event[];
  expandedEvents: Set<number>;
  onToggleEvent: (id: number) => void;
  onAssignWorker: (shiftId: number) => void;
  searchQuery: string;
}

function ActiveEventsTab({ 
  events, 
  expandedEvents, 
  onToggleEvent, 
  onAssignWorker,
  searchQuery 
}: ActiveEventsTabProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No active events"
        description={searchQuery ? "No events match your search criteria" : "No published events available for staffing"}
        action={
          !searchQuery ? {
            label: "Create Event",
            onClick: () => window.location.href = '/events/create'
          } : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Event Header */}
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{event.title || 'Untitled Event'}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    (event.staffing_percentage || 0) === 100 
                      ? 'bg-green-100 text-green-700'
                      : (event.staffing_percentage || 0) > 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {(event.staffing_percentage || 0) === 100 ? 'Ready' : 
                     (event.staffing_percentage || 0) > 0 ? 'Partial' : 'Needs Workers'}
                  </span>
                </div>
                
                {event.venue && (
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <MapPin size={16} />
                    <span>{event.venue.name || 'Unknown Venue'}</span>
                  </div>
                )}
                
                {event.schedule && (
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Clock size={16} />
                    <span>
                      {new Date(event.schedule.start_time_utc).toLocaleDateString()} • 
                      {new Date(event.schedule.start_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(event.schedule.end_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{event.assigned_workers_count || 0} / {event.total_workers_needed || 0} workers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle size={16} />
                    <span>{event.unfilled_roles_count || 0} unfilled roles</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleEvent(event.id)}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {expandedEvents.has(event.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {expandedEvents.has(event.id) ? 'Hide' : 'Show'} Details
                </button>
              </div>
            </div>
          </div>
          
          {/* Expanded Shifts */}
          {expandedEvents.has(event.id) && event.shifts && (
            <div className="border-t border-gray-200 bg-gray-50">
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Shifts & Assignments</h4>
                <div className="space-y-3">
                  {(event.shifts || []).map((shift) => (
                    <div key={shift.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">{shift.role_needed}</h5>
                          <p className="text-sm text-gray-600">
                            {new Date(shift.start_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(shift.end_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {shift.staffing_progress.assigned} / {shift.staffing_progress.required}
                            </div>
                            <div className="text-xs text-gray-500">
                              {shift.staffing_progress.percentage}% filled
                            </div>
                          </div>
                          
                          <button
                            onClick={() => onAssignWorker(shift.id)}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                          >
                            <UserPlus size={16} />
                            Assign
                          </button>
                        </div>
                      </div>
                      
                      {/* Current Assignments */}
                      {shift.assignments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-sm font-medium text-gray-700 mb-2">Assigned Workers:</div>
                          <div className="space-y-2">
                            {(shift.assignments || []).map((assignment) => (
                              <div key={assignment.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-teal-700">
                                      {(assignment.worker?.first_name || 'U')[0]}{(assignment.worker?.last_name || 'W')[0]}
                                    </span>
                                  </div>
                                  <span className="text-gray-900">
                                    {assignment.worker?.first_name || 'Unknown'} {assignment.worker?.last_name || 'Worker'}
                                  </span>
                                </div>
                                <span className="text-gray-500">{assignment.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Past Events Tab Component
interface PastEventsTabProps {
  events: Event[];
  expandedEvents: Set<number>;
  onToggleEvent: (id: number) => void;
  searchQuery: string;
}

function PastEventsTab({ 
  events, 
  expandedEvents, 
  onToggleEvent,
  searchQuery 
}: PastEventsTabProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No past events"
        description={searchQuery ? "No events match your search criteria" : "No completed events found"}
      />
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Event Header */}
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{event.title || 'Untitled Event'}</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                    Completed
                  </span>
                </div>
                
                {event.venue && (
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <MapPin size={16} />
                    <span>{event.venue.name || 'Unknown Venue'}</span>
                  </div>
                )}
                
                {event.schedule && (
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Clock size={16} />
                    <span>
                      {new Date(event.schedule.start_time_utc).toLocaleDateString()} • 
                      {new Date(event.schedule.start_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(event.schedule.end_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{event.assigned_workers_count} workers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign size={16} />
                    <span>Payroll data available</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleEvent(event.id)}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {expandedEvents.has(event.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {expandedEvents.has(event.id) ? 'Hide' : 'Show'} Details
                </button>
                
                <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>
          </div>
          
          {/* Expanded Details */}
          {expandedEvents.has(event.id) && event.shifts && (
            <div className="border-t border-gray-200 bg-gray-50">
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Workers & Hours</h4>
                <div className="space-y-3">
                  {(event.shifts || []).map((shift) => (
                    <div key={shift.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">{shift.role_needed}</h5>
                          <p className="text-sm text-gray-600">
                            {new Date(shift.start_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(shift.end_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {shift.staffing_progress.assigned} workers
                          </div>
                        </div>
                      </div>
                      
                      {/* Worker Hours */}
                      {shift.assignments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="space-y-2">
                            {(shift.assignments || []).map((assignment) => (
                              <div key={assignment.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-teal-700">
                                      {(assignment.worker?.first_name || 'U')[0]}{(assignment.worker?.last_name || 'W')[0]}
                                    </span>
                                  </div>
                                  <span className="text-gray-900">
                                    {assignment.worker?.first_name || 'Unknown'} {assignment.worker?.last_name || 'Worker'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-gray-900">
                                    {assignment.hours_worked || 0} hours
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {assignment.status}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Assignment Modal Component (reused from StaffingPage)
interface AssignmentModalProps {
  shiftId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function AssignmentModal({ shiftId, onClose, onSuccess }: AssignmentModalProps) {
  // This would be the same implementation as in StaffingPage
  // For now, just a placeholder
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Assign Workers</h3>
        <p className="text-gray-600 mb-4">Assignment modal for shift {shiftId}</p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onSuccess}
            className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
