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
  ChevronRight,
  Edit,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  Award
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getAssignmentStatusMessage } from '../utils/dateUtils';
import { safeToFixed, safeNumber } from '../utils/number';
import { cn } from '../lib/utils';
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
  // Aggregates (SSOT - always included from API, never lazy)
  total_hours?: number;  // From lightweight serializer
  total_hours_worked?: number;  // From detailed serializer
  total_cost?: number;  // From lightweight serializer
  total_pay_amount?: number;  // From detailed serializer
  estimated_cost?: number;  // Alias for total_pay_amount/total_cost
  hired_count?: number;  // Alias for assigned_workers_count
  required_count?: number;  // Alias for total_workers_needed
  // Approval status (fetched separately for completed events)
  approval_status?: {
    total: number;
    approved: number;
    pending: number;
  };
  // Cost summary (fetched from approvals endpoint)
  cost_summary?: {
    approved_cost: number;
    pending_cost: number;
    total_estimated_cost: number;
    approved_count: number;
    pending_count: number;
    total_count: number;
    all_approved: boolean;
  };
  // Full event details (loaded when expanded)
  full_details?: any;
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
  // Only default to needs_workers for active tab, otherwise 'all'
  const initialFilter = initialTab === 'active' 
    ? ((searchParams.get('filter') as FilterType) || 'needs_workers')
    : ((searchParams.get('filter') as FilterType) || 'all');
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [filterStatus, setFilterStatus] = useState<FilterType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce search by 500ms
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'staffing'>('date');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [loadingEventDetails, setLoadingEventDetails] = useState<Set<number>>(new Set());
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

    if (!loadingEventDetails.has(eventId)) {
      fetchEventDetails(eventId);
    }
  }, [searchParams, events, loadingEventDetails]);
  
  async function loadEvents() {
    setLoading(true);
    try {
      const tabForApi = activeTab === 'completed' ? 'completed' : activeTab;
      const dateParam = searchParams.get('date');
      
      let url = `/events?tab=${tabForApi}`;
      // CRITICAL FIX: Don't send filter=needs_workers for completed/past events
      // This filter only makes sense for active events
      if (filterStatus !== 'all' && (activeTab === 'active' || activeTab === 'draft')) {
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
        
        // For completed events, fetch approval status and cost summary
        if (activeTab === 'completed') {
          const eventsWithApprovals = await Promise.all(
            loadedEvents.map(async (event: Event) => {
              try {
                const apprResponse = await apiClient.get(`/events/${event.id}/approvals`);
                if (apprResponse.data?.status === 'success') {
                  const assignments = apprResponse.data.data.assignments || [];
                  const total = assignments.length;
                  const approved = assignments.filter((a: any) => a.approved).length;
                  // ✅ Phase 2: Fetch cost_summary from approvals endpoint
                  const costSummary = apprResponse.data.data.cost_summary || null;
                  return {
                    ...event,
                    approval_status: {
                      total,
                      approved,
                      pending: total - approved
                    },
                    cost_summary: costSummary
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
          // ✅ CRITICAL FIX: Preserve detailed data temporarily, then refresh for expanded events
          // This prevents assignments from disappearing after assignment/unassignment operations
          const expandedIds = Array.from(expandedEvents);
          
          setEvents(prevEvents => {
            const eventMap = new Map(prevEvents.map(e => [e.id, e]));
            return loadedEvents.map((newEvent: Event) => {
              const existingEvent = eventMap.get(newEvent.id);
              // If this event is expanded and has detailed data, preserve it temporarily
              // We'll refresh it immediately after, but this prevents a flash of "no assignments"
              if (expandedIds.includes(newEvent.id) && existingEvent?.shifts_by_role && existingEvent.shifts_by_role.length > 0) {
                return {
                  ...newEvent,
                  shifts_by_role: existingEvent.shifts_by_role,
                  full_details: existingEvent.full_details || existingEvent
                };
              }
              return newEvent;
            });
          });
          
          // Immediately re-fetch full details for expanded events to get fresh data
          if (expandedIds.length > 0) {
            // Re-fetch details for all expanded events in parallel (non-blocking)
            Promise.all(
              expandedIds.map(eventId => fetchEventDetails(eventId))
            ).catch(err => {
              console.error('Failed to refresh expanded event details:', err);
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      // Don't clear events on error - keep previous data to prevent "no events" flash
      // Only clear if we have no events at all (first load)
      if (events.length === 0) {
        setEvents([]);
      }
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
    setLoadingEventDetails(prev => new Set(prev).add(eventId));
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
    } finally {
      setLoadingEventDetails(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };
  
  const toggleEvent = (eventId: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
      // Remove from loading state when collapsing
      setLoadingEventDetails(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    } else {
      newExpanded.add(eventId);
      const ev = events.find(e => e.id === eventId);
      // Always fetch details when expanding to ensure fresh data
      // Only skip if we're already loading or if we have complete data
      if (!loadingEventDetails.has(eventId)) {
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
        // Refetch all events to get updated aggregates (backend recalculates on unassign)
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
  
  // Helper to update a single event's aggregates after mutation
  const updateEventAggregates = async (eventId: number) => {
    try {
      const response = await apiClient.get(`/events/${eventId}`);
      if (response.data?.status === 'success') {
        const updatedEvent = response.data.data;
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...updatedEvent } : e));
      }
    } catch (error) {
      console.error('Failed to update event aggregates:', error);
      // Fallback to full reload if single event update fails
      loadEvents();
    }
  };

  const handleAssignmentSuccess = () => {
    closeAssignmentModal();
    setToast({
      isVisible: true,
      message: 'Worker assigned',
      type: 'success'
    });
    // Refetch all events to get updated aggregates (backend recalculates on assignment)
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
                loadingEventDetails={loadingEventDetails}
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
  loadingEventDetails: Set<number>;
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
  loadingEventDetails,
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
      {events.filter((e:any) => e.status !== 'completed').map((event) => {
        const isExpanded = expandedEvents.has(event.id);
        
        return (
          <div 
            key={event.id}
            className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                      {event.title}
                    </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                  {event.schedule && (
                    <>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        {formatDate(event.schedule.start_time_utc)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        {formatTime(event.schedule.start_time_utc)} - {formatTime(event.schedule.end_time_utc)}
                      {isUrgent(event) && (
                        <span 
                          className="bg-red-50 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full ml-2 inline-flex items-center gap-1.5"
                          aria-label="Urgent: starts within 48 hours"
                        >
                          <div className="w-2 h-2 bg-red-600 rounded-full" />
                          URGENT
                        </span>
                      )}
                    </span>
                    </>
                  )}
                  {event.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {event.venue.name}
                    </span>
                )}
                </div>
              </div>
              
              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {getStatusBadge(event.staffing_status)}
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
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                    title="Delete"
                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={() => onToggleEvent(event.id)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-gray-600" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-600" />
                  )}
                </button>
                </div>
              </div>

            {/* Staffing Progress Section */}
            <div className="py-3 border-y border-gray-100 space-y-2">
              {/* Progress Bar */}
              {(() => {
                const assigned = event.assigned_workers_count || 0;
                const total = event.total_workers_needed || 0;
                const percentage = total > 0 ? Math.round((assigned / total) * 100) : 0;
                const unfilledCount = event.unfilled_roles_count || 0;
                
                // Use aggregates from API (SSOT - no lazy calculation)
                const estimatedCost = (() => {
                  // Prefer lightweight serializer fields, fallback to detailed serializer
                  const cost = event.estimated_cost ?? event.total_cost ?? event.total_pay_amount ?? 0;
                  return safeToFixed(cost, 2, '0.00');
                })();

                // Progress bar color based on percentage
                const getProgressColor = () => {
                  if (percentage >= 100) return 'bg-green-500';
                  if (percentage >= 75) return 'bg-amber-500';
                  if (percentage >= 50) return 'bg-orange-500';
                  return 'bg-red-500';
                };

                // Action text color
                const getActionTextColor = () => {
                  if (percentage >= 100) return 'text-green-600';
                  if (percentage >= 75) return 'text-amber-600';
                  return 'text-red-600';
                };

                return (
                  <>
                    {/* Progress Bar Row */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        {assigned} of {total} roles filled
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-300", getProgressColor())}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {percentage}%
                      </span>
                    </div>

                    {/* Staffing progress display */}
                    <div className="text-sm font-medium text-gray-700">
                      {assigned}/{total} hired
                    </div>

                    {/* Cost Display */}
                    <div className="text-sm text-gray-600">
                      <span>Est. Cost: </span>
                      <span className="font-semibold text-gray-900">${estimatedCost}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* Expanded Content - Shifts by Role */}
            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                {loadingEventDetails.has(event.id) ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-600">Loading assignments...</p>
                    </div>
                  </div>
                ) : event.shifts_by_role && event.shifts_by_role.length > 0 ? (
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
                                <div className="flex flex-col gap-1.5">
                                  {shift.assignments.map((assignment) => {
                                    const fullName = `${assignment.worker.first_name} ${assignment.worker.last_name}`;
                                    const rate = Number(assignment.hourly_rate || shift.pay_rate || 0);
                                    const statusMessage = getAssignmentStatusMessage(assignment);
                                    const tooltipText = statusMessage 
                                      ? `${fullName} • $${safeToFixed(rate, 0, '0')}/hr • ${statusMessage}`
                                      : `${fullName} • $${safeToFixed(rate, 0, '0')}/hr`;
                                    return (
                                      <div key={assignment.id} className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                          <span 
                                            className={cn(
                                              "bg-white text-black border rounded-full px-2.5 py-1 text-sm font-medium shadow-sm max-w-[140px] truncate",
                                              assignment.status === 'no_show' || assignment.status === 'cancelled' || assignment.status === 'removed'
                                                ? "border-red-200 opacity-60"
                                                : assignment.approved
                                                ? "border-green-200"
                                                : "border-gray-200"
                                            )}
                                            title={tooltipText}
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
                                        {statusMessage && (
                                          <div className={cn(
                                            "text-xs font-medium ml-2",
                                            assignment.status === 'no_show' || assignment.status === 'cancelled' || assignment.status === 'removed'
                                              ? "text-red-600"
                                              : assignment.approved
                                              ? "text-green-700"
                                              : "text-gray-500"
                                          )}>
                                            {statusMessage}
                                          </div>
                                        )}
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
                        {/* Placeholder rows for unassigned slots (no shift record yet) */}
                        {Number((roleGroup as any).unassigned_count || 0) > 0 && (
                          Array.from({ length: Number((roleGroup as any).unassigned_count) }).map((_, idx) => (
                            <div
                              key={`unassigned-${idx}`}
                              className="flex items-center justify-between py-2 px-3 bg-white rounded border border-dashed border-gray-300"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-gray-100 text-gray-500 rounded-md flex items-center justify-center text-xs font-medium">
                                  •
                                </div>
                                <span className="text-sm text-gray-500 select-none">
                                  Open slot (no shift generated)
                                </span>
                              </div>
                              <span
                                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
                                title="Generate a shift for this role to assign a worker"
                              >
                                Assign
                              </span>
                            </div>
                          ))
                        )}
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
  searchQuery: string;
  onApproveHours?: (event: Event) => void;
}

function PastEventsTab({ events, searchQuery, onApproveHours }: PastEventsTabProps) {
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
  
  // Compute pending approvals directly from assignments if detailed data is present
  const getPendingCount = (event: any): number => {
    if (event?.shifts_by_role && Array.isArray(event.shifts_by_role)) {
      const allAssignments: any[] = event.shifts_by_role.flatMap((rg: any) =>
        (rg.shifts || []).flatMap((s: any) => s.assignments || [])
      );
      if (allAssignments.length > 0) {
        const pending = allAssignments.filter((a: any) => {
          const status = a.status;
          const resolved = a.approved || status === 'no_show' || status === 'cancelled' || status === 'removed';
          return !resolved;
        }).length;
        return pending;
      }
    }
    return event?.approval_status?.pending ?? 0;
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
        // Use aggregates from API (SSOT - no lazy calculation)
        // Prefer lightweight serializer fields, fallback to detailed serializer
        // Guard: Only show hours/cost if there are valid assignments (not just no-shows/cancellations)
        const hasValidAssignments = (event.shifts_by_role && event.shifts_by_role.some((rg: any) => (rg.shifts || []).some((s: any) => (s.assignments || []).length > 0)))
          || (event.approval_status && event.approval_status.total > 0);
        const totalHours = safeNumber(event.total_hours ?? event.total_hours_worked ?? 0);
        const totalCost = event.cost_summary?.total_estimated_cost ?? event.total_pay_amount ?? 0;
        const approvedCost = event.cost_summary?.approved_cost ?? 0;
        const pendingCost = event.cost_summary?.pending_cost ?? 0;
        const pendingCount = getPendingCount(event);
        
        // Calculate approved hours from cost ratio (simplified: assume proportional hours to cost)
        // If cost_summary exists, use ratio; otherwise show total hours as approved
        const calculatedApprovedHours = event.cost_summary && totalCost > 0 && totalHours > 0
          ? (approvedCost / totalCost) * totalHours
          : totalHours;
        
        // Calculate pending hours from cost ratio
        const calculatedPendingHours = event.cost_summary && totalCost > 0 && totalHours > 0 && pendingCost > 0
          ? (pendingCost / totalCost) * totalHours
          : 0;
        
        return (
          <div 
            key={event.id}
            onClick={() => onApproveHours && hasValidAssignments && onApproveHours(event)}
            className={cn(
              "border border-gray-200 rounded-lg p-5 transition-all cursor-pointer",
              hasValidAssignments && "hover:border-gray-300 hover:shadow-md"
            )}
          >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                    {event.title}
                  </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                  {event.schedule && (
                    <>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        {formatDate(event.schedule.start_time_utc)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        {formatTime(event.schedule.start_time_utc)} - {formatTime(event.schedule.end_time_utc)}
                      </span>
                    </>
                  )}
                  {event.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {event.venue.name}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Status Badge - Only "Completed", no pending pill */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                  Completed
                </span>
              </div>
            </div>
            
            {/* Stats Grid - Clean & Minimal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-gray-100">
              <div>
                <div className="text-xs text-gray-500 mb-1">Workers</div>
                <div className="text-lg font-semibold text-gray-900">
                  {event.assigned_workers_count || 0}
                </div>
              </div>
              
              {/* Hours - Right-aligned with tabular-nums, show approved + pending chip */}
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Hours</div>
                <div className="text-lg font-semibold text-gray-900 tabular-nums flex items-center justify-end gap-1.5">
                  {hasValidAssignments ? (
                    <>
                      <span>{safeToFixed(calculatedApprovedHours, 2, '0.00')}</span>
                      {pendingCount > 0 && calculatedPendingHours > 0 && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          +{safeToFixed(calculatedPendingHours, 2, '0.0')}h pending
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </div>
              
              {/* Cost - Right-aligned with tabular-nums, inline amber badge for pending */}
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Cost</div>
                <div className="text-lg font-semibold text-gray-900 tabular-nums flex items-center justify-end gap-1.5">
                  {hasValidAssignments ? (
                    <>
                      <span>${safeToFixed(approvedCost, 2, '0.00')}</span>
                      {pendingCost > 0 && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          +${safeToFixed(pendingCost, 2, '0.00')}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </div>
              
              {/* Staffing - Color by text only (0 gray, 1-99 amber, 100 green) */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Staffing</div>
                {(() => {
                  const totalNeeded = event.total_workers_needed || 0;
                  const assigned = event.assigned_workers_count || 0;
                  
                  // Gracefully handle unstaffed events
                  if (totalNeeded === 0 && assigned === 0) {
                    return (
                      <div className="text-lg font-semibold text-gray-400">
                        Not staffed
                      </div>
                    );
                  }
                  
                  // Show percentage for staffed events
                  const percentage = event.staffing_percentage || (totalNeeded > 0 ? Math.round((assigned / totalNeeded) * 100) : 0);
                  return (
                    <div className={cn(
                      "text-lg font-semibold",
                      percentage === 0 ? "text-gray-500" : percentage === 100 ? "text-green-600" : "text-amber-600"
                    )}>
                      {percentage}%
                    </div>
                  );
                })()}
              </div>
            </div>
                              
            {/* Action Button - Renamed to "Review & Approve (n)" */}
            <div className="mt-4 flex justify-end" onClick={(e) => e.stopPropagation()}>
              {onApproveHours && (() => {
                const totalNeeded = event.total_workers_needed || 0;
                const assigned = event.assigned_workers_count || 0;
                const hasAssignments = (event.shifts_by_role && event.shifts_by_role.some((rg: any) => (rg.shifts || []).some((s: any) => (s.assignments || []).length > 0)))
                  || (event.approval_status && event.approval_status.total > 0);
                
                // Hide button for unstaffed events with no assignments
                if (totalNeeded === 0 && assigned === 0 && !hasAssignments) {
                  return null;
                }
                
                return (
                  <button
                    onClick={() => onApproveHours(event)}
                    aria-label={pendingCount > 0 
                      ? `Review and approve ${pendingCount} pending assignment${pendingCount !== 1 ? 's' : ''}`
                      : hasAssignments 
                        ? 'View approved assignments'
                        : 'No assignments to review'
                    }
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm",
                      pendingCount > 0
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : event.approval_status && event.approval_status.approved === event.approval_status.total && hasAssignments
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : hasAssignments
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    )}
                    disabled={!hasAssignments}
                  >
                    {pendingCount > 0 ? (
                      <>
                        <Clock className="h-4 w-4" />
                        Review & Approve ({pendingCount})
                      </>
                    ) : hasAssignments ? (
                      <>
                        <Check className="h-4 w-4" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        No assignments
                      </>
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

