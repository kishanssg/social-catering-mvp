import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';

interface Shift {
  id: number;
  date: Date;
  status: 'fully_staffed' | 'needs_workers' | 'partially_staffed';
  count: number;
}

interface CalendarWidgetProps {
  shifts: Shift[];
  onDayClick: (date: Date) => void;
}

export function CalendarWidget({ shifts, onDayClick }: CalendarWidgetProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  
  const getShiftsForDay = (date: Date) => {
    return shifts.filter(shift => isSameDay(shift.date, date));
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_staffed': return 'bg-green-500';
      case 'partially_staffed': return 'bg-yellow-500';
      case 'needs_workers': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentWeekStart, 'MMMM yyyy')}
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            Previous Week
          </button>
          <button
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            Next Week
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dayShifts = getShiftsForDay(day);
          const totalShifts = dayShifts.reduce((sum, s) => sum + s.count, 0);
          const hasGaps = dayShifts.some(s => s.status === 'needs_workers');
          
          return (
            <div
              key={index}
              onClick={() => onDayClick(day)}
              className={`
                relative p-4 rounded-lg border cursor-pointer transition-all
                ${isToday(day) 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                }
              `}
            >
              {/* Day Name */}
              <div className="text-xs font-medium text-gray-500 mb-1">
                {format(day, 'EEE')}
              </div>
              
              {/* Day Number */}
              <div className={`text-2xl font-semibold mb-2 ${isToday(day) ? 'text-teal-600' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
              
              {/* Shift Indicators */}
              {dayShifts.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {dayShifts.slice(0, 3).map((shift, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${getStatusColor(shift.status)}`}
                        title={shift.status}
                      />
                    ))}
                    {dayShifts.length > 3 && (
                      <span className="text-xs text-gray-500">+{dayShifts.length - 3}</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    {totalShifts} shift{totalShifts !== 1 ? 's' : ''}
                  </div>
                  
                  {hasGaps && (
                    <div className="text-xs font-medium text-red-600">
                      Needs workers
                    </div>
                  )}
                </div>
              )}
              
              {dayShifts.length === 0 && (
                <div className="text-xs text-gray-400">No shifts</div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Fully Staffed</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Partially Staffed</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Needs Workers</span>
        </div>
      </div>
    </div>
  );
}
