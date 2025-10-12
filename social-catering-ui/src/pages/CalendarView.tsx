import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useShifts } from '../hooks/useShifts';
import { 
  getCalendarDays, 
  getMonthYear, 
  getPreviousMonth, 
  getNextMonth,
  formatDateForAPI 
} from '../utils/calendar';
import CalendarGrid from '../components/calendar/CalendarGrid';
import DayDetailModal from '../components/calendar/DayDetailModal';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Get start and end of current month for API query
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { shifts, loading, error } = useShifts({
    start_date: formatDateForAPI(monthStart),
    end_date: formatDateForAPI(monthEnd),
  });
  
  // Get calendar days for current month
  const calendarDays = getCalendarDays(currentDate);
  
  // Get shifts for selected date
  const getShiftsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateKey = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => {
      const shiftDate = format(new Date(shift.start_time_utc), 'yyyy-MM-dd');
      return shiftDate === dateKey;
    });
  };
  
  const selectedDateShifts = getShiftsForDate(selectedDate);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePreviousMonth();
      } else if (e.key === 'ArrowRight') {
        handleNextMonth();
      } else if (e.key === 't' || e.key === 'T') {
        handleToday();
      } else if (e.key === 'Escape' && selectedDate) {
        setSelectedDate(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedDate, currentDate]);
  
  const handlePreviousMonth = () => {
    setCurrentDate(getPreviousMonth(currentDate));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(getNextMonth(currentDate));
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };
  
  // Stats
  const totalShifts = shifts.length;
  const publishedShifts = shifts.filter(s => s.status === 'published').length;
  const needsWorkersCount = shifts.filter(s => {
    const assigned = s.assignments?.length || 0;
    return assigned < s.capacity && s.status === 'published';
  }).length;
  const totalAssignedWorkers = shifts.reduce((sum, shift) => sum + (shift.assignments?.length || 0), 0);
  
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Stats skeleton */}
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg px-4 py-3 animate-pulse min-w-[80px]">
                  <div className="h-6 bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-12"></div>
                </div>
              ))}
            </div>
            
            {/* Create button skeleton */}
            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          </div>
        </div>
        
        {/* Navigation skeleton */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        
        {/* Legend skeleton */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse mb-3"></div>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Calendar grid skeleton */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Day names header */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="py-3 text-center">
                <div className="h-4 bg-gray-200 rounded w-8 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
          
          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[120px] p-2 border border-gray-200 bg-white">
                <div className="h-4 bg-gray-200 rounded w-6 animate-pulse mb-2"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1">
            Visual overview of all shifts and assignments
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Quick Stats */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0">
            <div className="bg-blue-50 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-center min-w-[70px] sm:min-w-[80px]">
              <div className="text-lg sm:text-xl font-bold text-blue-600">{totalShifts}</div>
              <div className="text-xs text-blue-700 mt-1">Total</div>
            </div>
            <div className="bg-yellow-50 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-center min-w-[70px] sm:min-w-[80px]">
              <div className="text-lg sm:text-xl font-bold text-yellow-600">{needsWorkersCount}</div>
              <div className="text-xs text-yellow-700 mt-1">Need Staff</div>
            </div>
            <div className="bg-green-50 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-center min-w-[70px] sm:min-w-[80px]">
              <div className="text-lg sm:text-xl font-bold text-green-600">{publishedShifts}</div>
              <div className="text-xs text-green-700 mt-1">Published</div>
            </div>
            <div className="bg-purple-50 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-center min-w-[70px] sm:min-w-[80px]">
              <div className="text-lg sm:text-xl font-bold text-purple-600">{totalAssignedWorkers}</div>
              <div className="text-xs text-purple-700 mt-1">Workers</div>
            </div>
          </div>
          
          {/* Create Shift Button */}
          <Link
            to="/shifts/new"
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Plus className="h-4 w-4" />
            <span>Create Shift</span>
          </Link>
        </div>
      </div>
      
      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {getMonthYear(currentDate)}
              </h2>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-sm btn-primary"
              >
                Today
              </button>
            </div>
            
            {/* Keyboard shortcuts hint */}
            <div className="text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded">←</kbd> / 
              <kbd className="px-2 py-1 bg-gray-100 rounded">→</kbd> Navigate months • 
              <kbd className="px-2 py-1 bg-gray-100 rounded">T</kbd> Today
            </div>
          </div>
          
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
            <span className="text-gray-700">Needs Workers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
            <span className="text-gray-700">Published</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
            <span className="text-gray-700">Fully Staffed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
            <span className="text-gray-700">Draft</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-blue-500"></div>
            <span className="text-gray-700">Today</span>
          </div>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <CalendarGrid
        days={calendarDays}
        shifts={shifts}
        onDayClick={handleDayClick}
      />
      
      {/* Empty State */}
      {totalShifts === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No shifts this month
          </h3>
          <p className="text-gray-500">
            Create shifts to see them on the calendar
          </p>
        </div>
      )}
      
      {/* Day Detail Modal */}
      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          shifts={selectedDateShifts}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
};

export default CalendarView;
