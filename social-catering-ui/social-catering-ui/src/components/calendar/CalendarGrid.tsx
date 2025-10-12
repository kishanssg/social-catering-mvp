import { format } from 'date-fns';
import type { CalendarDay } from '../../utils/calendar';
import { getDayNames } from '../../utils/calendar';
import type { Shift } from '../../services/shiftsApi';
import DayCell from './DayCell';

interface CalendarGridProps {
  days: CalendarDay[];
  shifts: Shift[];
  onDayClick: (date: Date) => void;
}

const CalendarGrid = ({ days, shifts, onDayClick }: CalendarGridProps) => {
  const dayNames = getDayNames();
  
  // Group shifts by date
  const shiftsByDate = shifts.reduce((acc, shift) => {
    const date = format(new Date(shift.start_time_utc), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);
  
  // Get shifts for a specific day
  const getShiftsForDay = (date: Date): Shift[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return shiftsByDate[dateKey] || [];
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Day Names Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map((dayName) => (
          <div
            key={dayName}
            className="py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50"
          >
            {dayName}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => (
          <DayCell
            key={index}
            date={day.date}
            isCurrentMonth={day.isCurrentMonth}
            isToday={day.isToday}
            shifts={getShiftsForDay(day.date)}
            onClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid;
