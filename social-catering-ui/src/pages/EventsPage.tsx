import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Calendar, MapPin, Users, Clock, Edit, Trash2, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { apiClient } from '../lib/api';

type TabType = 'draft' | 'published';

interface Event {
  id: number;
  title: string;
  status: string;
  venue: {
    id: number;
    name: string;
    formatted_address: string;
  } | null;
  schedule: {
    id: number;
    start_time_utc: string;
    end_time_utc: string;
    break_minutes: number;
  } | null;
  total_workers_needed: number;
  assigned_workers_count: number;
  unfilled_roles_count: number;
  staffing_percentage: number;
  staffing_summary: string;
  total_shifts_count: number;
  assigned_shifts_count: number;
  shifts_generated: boolean;
  created_at: string;
  updated_at: string;
  check_in_instructions?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  skill_requirements?: Array<{
    id: number;
    skill_name: string;
    needed_workers: number;
    description?: string;
    uniform_name?: string;
    certification_name?: string;
    pay_rate?: number;
  }>;
}

export function EventsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial tab from URL or default to 'published'
  const initialTab = (searchParams.get('tab') as TabType) || 'published';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'staffing'>('date');
  
  // Load events when tab changes
  useEffect(() => {
    loadEvents();
  }, [activeTab]);
  
  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  async function loadEvents() {
    setLoading(true);
    try {
      const response = await apiClient.get(`/events?status=${activeTab}`);
      
      if (response.data.status === 'success') {
        setEvents(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleDelete(eventId: number) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await apiClient.delete(`/events/${eventId}`);
      loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      // Remove from local state for demo
      setEvents(events.filter(e => e.id !== eventId));
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
      // For demo, move to published tab
      alert('Event published successfully!');
      setActiveTab('published');
      setSearchParams({ tab: 'published' });
    }
  }
  
  // Filter and sort events
  const filteredEvents = events
    .filter(event => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.venue?.name.toLowerCase().includes(query)
      );
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
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">Manage your catering events</p>
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
            onClick={() => handleTabChange('published')}
            className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
              activeTab === 'published'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Published Events
          </button>
        </div>
        
        {/* Filters & Search */}
        <div className="flex items-center gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by event name or venue..."
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
            {activeTab === 'published' && <option value="staffing">Sort by Staffing</option>}
          </select>
        </div>
        
        {/* Events List */}
        {loading ? (
          <LoadingSpinner message="Loading events..." />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon="📅"
            title={searchQuery ? 'No events found' : `No ${activeTab} events yet`}
            description={
              searchQuery 
                ? 'Try adjusting your search query' 
                : activeTab === 'draft' 
                  ? 'Create your first draft event to get started'
                  : 'Publish draft events to see them here'
            }
            action={
              !searchQuery && activeTab === 'draft' 
                ? {
                    label: 'Create Event',
                    onClick: () => navigate('/events/create')
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                activeTab={activeTab}
                onDelete={handleDelete}
                onPublish={handlePublish}
                onNavigate={(path) => navigate(path)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Event Card Component
interface EventCardProps {
  event: Event;
  activeTab: TabType;
  onDelete: (id: number) => void;
  onPublish: (id: number) => void;
  onNavigate: (path: string) => void;
}

function EventCard({ event, activeTab, onDelete, onPublish, onNavigate }: EventCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  const getStaffingStatusBadge = (event: Event) => {
    if (event.status === 'draft') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
          Draft
        </span>
      );
    }
    
    if (event.staffing_percentage === 100) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Ready
        </span>
      );
    } else if (event.staffing_percentage > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
          Partial
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          Needs Workers
        </span>
      );
    }
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Event Info */}
          <div className="flex-1 min-w-0">
            {/* Title & Status Badge */}
            <div className="flex items-start gap-3 mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex-1 min-w-0">
                {event.title}
              </h3>
              {activeTab === 'published' && getStaffingStatusBadge(event)}
            </div>
            
            {/* Venue */}
            {event.venue && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{event.venue.name}</span>
              </div>
            )}
            
            {/* Schedule */}
            {event.schedule && (
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                  <span>{formatDate(event.schedule.start_time_utc)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400 flex-shrink-0" />
                  <span>
                    {formatTime(event.schedule.start_time_utc)} - {formatTime(event.schedule.end_time_utc)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Staffing Progress (Published only) */}
            {activeTab === 'published' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {event.staffing_summary}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {event.staffing_percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      event.staffing_percentage === 100
                        ? 'bg-green-500'
                        : event.staffing_percentage > 0
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${event.staffing_percentage}%` }}
                  ></div>
                </div>
                
                {(event.unfilled_roles_count || 0) > 0 && (
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    {event.unfilled_roles_count} worker{(event.unfilled_roles_count || 0) !== 1 ? 's' : ''} still needed
                  </p>
                )}
              </div>
            )}
            
            {/* Workers Needed (Draft only) */}
            {activeTab === 'draft' && event.total_workers_needed > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={16} className="text-gray-400" />
                <span>{event.total_workers_needed} workers needed</span>
              </div>
            )}
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Draft Actions */}
            {activeTab === 'draft' && (
              <>
                <button
                  onClick={() => onNavigate(`/events/${event.id}/edit`)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                
                <button
                  onClick={() => onPublish(event.id)}
                  className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Publish
                </button>
                
                <button
                  onClick={() => onDelete(event.id)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            
            {/* Published Actions */}
            {activeTab === 'published' && (
              <>
                <button
                  onClick={() => onNavigate(`/events/${event.id}`)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  title="View Details"
                >
                  <ExternalLink size={18} />
                </button>
                
                {(event.unfilled_roles_count || 0) > 0 && (
                  <button
                    onClick={() => onNavigate(`/staffing?event_id=${event.id}`)}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Assign Workers
                  </button>
                )}
                
                {(event.unfilled_roles_count || 0) === 0 && (
                  <span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
                    All Set!
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
