import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  ChevronRight,
  Check
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
  parseISO,
  startOfDay
} from 'date-fns';
import { apiClient } from '../lib/api';
import { cn } from '../lib/utils';

interface DashboardStats {
  draft_events: number;
  published_events: number;
  completed_events: number;
  total_workers: number;
  gaps_to_fill: number;
  urgent_events: number;
  month_events: number;
}

interface DayData {
  date: Date;
  status: 'empty' | 'fully_staffed' | 'partially_staffed' | 'needs_workers';
  events: Array<{
    id: number;
    title: string;
    unfilled_roles_count: number;
    hired_count: number;
    required_count: number;
  }>;
  shifts_count: number;
  needs_workers_count: number;
  total_hired_today: number;
  total_required_today: number;
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
  hours_until?: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [stats, setStats] = useState<DashboardStats>({
    draft_events: 0,
    published_events: 0,
    completed_events: 0,
    total_workers: 0,
    gaps_to_fill: 0,
    urgent_events: 0,
    month_events: 0
  });
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [urgentEvents, setUrgentEvents] = useState<UrgentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
  }, [currentMonth]);

  // Refresh data when component becomes visible (e.g., when navigating back from event creation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardData();
      }
    };

    const handleFocus = () => {
      loadDashboardData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentMonth]);

  // Refresh data when navigating back to dashboard
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      // Small delay to prevent too many API calls when navigating quickly
      const timeoutId = setTimeout(() => {
        loadDashboardData();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname]);

  
  async function loadDashboardData() {
    setLoading(true);
    try {
      // Load dashboard stats from the dedicated endpoint
      const dashboardResponse = await apiClient.get('/dashboard');
      
      if (dashboardResponse.data.status === 'success') {
        const dashboardData = dashboardResponse.data.data;
        
        setStats({
          draft_events: dashboardData.draft_events,
          published_events: dashboardData.published_events,
          completed_events: dashboardData.completed_events,
          total_workers: dashboardData.total_workers,
          gaps_to_fill: dashboardData.gaps_to_fill,
          urgent_events: dashboardData.urgent_events,
          month_events: dashboardData.month_events
        });
        
        // Load events for calendar and urgent events
        // CRITICAL: Use tab=active to get only published events (not drafts)
        // This ensures we don't hit the 50-event limit with draft events
        // Also increase limit to 200 to capture all active events
        const eventsResponse = await apiClient.get('/events', {
          params: {
            tab: 'active',
            limit: 200  // Increased from default 50 to ensure we get all active events
          }
        });
        
        if (eventsResponse.data.status === 'success') {
          const events = eventsResponse.data.data;
          
          // Prepare calendar data
          const monthStart = startOfMonth(currentMonth);
          const monthEnd = endOfMonth(currentMonth);
          
          // All events from active tab are already published, but filter for safety
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
                  needs_workers_count: 0,
                  total_hired_today: 0,
                  total_required_today: 0
                };
              }
              
              const hiredCount = event.assigned_workers_count || 0;
              const requiredCount = event.total_workers_needed || 0;
              
              daysMap[dateKey].events.push({
                id: event.id,
                title: event.title,
                unfilled_roles_count: event.unfilled_roles_count || 0,
                hired_count: hiredCount,
                required_count: requiredCount
              });
              
              daysMap[dateKey].shifts_count += event.total_shifts_count || 0;
              daysMap[dateKey].needs_workers_count += event.unfilled_roles_count || 0;
              daysMap[dateKey].total_hired_today += hiredCount;
              daysMap[dateKey].total_required_today += requiredCount;
              
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
          
          // Get urgent events (upcoming with gaps, within 48h)
          const urgent = publishedEvents
            .filter((e: any) => {
              // Must have schedule
              if (!e.schedule) {
                console.debug(`[Urgent Queue] Event ${e.id} (${e.title}) filtered: no schedule`);
                return false;
              }
              
              // Must have unfilled roles
              const unfilledCount = e.unfilled_roles_count || 0;
              if (unfilledCount === 0) {
                console.debug(`[Urgent Queue] Event ${e.id} (${e.title}) filtered: no unfilled roles (count: ${unfilledCount})`);
                return false;
              }
              
              // Must be in the future
              const eventDate = parseISO(e.schedule.start_time_utc);
              const now = new Date();
              if (eventDate < now) {
                console.debug(`[Urgent Queue] Event ${e.id} (${e.title}) filtered: event is in the past`);
                return false;
              }
              
              // Must be within 48 hours
              const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
              const isWithin48h = hoursUntil > 0 && hoursUntil <= 48;
              
              if (!isWithin48h) {
                console.debug(`[Urgent Queue] Event ${e.id} (${e.title}) filtered: outside 48h window (${hoursUntil.toFixed(1)}h until)`);
                return false;
              }
              
              console.debug(`[Urgent Queue] Event ${e.id} (${e.title}) included: ${hoursUntil.toFixed(1)}h until, ${unfilledCount} unfilled roles`);
              return true;
            })
            .map((e: any) => {
              const eventDate = parseISO(e.schedule.start_time_utc);
              const hoursUntil = (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
              
              return {
                ...e,
                // Normalize potentially missing nested objects used by UI
                venue: e.venue || { name: '', formatted_address: '' },
                hours_until: hoursUntil
              };
            })
            .sort((a: any, b: any) => {
              // Sort by time until event, then by percentage filled
              if (a.hours_until !== b.hours_until) {
                return a.hours_until - b.hours_until;
              }
              return a.staffing_percentage - b.staffing_percentage;
            })
            .slice(0, 5); // Top 5 most urgent
          
          // Debug summary
          console.debug(`[Urgent Queue] Summary: ${publishedEvents.length} published events checked, ${urgent.length} urgent events found (within 48h with unfilled roles)`);
          
          setUrgentEvents(urgent);
        }
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
    // Determine tab based on date: past dates go to completed, future dates go to active
    const today = startOfDay(new Date());
    const clickedDate = startOfDay(date);
    const tab = clickedDate < today ? 'completed' : 'active';
    navigate(`/events?tab=${tab}&date=${dateStr}`);
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
            value={stats.draft_events}
            onClick={() => navigate('/events?tab=draft')}
            color="gray"
          />
          
          <StatCard
            label="Active Events"
            value={stats.published_events}
            onClick={() => navigate('/events?tab=active')}
            color="blue"
          />
          
          <StatCard
            label="Completed Events"
            value={stats.completed_events}
            onClick={() => navigate('/events?tab=completed')}
            color="green"
          />
          
            <StatCard
              label="Unfilled Roles"
              value={stats.gaps_to_fill}
              onClick={() => navigate('/events?tab=active&filter=needs_workers')}
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
            onEventClick={(eventId) => navigate(`/events?tab=active&event_id=${eventId}`)}
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
                  ? 'border-gray-400 bg-white ring-2 ring-gray-300' 
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
                  ? 'text-gray-700' 
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
                  
                  {/* Event count and staffing progress */}
                  {dayData.events.length > 0 && (
                    <>
                      <div className="text-xs text-center text-gray-600">
                        {dayData.events.length} event{dayData.events.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-center font-medium text-gray-700">
                        {dayData.total_hired_today}/{dayData.total_required_today} hired
                      </div>
                    </>
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
  const isUrgent = (event: UrgentEvent) => {
    if (!event.schedule) return false;
    const eventDate = parseISO(event.schedule.start_time_utc);
    const hoursUntil = (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil <= 48;
  };
  
  const getUrgencyBadge = () => {
    return (
      <span 
        className="bg-red-50 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
        aria-label="Urgent: starts within 48 hours"
      >
        <div className="w-2 h-2 bg-red-600 rounded-full" />
        URGENT
      </span>
    );
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
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Priority Staffing Queue</h3>
        </div>
        <p className="text-sm text-gray-600">
          {events.length} {events.length === 1 ? 'event needs' : 'events need'} workers · Sorted by urgency
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
                {/* Date + Urgent badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    {formatDate(event.schedule.start_time_utc)}
                  </span>
                  {isUrgent(event) && (
                    <>{getUrgencyBadge()}</>
                  )}
                </div>
                
                {/* Event name - Larger and bolder */}
                <h4 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                  {event.title}
                </h4>
                
                {/* Venue + Time */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{event.venue?.name || 'Venue TBD'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <span>
                      {formatTime(event.schedule.start_time_utc)} - {formatTime(event.schedule.end_time_utc)}
                    </span>
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          (event.staffing_percentage || 0) >= 100 ? "bg-green-500" :
                          (event.staffing_percentage || 0) >= 75 ? "bg-amber-500" :
                          "bg-red-500"
                        )}
                        style={{ width: `${event.staffing_percentage || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 min-w-[3rem] text-right">
                      {event.staffing_percentage || 0}%
                    </span>
                  </div>
                </div>
                
                {/* Staffing status with icon */}
                <div className="flex items-center gap-1.5 text-sm">
                  {event.unfilled_roles_count > 0 ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <span className="text-red-600 font-medium">
                        {event.unfilled_roles_count} {event.unfilled_roles_count === 1 ? 'role' : 'roles'} still need workers
                      </span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-green-600 font-medium">
                        Fully staffed
                      </span>
                    </>
                  )}
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