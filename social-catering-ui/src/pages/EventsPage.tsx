import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Calendar,
  MapPin,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  Award
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { safeToFixed } from '../utils/number';
import { AssignmentModal } from '../components/AssignmentModal';
import { Toast } from '../components/common/Toast';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { QuickFillModal } from '../components/QuickFillModal';
import { EditEventModal } from '../components/EditEventModal';
import ApprovalModal from '../components/ApprovalModal';
import { EventCardSkeleton } from '../components/common/SkeletonLoader';
import { useDebounce } from '../hooks/useDebounce';
import { apiClient } from '../lib/api';

type TabType = 'draft' | 'active' | 'past' | 'completed';
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
  staffing_summary: string;
  shifts_count: number;
  shifts_by_role?: ShiftsByRole[];
  created_at: string;
  // Approval status (fetched separately for completed events)
  approval_status?: {
    total: number;
    approved: number;
    pending: number;
  };
}

interface ShiftsByRole {
  role_name: string;
  total_shifts: number;
  filled_shifts: number;
  shifts: Shift[];
}

interface Shift {
  id: number;
  start_time_utc: string;
  end_time_utc: string;
  status: string;
  pay_rate?: number;
  staffing_progress: {
    assigned: number;
    required: number;
    percentage: number;
  };
  assignments: Assignment[];
}

interface Assignment {
  id: number;
  worker: {
    id: number;
    first_name: string;
    last_name: string;
  };
  hours_worked?: number;
  hourly_rate?: number;
  status: string;
  approved?: boolean;
  approved_by_name?: string;
  approved_at?: string;
  scheduled_hours?: number;
  effective_hours?: number;
  effective_pay?: number;
}

export function EventsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialTab = ((searchParams.get('tab') as TabType) === 'completed' ? 'completed' : (searchParams.get('tab') as TabType)) || 'active';
  const initialFilter = (searchParams.get('filter') as FilterType) || 'needs_workers'; // Default to needs_workers filter
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [filterStatus, setFilterStatus] = useState<FilterType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce search by 500ms
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'staffing'>('date');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  // Approval modal
  const [approvalModal, setApprovalModal] = useState<{ isOpen: boolean; event?: any }>({ isOpen: false });
  
  // Assignment modal
  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    shiftId?: number;
  }>({ isOpen: false });

  // Toast state
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error';
    action?: {
      label: string;
      onClick: () => void;
      variant?: 'primary' | 'secondary';
    };
  }>({ isVisible: false, message: '', type: 'success' });

  // Publish modal state
  const [publishModal, setPublishModal] = useState<{
    isOpen: boolean;
    eventId?: number;
    isLoading: boolean;
  }>({ isOpen: false, isLoading: false });

  // Unassign modal state
  const [unassignModal, setUnassignModal] = useState<{
    isOpen: boolean;
    assignmentId?: number;
    isLoading: boolean;
    workerName?: string;
  }>({ isOpen: false, isLoading: false });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    eventId?: number;
    eventTitle?: string;
  }>({ isOpen: false, isLoading: false });
  
  // Quick Fill modal state
  const [quickFill, setQuickFill] = useState<{
    isOpen: boolean;
    eventId?: number;
    roleName?: string;
    unfilledShiftIds: number[];
    payRate?: number;
  }>({ isOpen: false, unfilledShiftIds: [] });
  
  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    event?: Event;
  }>({ isOpen: false });
  
  useEffect(() => {
    loadEvents();
  }, [activeTab, filterStatus, searchParams]);

  // Sync URL parameters with state
  useEffect(() => {
    const tabFromUrl = ((searchParams.get('tab') as TabType) === 'completed' ? 'completed' : (searchParams.get('tab') as TabType)) || 'active';
    const filterFromUrl = (searchParams.get('filter') as FilterType) || 'all';
    
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    if (filterFromUrl !== filterStatus) {
      setFilterStatus(filterFromUrl);
    }
  }, [searchParams, activeTab, filterStatus]);

  // Auto-expand event based on URL parameters
  useEffect(() => {
    const eventIdParam = searchParams.get('event_id');
    const shiftIdParam = searchParams.get('shift_id');
    
    if (eventIdParam) {
      const eventId = parseInt(eventIdParam);
      if (!isNaN(eventId)) {
        // Auto-expand the specific event
        setExpandedEvents(new Set([eventId]));
        
        // If there's also a shift_id, we could scroll to that specific shift
        // For now, just expanding the event is sufficient
        if (shiftIdParam) {
          console.log(`Auto-expanding event ${eventId} with shift ${shiftIdParam}`);
        }
      }
    }
  }, [searchParams]);

  // When deep-linked from dashboard (event_id), ensure we fetch full details so shifts appear
  useEffect(() => {
    const eventIdParam = searchParams.get('event_id');
    if (!eventIdParam) return;
    const eventId = parseInt(eventIdParam);
    if (isNaN(eventId)) return;

    const ev = events.find(e => e.id === eventId);
    if (ev && (!ev.shifts_by_role || ev.shifts_by_role.length === 0)) {
      fetchEventDetails(eventId);
      setExpandedEvents(new Set([eventId]));
    }
  }, [searchParams, events]);
  
  async function loadEvents() {
    setLoading(true);
    try {
      const tabForApi = activeTab === 'completed' ? 'completed' : activeTab;
      const dateParam = searchParams.get('date');
      
      let url = `/events?tab=${tabForApi}`;
      if (filterStatus !== 'all') {
        url += `&filter=${filterStatus}`;
      }
      if (dateParam) {
        url += `&date=${dateParam}`;
      }
      
      console.log('Loading events with URL:', url, 'filterStatus:', filterStatus, 'date:', dateParam);
      
      const response = await apiClient.get(url);
      
      if (response.data.status === 'success') {
        console.log('Received events:', response.data.data.length);
        const loadedEvents = response.data.data;
        
        // For completed events, fetch approval status
        if (activeTab === 'completed') {
          const eventsWithApprovals = await Promise.all(
            loadedEvents.map(async (event: Event) => {
              try {
                const apprResponse = await apiClient.get(`/events/${event.id}/approvals`);
                if (apprResponse.data?.status === 'success') {
                  const assignments = apprResponse.data.data.assignments || [];
                  const total = assignments.length;
                  const approved = assignments.filter((a: any) => a.approved).length;
                  return {
                    ...event,
                    approval_status: {
                      total,
                      approved,
                      pending: total - approved
                    }
                  };
                }
              } catch (e) {
                // Non-blocking - just skip approval status
                console.warn(`Failed to load approval status for event ${event.id}:`, e);
              }
              return event;
            })
          );
          setEvents(eventsWithApprovals);
        } else {
          setEvents(loadedEvents);
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }
  
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    // Only set needs_workers filter for active tab, otherwise no filter
    setFilterStatus(tab === 'active' ? 'needs_workers' : 'all');
  };
  
  const handleFilterChange = (filter: FilterType) => {
    setFilterStatus(filter);
    // Update URL with filter parameter
    const newParams = new URLSearchParams();
    newParams.set('tab', activeTab);
    if (filter !== 'all') {
      newParams.set('filter', filter);
    }
    setSearchParams(newParams);
    // Note: loadEvents will be called by useEffect when filterStatus changes
  };
  
  const fetchEventDetails = async (eventId: number) => {
    try {
      const [eventResponse, approvalsResponse] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/events/${eventId}/approvals`).catch(() => null) // Non-blocking
      ]);
      
      if (eventResponse.data?.status === 'success') {
        const detailed = eventResponse.data.data;
        
        // Merge approval status into assignments if available
        if (approvalsResponse?.data?.status === 'success') {
          const approvalAssignments = approvalsResponse.data.data.assignments || [];
          const approvalMap = new Map(approvalAssignments.map((a: any) => [a.id, a]));
          
          // Update assignments in shifts_by_role with approval data
          if (detailed.shifts_by_role) {
            detailed.shifts_by_role = detailed.shifts_by_role.map((roleGroup: any) => ({
              ...roleGroup,
              shifts: roleGroup.shifts.map((shift: any) => ({
                ...shift,
                assignments: shift.assignments.map((assignment: any) => {
                  const approvalData = approvalMap.get(assignment.id);
                  if (approvalData && typeof approvalData === 'object') {
                    return { ...assignment, ...approvalData };
                  }
                  return assignment;
                })
              }))
            }));
          }
        }
        
        setEvents(prev => prev.map(e => (e.id === eventId ? { ...e, ...detailed } : e)));
      }
    } catch (err) {
      console.error('Failed to load event details', err);
    }
  };

  const toggleEvent = (eventId: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
      const ev = events.find(e => e.id === eventId);
      const hasAssignments = !!ev?.shifts_by_role?.some(rg => rg.shifts?.some(s => (s.assignments || []).length > 0));
      if (!hasAssignments) {
        fetchEventDetails(eventId);
      }
    }
    setExpandedEvents(newExpanded);
  };
  
  async function handleDelete(eventId: number) {
    // Find the event to get its title
    const event = events?.find(e => e.id === eventId);
    setDeleteModal({ 
      isOpen: true, 
      isLoading: false, 
      eventId, 
      eventTitle: event?.title 
    });
  }

  async function confirmDelete() {
    if (!deleteModal.eventId) return;
    
    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await apiClient.delete(`/events/${deleteModal.eventId}`);
      
      if (response.data.status === 'success') {
        setDeleteModal({ isOpen: false, isLoading: false });
        setToast({ 
          isVisible: true, 
          message: `"${response.data.event_title}" moved to trash`, 
          type: 'success',
          action: {
            label: 'Undo',
            onClick: () => handleRestore(response.data.event_id),
            variant: 'primary'
          }
        });
        loadEvents();
      } else {
        setToast({ 
          isVisible: true, 
          message: response.data.message || 'Unable to delete event', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      setToast({ 
        isVisible: true, 
        message: 'Unable to delete event', 
        type: 'error' 
      });
    } finally {
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  }

  async function handleRestore(eventId: number) {
    try {
      const response = await apiClient.post(`/events/${eventId}/restore`);
      
      if (response.data.status === 'success') {
        setToast({ 
          isVisible: true, 
          message: 'Event restored to draft', 
          type: 'success' 
        });
        loadEvents();
      } else {
        setToast({ 
          isVisible: true, 
          message: response.data.message || 'Unable to restore event', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Failed to restore event:', error);
      setToast({ 
        isVisible: true, 
        message: 'Unable to restore event', 
        type: 'error' 
      });
    }
  }

  function closeDeleteModal() {
    setDeleteModal({ isOpen: false, isLoading: false });
  }
  
  function handlePublish(eventId: number) {
    setPublishModal({ isOpen: true, eventId, isLoading: false });
  }

  async function confirmPublish() {
    if (!publishModal.eventId) return;
    setPublishModal(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await apiClient.post(`/events/${publishModal.eventId}/publish`);
      if (response.data.status === 'success') {
        setToast({ isVisible: true, message: 'Event published successfully', type: 'success' });
        setPublishModal({ isOpen: false, isLoading: false });
        loadEvents();
      } else {
        setToast({ isVisible: true, message: response.data.message || 'Unable to publish event', type: 'error' });
        setPublishModal({ isOpen: false, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to publish event:', error);
      setToast({ isVisible: true, message: 'Unable to publish event', type: 'error' });
      setPublishModal({ isOpen: false, isLoading: false });
    }
  }

  function closePublishModal() {
    setPublishModal({ isOpen: false, isLoading: false });
  }

  // Unassign flow
  function handleUnassignOpen(assignmentId: number, workerName?: string) {
    setUnassignModal({ isOpen: true, assignmentId, isLoading: false, workerName });
  }

  async function confirmUnassign() {
    if (!unassignModal.assignmentId) return;
    setUnassignModal(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await apiClient.delete(`/staffing/${unassignModal.assignmentId}`);
      if (response.data?.status === 'success') {
        setToast({ isVisible: true, message: 'Worker unassigned successfully', type: 'success' });
        setUnassignModal({ isOpen: false, isLoading: false });
        loadEvents();
      } else {
        setToast({ isVisible: true, message: response.data?.message || 'Unable to unassign worker', type: 'error' });
        setUnassignModal({ isOpen: false, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to unassign worker:', error);
      setToast({ isVisible: true, message: 'Unable to unassign worker', type: 'error' });
      setUnassignModal({ isOpen: false, isLoading: false });
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
    setToast({
      isVisible: true,
      message: 'Worker assigned',
      type: 'success'
    });
    loadEvents();
  };
  
  // Filter and sort
  const filteredEvents = events
    .filter(event => {
      // Search filter (use debounced value to reduce filtering during typing)
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchesSearch = (
          event.title.toLowerCase().includes(query) ||
          event.venue?.name.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }
      
      // Status filter (only for active tab)
      if (activeTab === 'active') {
        switch (filterStatus) {
          case 'needs_workers':
            return event.unfilled_roles_count > 0;
          case 'partially_filled':
            return event.unfilled_roles_count > 0 && event.assigned_workers_count > 0;
          case 'fully_staffed':
            return event.unfilled_roles_count === 0 && event.assigned_workers_count > 0;
          case 'all':
          default:
            return true;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'staffing':
          return a.staffing_percentage - b.staffing_percentage;
        case 'date':
        default:
          const dateA = a.schedule?.start_time_utc || a.created_at;
          const dateB = b.schedule?.start_time_utc || b.created_at;
          return new Date(dateA).getTime() - new Date(dateB).getTime();
      }
    });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Events</h1>
              <p className="text-sm text-gray-600 mt-1">Manage events and assign workers</p>
            </div>
            <button
              onClick={() => navigate('/events/create')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm min-h-touch"
            >
              <Plus size={20} />
              Create New Event
            </button>
          </div>
          
          {/* Date Filter Indicator */}
          {searchParams.get('date') && (
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-lg">
              <Calendar size={16} className="text-teal-600" />
              <span className="text-sm font-medium text-teal-900">
                Showing events for {format(parseISO(searchParams.get('date')!), 'EEEE, MMMM d, yyyy')}
              </span>
              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('date');
                  setSearchParams(newParams);
                }}
                className="ml-auto text-teal-600 hover:text-teal-700"
                title="Clear date filter"
              >
                <X size={16} />
              </button>
            </div>
          )}
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
            onClick={() => handleTabChange('completed')}
            className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
              activeTab === 'completed'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed Events
          </button>
        </div>
        
        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 sm:gap-4 mb-6">
          <div className="w-full md:flex-1 md:max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search events or venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            {activeTab !== 'draft' && <option value="staffing">Sort by Staffing</option>}
          </select>
          
          {activeTab === 'active' && (
            <div className="w-full sm:w-auto flex flex-wrap gap-2">
              <button
                onClick={() => handleFilterChange('all')}
                className={`w-full sm:w-auto px-3 py-2 text-sm font-medium rounded-lg transition ${
                  filterStatus === 'all'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('needs_workers')}
                className={`w-full sm:w-auto px-3 py-2 text-sm font-medium rounded-lg transition ${
                  filterStatus === 'needs_workers'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                Needs Workers
              </button>
              <button
                onClick={() => handleFilterChange('fully_staffed')}
                className={`w-full sm:w-auto px-3 py-2 text-sm font-medium rounded-lg transition ${
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
          <div className="space-y-4">
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
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
                onUnassign={handleUnassignOpen}
                onQuickFill={(eventId, roleName, unfilled, payRate) => setQuickFill({ isOpen: true, eventId, roleName, unfilledShiftIds: unfilled, payRate })}
                onPublish={handlePublish}
                onDelete={handleDelete}
                onEdit={(event) => setEditModal({ isOpen: true, event })}
                searchQuery={searchQuery}
              />
            )}
            
            {activeTab === 'completed' && (
              <PastEventsTab
                events={filteredEvents}
                expandedEvents={expandedEvents}
                onToggleEvent={toggleEvent}
                searchQuery={searchQuery}
                onApproveHours={(event) => setApprovalModal({ isOpen: true, event })}
              />
            )}
          </>
        )}
      </div>
      
      {/* Assignment Modal (reuse from Staffing) */}
      {assignmentModal.isOpen && assignmentModal.shiftId && (
        <AssignmentModal
          shiftId={assignmentModal.shiftId}
          onClose={closeAssignmentModal}
          onSuccess={handleAssignmentSuccess}
        />
      )}

      {/* Toast Notifications */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        action={toast.action}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />

      {/* Publish Confirmation Modal */}
      <ConfirmationModal
        isOpen={publishModal.isOpen}
        onClose={closePublishModal}
        onConfirm={confirmPublish}
        title="Publish Event"
        message="Ready to publish? This will create shifts and make them available for worker assignment."
        confirmText={publishModal.isLoading ? 'Publishing…' : 'Publish'}
        cancelText="Cancel"
        isLoading={publishModal.isLoading}
        isDestructive={false}
      />

      {/* Unassign Confirmation Modal */}
      <ConfirmationModal
        isOpen={unassignModal.isOpen}
        onClose={() => setUnassignModal({ isOpen: false, isLoading: false })}
        onConfirm={confirmUnassign}
        title="Unassign Worker"
        message={`Remove ${unassignModal.workerName || 'this worker'} from this shift?`}
        confirmText={unassignModal.isLoading ? 'Removing…' : 'Unassign'}
        cancelText="Cancel"
        isLoading={unassignModal.isLoading}
        isDestructive={true}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={`Delete "${deleteModal.eventTitle}"? This action cannot be undone.`}
        confirmText={deleteModal.isLoading ? 'Deleting…' : 'Delete'}
        cancelText="Cancel"
        isLoading={deleteModal.isLoading}
        isDestructive={true}
      />

      <QuickFillModal
        isOpen={quickFill.isOpen}
        eventId={quickFill.eventId || 0}
        roleName={quickFill.roleName || ''}
        unfilledShiftIds={quickFill.unfilledShiftIds}
        defaultPayRate={quickFill.payRate}
        onClose={() => setQuickFill({ isOpen: false, unfilledShiftIds: [] })}
        onDone={({ assigned, conflicts, details }) => {
          setQuickFill({ isOpen: false, unfilledShiftIds: [] });
          let message = `Assigned ${assigned} workers • ${conflicts} skipped`;
          if (conflicts > 0 && details) {
            message += `: ${details}`;
          }
          setToast({ isVisible: true, message, type: conflicts > 0 ? 'error' : 'success' });
          loadEvents();
        }}
      />

      {/* Edit Event Modal */}
      {editModal.event && (
        <EditEventModal
          event={editModal.event as any}
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, event: undefined })}
          onSuccess={() => {
            loadEvents(); // Reload events to show changes
            setEditModal({ isOpen: false, event: undefined });
          }}
        />
      )}

      {/* Approval Modal */}
      {approvalModal.isOpen && approvalModal.event && (
        <ApprovalModal
          event={approvalModal.event}
          isOpen={approvalModal.isOpen}
          onClose={() => {
            setApprovalModal({ isOpen: false });
            loadEvents(); // Refresh to update approval badges
          }}
          onSuccess={() => {
            loadEvents(); // Refresh to update approval badges
            setApprovalModal({ isOpen: false });
          }}
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
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    // Parse UTC ISO string and format in local timezone
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  };
  
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    // Parse UTC ISO string and format in local timezone
    const date = parseISO(dateString);
    return format(date, 'h:mm a');
  };
  
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {searchQuery ? 'No draft events found' : 'No draft events yet'}
        </h3>
        <p className="text-gray-600 mb-6">
          {searchQuery 
            ? 'Try adjusting your search query'
            : 'Create your first event to get started'
          }
        </p>
        {!searchQuery && (
          <button
            onClick={() => onNavigate('/events/create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus size={20} />
            Create Event
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Daily Staffing Summary */}
      {events.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {events.length} Event{events.length !== 1 ? 's' : ''} Today
                </p>
                <p className="text-xs text-blue-700">
                  {events.reduce((sum, e) => sum + (e.assigned_workers_count || 0), 0)}/
                  {events.reduce((sum, e) => sum + (e.total_workers_needed || 0), 0)} workers hired
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {events.reduce((sum, e) => sum + (e.assigned_workers_count || 0), 0)}
              </p>
              <p className="text-xs text-blue-700">hired</p>
            </div>
          </div>
        </div>
      )}
      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              {/* Left: Event Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {event.title}
                      {event.schedule && (
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          • {formatTime(event.schedule.start_time_utc)}–{formatTime(event.schedule.end_time_utc)}
                        </span>
                      )}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    Draft
                  </span>
                </div>
                
                {event.venue && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{event.venue?.name || 'No venue'}</span>
                  </div>
                )}
                
                {event.schedule && (
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                      <span>{formatDate(event.schedule.start_time_utc)}</span>
                    </div>
                  </div>
                )}
                
                {event.total_workers_needed > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users size={16} className="text-gray-400" />
                    <span>{event.total_workers_needed} workers needed</span>
                  </div>
                )}
              </div>
              
              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate(`/events/${event.id}/edit`)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                
                {/* Publish and explicit delete actions removed from header to avoid redundancy */}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Active Events Tab Component (replaces Staffing > Active)
interface ActiveEventsTabProps {
  events: Event[];
  expandedEvents: Set<number>;
  onToggleEvent: (id: number) => void;
  onAssignWorker: (shiftId: number) => void;
  onUnassign: (assignmentId: number, workerName?: string) => void;
  onQuickFill: (eventId: number, roleName: string, unfilledShiftIds: number[], payRate?: number) => void;
  onPublish: (eventId: number) => void;
  onDelete?: (eventId: number) => void;
  onEdit?: (event: Event) => void;
  searchQuery: string;
}

function ActiveEventsTab({ 
  events, 
  expandedEvents, 
  onToggleEvent, 
  onAssignWorker,
  onUnassign,
  onQuickFill,
  onPublish,
  onDelete,
  onEdit,
  searchQuery 
}: ActiveEventsTabProps) {
  const formatDate = (dateString: string) => {
    // Parse UTC ISO string and format in local timezone
    const date = parseISO(dateString);
    return format(date, 'EEE, MMM d, yyyy');
  };
  
  const formatTime = (dateString: string) => {
    // Parse UTC ISO string and format in local timezone
    const date = parseISO(dateString);
    return format(date, 'h:mm a');
  };
  
  const isUrgent = (event: any) => {
    if (!event.schedule) return false;
    const eventDate = parseISO(event.schedule.start_time_utc);
    const hoursUntil = (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil <= 48;
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_staffed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <Check size={14} />
            Ready
          </span>
        );
      case 'partially_staffed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
            <AlertCircle size={14} />
            Partial
          </span>
        );
      case 'needs_workers':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <X size={14} />
            Needs Workers
          </span>
        );
      default:
        return null;
    }
  };
  
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {searchQuery ? 'No active events found' : 'No active events'}
        </h3>
        <p className="text-gray-600">
          {searchQuery 
            ? 'Try adjusting your search query or filters'
            : 'Publish draft events to see them here'
          }
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {events.map((event) => {
        const isExpanded = expandedEvents.has(event.id);
        
        return (
          <div 
            key={event.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Event Header */}
            <div
              onClick={() => onToggleEvent(event.id)}
              className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex-1 text-left">
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {event.title}
                      {event.schedule && (
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          • {formatTime(event.schedule.start_time_utc)}–{formatTime(event.schedule.end_time_utc)}
                        </span>
                      )}
                    </h3>
                  </div>
                  {getStatusBadge(event.staffing_status)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  {event.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-gray-400" />
                      {event.venue?.name || 'No venue'}
                    </div>
                  )}
                  {event.schedule && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      <span>{formatDate(event.schedule.start_time_utc)}</span>
                      {isUrgent(event) && (
                        <span 
                          className="bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full ml-2"
                          aria-label="Urgent: starts within 48 hours"
                        >
                          Urgent
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">
                      {event.assigned_workers_count}/{event.total_workers_needed} hired
                    </span>
                    <span className="font-semibold text-gray-900">
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
                
                {event.unfilled_roles_count > 0 && (
                  <p className="text-sm text-red-600 font-medium">
                    {event.unfilled_roles_count} still needed
                  </p>
                )}
                
                {/* Estimated Cost Summary */}
                {event.shifts_by_role && event.shifts_by_role.length > 0 && (
                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-medium text-gray-700">Est. Cost: </span>
                    <span className="font-semibold text-green-600">
                      ${(() => {
                        let totalCost = 0;
                        event.shifts_by_role.forEach(roleGroup => {
                          roleGroup.shifts.forEach(shift => {
                            shift.assignments.forEach(assignment => {
                              // ✅ SSOT: Use backend-calculated effective_pay (Single Source of Truth)
                              const pay = (assignment as any).effective_pay || 0;
                              totalCost += pay;
                            });
                          });
                        });
                        return safeToFixed(totalCost, 0, '0');
                      })()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="ml-4 flex items-center gap-2">
                {/* Action buttons for events with no shifts */}
                {/* Redundant delete button removed (trash icon already available elsewhere) */}
                
                {/* Edit button - only for published events that haven't started */}
                {onEdit && event.status === 'published' && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation();
                      onEdit(event);
                    }}
                    title="Edit Event"
                    className="p-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                
                {/* Compact delete button for all events */}
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                    title="Delete"
                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                
                <div className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  {isExpanded ? (
                    <ChevronUp size={24} className="text-gray-600 hover:text-gray-800" />
                  ) : (
                    <ChevronDown size={24} className="text-gray-600 hover:text-gray-800" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Expanded Content - Shifts by Role */}
            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                {event.shifts_by_role && event.shifts_by_role.length > 0 ? (
                  <div className="space-y-4">
                    {event.shifts_by_role.map((roleGroup) => (
                      <div key={roleGroup.role_name} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-gray-900">{roleGroup.role_name}</h4>
                          <span className="text-sm text-gray-600">
                            {roleGroup.filled_shifts}/{roleGroup.total_shifts} hired
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {roleGroup.filled_shifts < roleGroup.total_shifts && (
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              {roleGroup.total_shifts - roleGroup.filled_shifts} needed
                            </span>
                          )}
                          {roleGroup.filled_shifts < roleGroup.total_shifts && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const unfilled = roleGroup.shifts
                                  .filter((s) => s.staffing_progress.percentage < 100)
                                  .sort((a, b) => new Date(a.start_time_utc).getTime() - new Date(b.start_time_utc).getTime())
                                  .map((s) => s.id);
                                const payRate = roleGroup.shifts[0]?.pay_rate;
                                onQuickFill(event.id, roleGroup.role_name, unfilled, payRate);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-teal-600 text-white rounded hover:bg-teal-700"
                              title="Quick Fill by Skill"
                            >
                              Quick Fill by Skill
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {roleGroup.shifts.map((shift, index) => (
                          <div
                            key={shift.id}
                            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded border border-gray-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-gray-200 text-gray-700 rounded-md flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </div>
                              <span className="text-sm text-gray-700">
                                {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                              </span>
                              
                              {shift.assignments.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {shift.assignments.map((assignment) => {
                                    const fullName = `${assignment.worker.first_name} ${assignment.worker.last_name}`;
                                    const rate = Number(assignment.hourly_rate || shift.pay_rate || 0);
                                    return (
                                      <div key={assignment.id} className="flex items-center gap-1">
                                        <span 
                                          className="bg-white text-black border border-gray-200 rounded-full px-2.5 py-1 text-sm font-medium shadow-sm max-w-[140px] truncate"
                                          title={`${fullName} • $${safeToFixed(rate, 0, '0')}/hr`}
                                        >
                                          {fullName}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onUnassign(assignment.id, fullName);
                                          }}
                                          className="w-5 h-5 flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                          title="Unassign worker"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
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
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-4">
                      {event.status === 'draft' ? (
                        <>
                          <p className="font-medium">This event is still in draft status</p>
                          <p className="text-sm">Publish the event to generate shifts and assign workers</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium">No shifts available</p>
                          <p className="text-sm">This event may not have any shifts generated yet</p>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-center gap-3">
                      {event.status === 'draft' && (
                        <button
                          onClick={() => onPublish(event.id)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                          Publish Event
                        </button>
                      )}
                      
                      {/* Delete button removed (trash icon already exists elsewhere) */}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Past Events Tab Component (replaces Staffing > Past)
interface PastEventsTabProps {
  events: Event[];
  expandedEvents: Set<number>;
  onToggleEvent: (id: number) => void;
  searchQuery: string;
  onApproveHours?: (event: Event) => void;
}

function PastEventsTab({ events, expandedEvents, onToggleEvent, searchQuery, onApproveHours }: PastEventsTabProps) {
  const formatDate = (dateString: string) => {
    // Parse UTC ISO string and format in local timezone
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  };
  
  const formatTime = (dateString: string) => {
    // Parse UTC ISO string and format in local timezone
    const date = parseISO(dateString);
    return format(date, 'h:mm a');
  };
  
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {searchQuery ? 'No past events found' : 'No past events yet'}
        </h3>
        <p className="text-gray-600">
          {searchQuery 
            ? 'Try adjusting your search query'
            : 'Completed events will appear here'
          }
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {events.map((event) => {
        const isExpanded = expandedEvents.has(event.id);
        
        // Calculate totals
        let totalHours = 0;
        let totalPay = 0;
        
        event.shifts_by_role?.forEach(roleGroup => {
          roleGroup.shifts.forEach(shift => {
            shift.assignments.forEach(assignment => {
              // ✅ SSOT: Use backend-calculated effective_hours (Single Source of Truth)
              const hours = (assignment as any).effective_hours || 0;
              totalHours += hours;
              // ✅ SSOT: Use backend-calculated effective_pay (Single Source of Truth)
              const pay = (assignment as any).effective_pay || 0;
              totalPay += pay;
            });
          });
        });
        
        // Ensure totalHours is always a valid number
        totalHours = Number(totalHours) || 0;
        
        return (
          <div 
            key={event.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Event Header */}
            <div
              onClick={() => onToggleEvent(event.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex-1 text-left">
                <div className="flex items-start gap-3 mb-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {event.title}
                  </h3>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    Completed
                  </span>
                  {/* Approval Status Badge */}
                  {event.approval_status && event.approval_status.total > 0 && (
                    event.approval_status.approved === event.approval_status.total ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                        <Check size={12} />
                        All Hours Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        <AlertCircle size={12} />
                        {event.approval_status.pending} Pending Approval
                      </span>
                    )
                  )}
                </div>
                {/* Approve button moved to right side for cleaner alignment */}
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {event.schedule && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(event.schedule.start_time_utc)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        {formatTime(event.schedule.start_time_utc)} - {formatTime(event.schedule.end_time_utc)}
                      </div>
                    </>
                  )}
                  {event.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-gray-400" />
                      {event.venue?.name || 'No venue'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="ml-4 flex items-center gap-2">
                {onApproveHours && (
                  event.approval_status && event.approval_status.approved === event.approval_status.total ? (
                    <span className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded-md flex items-center gap-1 font-medium">
                      <Check size={14} />
                      Approved
                    </span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onApproveHours(event); }}
                      className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1 ${
                        event.approval_status && event.approval_status.pending > 0
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      title="Approve Hours"
                    >
                      {event.approval_status && event.approval_status.pending > 0
                        ? `Approve Hours (${event.approval_status.pending})`
                        : 'Approve Hours'}
                    </button>
                  )
                )}
                <div className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  {isExpanded ? (
                    <ChevronUp size={24} className="text-gray-600 hover:text-gray-800" />
                  ) : (
                    <ChevronDown size={24} className="text-gray-600 hover:text-gray-800" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Expanded Content - Workers & Hours */}
            {isExpanded && event.shifts_by_role && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                {/* Summary */}
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Workers</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {event.assigned_workers_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Hours</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {safeToFixed(totalHours, 2, '0.00')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Event Cost</p>
                      <p className="text-2xl font-semibold text-green-600">
                        ${(() => {
                          let totalCost = 0;
                          event.shifts_by_role.forEach(roleGroup => {
                            roleGroup.shifts.forEach(shift => {
                              shift.assignments.forEach(assignment => {
                                // ✅ SSOT: Use backend-calculated effective_pay (Single Source of Truth)
                                const pay = (assignment as any).effective_pay || 0;
                                totalCost += pay;
                              });
                            });
                          });
                          return safeToFixed(totalCost, 0, '0');
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Staffing</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {event.staffing_percentage}%
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Workers by Role */}
                <div className="space-y-3">
                  {event.shifts_by_role.map((roleGroup) => (
                    <div key={roleGroup.role_name} className="bg-white rounded-lg border border-gray-200 p-4">
                      <h4 className="font-medium text-gray-900 mb-3">{roleGroup.role_name}</h4>
                      
                      <div className="space-y-2">
                        {roleGroup.shifts.flatMap(shift => 
                          shift.assignments.map(assignment => (
                            <div 
                              key={assignment.id}
                              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-medium">
                                {(assignment.worker?.first_name?.[0]) || ''}{(assignment.worker?.last_name?.[0]) || ''}
                              </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-900">
                                    {assignment.worker?.first_name || 'Unknown'} {assignment.worker?.last_name || 'Worker'}
                                  </span>
                                  {/* Approval Status */}
                                  {assignment.approved ? (
                                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                      <Check size={10} />
                                      Approved{assignment.approved_by_name ? ` by ${assignment.approved_by_name.split('@')[0]}` : ''}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-amber-600 font-medium">Pending Approval</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {/* Scheduled vs Actual Hours */}
                                {assignment.scheduled_hours !== undefined && (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-gray-500">Scheduled: {safeToFixed(assignment.scheduled_hours, 2, '0.00')}h</span>
                                    <span className="font-medium">
                                      {safeToFixed(assignment.effective_hours || assignment.hours_worked || 0, 2, '0.00')} hrs
                                    </span>
                                  </div>
                                )}
                                {!assignment.scheduled_hours && assignment.hours_worked && (
                                  <span className="font-medium">
                                    {safeToFixed(assignment.hours_worked, 2, '0.00')} hrs
                                  </span>
                                )}
                                <span className="font-medium text-green-600">
                                  ${safeToFixed(Number(assignment.hourly_rate ?? shift.pay_rate ?? 0), 0, '0')}/hr
                                </span>
                                <span className="font-semibold text-blue-600">
                                  ${safeToFixed(assignment.effective_pay || (Number(assignment.hours_worked || 0) * Number(assignment.hourly_rate ?? shift.pay_rate ?? 0)), 0, '0')}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

