import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Users, Calendar, Clock, TrendingUp } from 'lucide-react';
import { useShifts } from '../../hooks/useShifts';
import { useWorkers } from '../../hooks/useWorkers';
import { useAssignments } from '../../hooks/useAssignments';
import { Link, useNavigate } from 'react-router-dom';
import { Shift } from '../../types';

interface DayShifts {
  [date: string]: Shift[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  
  const { shifts, isLoading: shiftsLoading } = useShifts();
  const { workers } = useWorkers();
  const { assignments } = useAssignments();
  
  // Calculate metrics
  const activeWorkers = workers.filter(w => w.active).length;
  const todayShifts = shifts.filter(s => 
    isSameDay(new Date(s.start_time_utc), new Date())
  );
  const pendingAssignments = assignments.filter(a => 
    a.status === 'assigned'
  ).length;
  const thisWeekHours = assignments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + (a.hours_worked || 0), 0);

  // Group shifts by date
  const shiftsByDate: DayShifts = {};
  shifts.forEach(shift => {
    const date = format(new Date(shift.start_time_utc), 'yyyy-MM-dd');
    if (!shiftsByDate[date]) {
      shiftsByDate[date] = [];
    }
    shiftsByDate[date].push(shift);
  });

  // Get calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Pad the calendar to start on Sunday
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setDayModalOpen(true);
  };

  const getShiftStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-blue-500';
      case 'draft':
        return 'bg-gray-400';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-yellow-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your schedule overview.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Active Workers</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{activeWorkers}</div>
          <Link to="/workers" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Manage workers →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Today's Shifts</span>
            <Calendar className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold">{todayShifts.length}</div>
          {todayShifts.length > 0 && (
            <div className="text-sm text-gray-600 mt-2">
              {todayShifts.filter(s => s.available_slots > 0).length} need workers
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Pending Assignments</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold">{pendingAssignments}</div>
          <Link to="/assignments" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Review assignments →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">This Week Hours</span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold">{thisWeekHours.toFixed(1)}</div>
          <Link to="/reports/timesheet" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            View timesheet →
          </Link>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow">
        {/* Calendar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="ml-4">
                <button
                  onClick={() => navigate('/test-wizard')}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Shift
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {paddingDays.map((_, index) => (
              <div key={`padding-${index}`} className="bg-gray-50 h-24" />
            ))}
            
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayShifts = shiftsByDate[dateStr] || [];
              const isCurrentDay = isToday(day);
              
              return (
                <div
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  className={`
                    bg-white p-2 h-24 cursor-pointer hover:bg-gray-50 transition-colors
                    ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`
                      text-sm font-medium
                      ${isCurrentDay ? 'text-blue-600' : 'text-gray-900'}
                    `}>
                      {format(day, 'd')}
                    </span>
                    {dayShifts.length > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {dayShifts.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Shift indicators */}
                  <div className="space-y-1">
                    {dayShifts.slice(0, 2).map((shift, index) => (
                      <div
                        key={shift.id}
                        className={`text-xs p-1 rounded truncate ${
                          shift.status === 'published' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {shift.client_name}
                      </div>
                    ))}
                    {dayShifts.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayShifts.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar Legend */}
        <div className="px-6 pb-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Published</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span className="text-gray-600">Draft</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">Completed</span>
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDate && dayModalOpen && (
        <DayDetailsModal
          date={selectedDate}
          shifts={shiftsByDate[format(selectedDate, 'yyyy-MM-dd')] || []}
          onClose={() => setDayModalOpen(false)}
        />
      )}
    </div>
  );
}

// Day Details Modal Component
function DayDetailsModal({ date, shifts, onClose }: {
  date: Date;
  shifts: Shift[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {shifts.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No shifts scheduled for this day</p>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/test-wizard');
                  }}
                  className="btn-primary mt-4"
                >
                  Create Shift
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {shifts.map(shift => (
                  <div
                    key={shift.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      onClose();
                      navigate(`/shifts/${shift.id}`);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{shift.client_name}</h4>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          shift.status === 'published'
                            ? 'bg-blue-100 text-blue-800'
                            : shift.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {shift.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Time:</span>
                        <p className="font-medium">
                          {format(new Date(shift.start_time_utc), 'h:mm a')} - 
                          {format(new Date(shift.end_time_utc), 'h:mm a')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Role:</span>
                        <p className="font-medium">{shift.role_needed}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Location:</span>
                        <p className="font-medium">
                          {shift.location?.display_name || shift.location_text || 'TBD'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Staffing:</span>
                        <p className="font-medium">
                          {shift.assigned_count} / {shift.capacity}
                          {shift.available_slots > 0 && (
                            <span className="text-yellow-600 ml-2">
                              ({shift.available_slots} needed)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {shift.notes && (
                      <div className="mt-3 text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {shift.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

