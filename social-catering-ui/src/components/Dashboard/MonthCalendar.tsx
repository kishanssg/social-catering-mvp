import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  addMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';

type DayStatus = 'empty' | 'fully_staffed' | 'partially_staffed' | 'needs_workers';

interface DayData {
  date: Date;
  status: DayStatus;
  shiftsCount: number;
  needsWorkers: number; // How many positions unfilled
}

interface MonthCalendarProps {
  daysData: DayData[];
  onDayClick: (date: Date) => void;
}

export function MonthCalendar({ daysData, onDayClick }: MonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Start on Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const getDayData = (date: Date): DayData | undefined => {
    return daysData.find(d => isSameDay(d.date, date));
  };
  
  const getStatusIcon = (status: DayStatus) => {
    switch (status) {
      case 'fully_staffed': return '✓';
      case 'partially_staffed': return '⚠️';
      case 'needs_workers': return '🔴';
      default: return null;
    }
  };
  
  const getStatusColor = (status: DayStatus) => {
    switch (status) {
      case 'fully_staffed': return 'text-green-600 bg-green-50';
      case 'partially_staffed': return 'text-yellow-600 bg-yellow-50';
      case 'needs_workers': return 'text-red-600 bg-red-50';
      default: return 'text-gray-400';
    }
  };
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, -1))}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition"
          >
            ←
          </button>
          
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded transition"
          >
            Today
          </button>
          
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition"
          >
            →
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {allDays.map((day, index) => {
          const dayData = getDayData(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isTodayDate = isToday(day);
          
          return (
            <div
              key={index}
              onClick={() => dayData && onDayClick(day)}
              className={`
                relative aspect-square rounded-lg border p-2 transition-all
                ${isTodayDate 
                  ? 'border-gray-400 bg-white ring-2 ring-gray-300' 
                  : dayData 
                    ? 'border-gray-200 hover:border-teal-300 hover:shadow-sm cursor-pointer' 
                    : 'border-gray-100'
                }
                ${!isCurrentMonth ? 'opacity-40' : ''}
              `}
            >
              {/* Date number */}
              <div className={`text-sm font-medium ${isTodayDate ? 'text-gray-700' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
              
              {/* Status indicator */}
              {dayData && (
                <div className="mt-1 flex flex-col items-center gap-1">
                  <div className={`text-2xl ${getStatusColor(dayData.status)}`}>
                    {getStatusIcon(dayData.status)}
                  </div>
                  
                  {dayData.shiftsCount > 0 && (
                    <div className="text-xs text-gray-600">
                      {dayData.shiftsCount} shift{dayData.shiftsCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  
                  {dayData.needsWorkers > 0 && (
                    <div className="text-xs font-medium text-red-600">
                      -{dayData.needsWorkers}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xl">✓</span>
          <span className="text-gray-600">Fully Staffed</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xl">⚠️</span>
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

