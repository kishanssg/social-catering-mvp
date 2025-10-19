import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  AlertCircle,
  Users,
  FileText,
  Clock,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  parseISO
} from 'date-fns';
import { apiClient } from '../lib/api';

interface DashboardStats {
  draft_jobs: number;
  published_jobs: number;
  completed_jobs: number;
  gaps_to_fill: number;
}

interface DayData {
  date: Date;
  status: 'empty' | 'fully_staffed' | 'partially_staffed' | 'needs_workers';
  events: Array<{
    id: number;
    title: string;
    unfilled_roles_count: number;
  }>;
  shifts_count: number;
  needs_workers_count: number;
}

interface UrgentEvent {
  id: number;
  title: string;
  venue: {
    name: string;
    formatted_address: string;
  };
  schedule: {
    start_time_utc: string;
    end_time_utc: string;
  };
  unfilled_roles_count: number;
  staffing_percentage: number;
  staffing_status: string;
  days_until: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats>({
    draft_jobs: 0,
    published_jobs: 0,
    completed_jobs: 0,
    gaps_to_fill: 0
  });
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [urgentEvents, setUrgentEvents] = useState<UrgentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
  }, [currentMonth]);
  
  async function loadDashboardData() {
    setLoading(true);
    try {
      // Load all events to calculate stats
      const eventsResponse = await apiClient.get('/events');
      
      if (eventsResponse.data.status === 'success') {
        const events = eventsResponse.data.data;
        
        // Calculate stats
        const draftCount = events.filter((e: any) => e.status === 'draft').length;
        const publishedCount = events.filter((e: any) => e.status === 'published').length;
        const completedCount = events.filter((e: any) => e.status === 'completed').length;
        const gapsCount = events
          .filter((e: any) => e.status === 'published')
          .reduce((sum: number, e: any) => sum + (e.unfilled_roles_count || 0), 0);
        
        setStats({
          draft_jobs: draftCount,
          published_jobs: publishedCount,
          completed_jobs: completedCount,
          gaps_to_fill: gapsCount
        });
        
        // Prepare calendar data
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        
        const publishedEvents = events.filter((e: any) => e.status === 'published');
        const daysMap: Record<string, DayData> = {};
        
        publishedEvents.forEach((event: any) => {
          if (!event.schedule) return;
          
          const eventDate = parseISO(event.schedule.start_time_utc);
          
          if (eventDate >= monthStart && eventDate <= monthEnd) {
            const dateKey = format(eventDate, 'yyyy-MM-dd');
            
            if (!daysMap[dateKey]) {
              daysMap[dateKey] = {
                date: eventDate,
                status: 'fully_staffed',
                events: [],
                shifts_count: 0,
                needs_workers_count: 0
              };
            }
            
            daysMap[dateKey].events.push({
              id: event.id,
              title: event.title,
              unfilled_roles_count: event.unfilled_roles_count || 0
            });
            
            daysMap[dateKey].shifts_count += event.total_shifts_count || 0;
            daysMap[dateKey].needs_workers_count += event.unfilled_roles_count || 0;
            
            // Determine worst status for the day
            if (event.staffing_status === 'needs_workers') {
              daysMap[dateKey].status = 'needs_workers';
            } else if (
              event.staffing_status === 'partially_staffed' && 
              daysMap[dateKey].status !== 'needs_workers'
            ) {
              daysMap[dateKey].status = 'partially_staffed';
            }
          }
        });
        
        setCalendarData(Object.values(daysMap));
        
        // Get urgent events (upcoming with gaps)
        const urgent = publishedEvents
          .filter((e: any) => {
            if (!e.schedule || (e.unfilled_roles_count || 0) === 0) return false;
            const eventDate = parseISO(e.schedule.start_time_utc);
            return eventDate >= new Date();
          })
          .map((e: any) => {
            const eventDate = parseISO(e.schedule.start_time_utc);
            const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            return {
              ...e,
              days_until: daysUntil
            };
          })
          .sort((a: any, b: any) => {
            // Sort by urgency: days until event, then by percentage filled
            if (a.days_until !== b.days_until) {
              return a.days_until - b.days_until;
            }
            return a.staffing_percentage - b.staffing_percentage;
          })
          .slice(0, 5); // Top 5 most urgent
        
        setUrgentEvents(urgent);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  const handlePreviousMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  const handleToday = () => {
    setCurrentMonth(new Date());
  };
  
  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    navigate(`/staffing?date=${dateStr}&filter=needs_workers`);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of events and staffing needs</p>
          </div>
          
          <button
            onClick={() => navigate('/events/create')}
            className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            Create New Event
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Draft Events"
            value={stats.draft_jobs}
            onClick={() => navigate('/events?tab=draft')}
            color="gray"
          />
          
          <StatCard
            label="Published Events"
            value={stats.published_jobs}
            onClick={() => navigate('/events?tab=published')}
            color="blue"
          />
          
          <StatCard
            label="Completed Events"
            value={stats.completed_jobs}
            onClick={() => navigate('/staffing?tab=past')}
            color="green"
          />
          
            <StatCard
              label="Unfilled Roles"
              value={stats.gaps_to_fill}
              onClick={() => navigate('/staffing?filter=needs_workers')}
              color="red"
              isHero
            />
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <MonthCalendar
            currentMonth={currentMonth}
            calendarData={calendarData}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
            onDayClick={handleDayClick}
          />
            </div>
        
        {/* Urgent Events List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <UrgentEventsList
            events={urgentEvents}
            onEventClick={(eventId) => navigate(`/staffing?event_id=${eventId}`)}
          />
            </div>
            </div>
          </div>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number;
  onClick: () => void;
  color: 'gray' | 'blue' | 'green' | 'red';
  isHero?: boolean;
}

function StatCard({ label, value, onClick, color, isHero }: StatCardProps) {
  const colorClasses = {
    gray: 'bg-white hover:border-gray-300',
    blue: 'bg-white hover:border-blue-300',
    green: 'bg-white hover:border-green-300',
    red: isHero ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-white hover:border-red-300'
  };
  
  const textColorClasses = {
    gray: 'text-gray-900',
    blue: 'text-blue-900',
    green: 'text-green-900',
    red: 'text-red-900'
  };
  
  const labelColorClasses = {
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: isHero ? 'text-red-700' : 'text-red-600'
  };
  
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-lg border p-6 transition-all duration-200 text-left ${colorClasses[color]} hover:shadow-lg`}
    >
      {/* Pulse animation for hero card with high values */}
      {isHero && value > 5 && (
        <div className="absolute top-0 right-0 w-3 h-3 m-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
      )}
      
      <div className="flex flex-col">
        <span className={`text-sm font-medium mb-1 ${labelColorClasses[color]}`}>
          {label}
        </span>
        <span className={`text-4xl font-bold ${textColorClasses[color]}`}>
          {value}
        </span>
        </div>

      {isHero && value > 0 && (
        <div className="mt-3 flex items-center gap-1 text-sm font-medium text-red-600">
          <AlertCircle size={16} />
          <span>Requires attention</span>
          </div>
      )}
      
      {!isHero && (
        <div className="mt-3 flex items-center gap-1 text-sm font-medium text-gray-500">
          <span>View all</span>
          <ArrowRight size={16} />
        </div>
      )}
    </button>
  );
}

// Month Calendar Component
interface MonthCalendarProps {
  currentMonth: Date;
  calendarData: DayData[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onDayClick: (date: Date) => void;
}

function MonthCalendar({
  currentMonth,
  calendarData,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onDayClick
}: MonthCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const getDayData = (date: Date): DayData | undefined => {
    return calendarData.find(d => isSameDay(d.date, date));
  };
  
  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'fully_staffed':
        return '✓';
      case 'partially_staffed':
        return '🟡';
      case 'needs_workers':
        return '🔴';
      default:
        return null;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_staffed':
        return 'bg-green-50 border-green-200';
      case 'partially_staffed':
        return 'bg-yellow-50 border-yellow-200';
      case 'needs_workers':
        return 'bg-red-50 border-red-200';
      default:
        return '';
    }
  };
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
        <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviousMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            title="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button
            onClick={onToday}
            className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition"
          >
            Today
          </button>
          
          <button
            onClick={onNextMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            title="Next month"
          >
            <ChevronRight size={20} />
          </button>
              </div>
            </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {allDays.map((day, index) => {
          const dayData = getDayData(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const hasEvents = dayData && dayData.events.length > 0;
          
          return (
            <button
              key={index}
              onClick={() => hasEvents && onDayClick(day)}
              disabled={!hasEvents}
              className={`
                relative min-h-[80px] p-2 rounded-lg border transition-all text-left
                ${isTodayDate 
                  ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' 
                  : hasEvents 
                    ? `${getStatusColor(dayData.status)} hover:shadow-md cursor-pointer` 
                    : 'border-gray-100 bg-white'
                }
                ${!isCurrentMonth ? 'opacity-40' : ''}
              `}
            >
              {/* Date number */}
              <div className={`text-sm font-medium mb-1 ${
                isTodayDate 
                  ? 'text-teal-600' 
                  : isCurrentMonth 
                    ? 'text-gray-900' 
                    : 'text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>
              
              {/* Event indicators */}
              {dayData && (
                <div className="space-y-1">
                  {/* Status emoji */}
                  <div className="text-2xl text-center">
                    {getStatusEmoji(dayData.status)}
                  </div>
                  
                  {/* Event count */}
                  {dayData.events.length > 0 && (
                    <div className="text-xs text-center text-gray-600">
                      {dayData.events.length} event{dayData.events.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  
                  {/* Unfilled roles indicator */}
                  {dayData.needs_workers_count > 0 && (
                    <div className="text-xs text-center font-medium text-red-600">
                      -{dayData.needs_workers_count} role{dayData.needs_workers_count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xl">✓</span>
          <span className="text-gray-600">Ready</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xl">🟡</span>
          <span className="text-gray-600">Partial</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xl">🔴</span>
          <span className="text-gray-600">Needs Workers</span>
        </div>
      </div>
    </div>
  );
}

// Urgent Events List Component
interface UrgentEventsListProps {
  events: UrgentEvent[];
  onEventClick: (eventId: number) => void;
}

function UrgentEventsList({ events, onEventClick }: UrgentEventsListProps) {
  const getUrgencyBadge = (daysUntil: number, percentage: number) => {
    if (daysUntil <= 3 || percentage === 0) {
      return (
        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
          🔴 URGENT
        </span>
      );
    } else if (daysUntil <= 7 || percentage < 50) {
      return (
        <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
          ⚠️ HIGH
        </span>
      );
    } else {
    return (
        <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
          ⚠️ MEDIUM
        </span>
      );
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'EEE, MMM d');
  };
  
  const formatTime = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'h:mm a');
  };
  
  const getDaysUntilText = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `in ${days} days`;
  };
  
  if (events.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
        <p className="text-gray-600">No urgent staffing needs at the moment. Great work!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">⚠️ Needs Your Attention</h3>
        <p className="text-sm text-gray-500 mt-1">
          {events.length} event{events.length !== 1 ? 's' : ''} need{events.length === 1 ? 's' : ''} workers • Sorted by urgency
        </p>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-200">
        {events.map((event) => (
          <div
            key={event.id}
            className="px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: Event Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {getUrgencyBadge(event.days_until, event.staffing_percentage)}
                  <span className="text-sm font-medium text-gray-600">
                    {formatDate(event.schedule.start_time_utc)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({getDaysUntilText(event.days_until)})
                  </span>
                </div>
                
                <h4 className="text-base font-semibold text-gray-900 mb-1">
                  {event.title}
                </h4>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="truncate">{event.venue.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-400" />
                    <span>
                      {formatTime(event.schedule.start_time_utc)} - {formatTime(event.schedule.end_time_utc)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-red-600">
                    {event.unfilled_roles_count} role{event.unfilled_roles_count !== 1 ? 's' : ''} still needed
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">
                    {event.staffing_percentage}% staffed
                  </span>
                </div>
      </div>

              {/* Right: Action Button */}
              <button
                onClick={() => onEventClick(event.id)}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap flex items-center gap-2"
              >
                Assign Workers
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}