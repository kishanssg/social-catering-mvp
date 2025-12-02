import { format } from 'date-fns';
import { X } from 'lucide-react';
import type { Shift } from '../../services/shiftsApi';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  shifts: Shift[];
  onClick: (date: Date) => void;
}

const DayCell = ({ date, isCurrentMonth, isToday, shifts, onClick }: DayCellProps) => {
  const dayNumber = format(date, 'd');
  
  // Group shifts by status for color coding
  const publishedShifts = shifts.filter(s => s.status === 'published');
  const draftShifts = shifts.filter(s => s.status === 'draft');
  
  // Check if any shift needs workers
  const needsWorkers = publishedShifts.some(s => {
    const assigned = s.assignments?.length || 0;
    return assigned < s.capacity;
  });
  
  // Check if any shift is fully staffed
  const fullyStaffed = publishedShifts.some(s => {
    const assigned = s.assignments?.length || 0;
    return assigned >= s.capacity;
  });

  // Calculate total assigned workers
  const totalAssigned = shifts.reduce((sum, shift) => sum + (shift.assignments?.length || 0), 0);
  
  // Check if there are events but NO workers assigned (for X icon)
  const hasEventButNoWorkers = shifts.length > 0 && totalAssigned === 0;
  
  // Create tooltip text
  const tooltipText = shifts.length > 0 
    ? `${shifts.length} shift${shifts.length !== 1 ? 's' : ''} - Click to view details`
    : '';

  return (
    <button
      onClick={() => onClick(date)}
      title={tooltipText}
      className={`
        min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border border-gray-200 
        hover:bg-gray-50 transition-colors flex flex-col items-start relative
        ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
        ${isToday ? 'ring-2 ring-gray-400 bg-white' : ''}
        ${shifts.length > 0 ? 'hover:border-blue-300' : ''}
      `}
    >
      {/* Day Number */}
      <div className={`
        text-xs sm:text-sm font-semibold mb-1 sm:mb-2 flex items-center justify-center
        ${isToday ? 'bg-gray-700 text-white rounded-full h-5 w-5 sm:h-6 sm:w-6' : ''}
      `}>
        {dayNumber}
      </div>
      
      {/* X Icon for events with no workers */}
      {hasEventButNoWorkers && (
        <div className="absolute top-1 right-1">
          <X className="h-4 w-4 text-red-500" strokeWidth={2.5} />
        </div>
      )}
      
      {/* Shift Indicators */}
      {shifts.length > 0 && (
        <div className="w-full space-y-0.5 sm:space-y-1">
          {/* Published shifts */}
          {publishedShifts.length > 0 && (
            <div className={`text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded ${
              needsWorkers ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
              fullyStaffed ? 'bg-green-100 text-green-800 border border-green-200' : 
              'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              {publishedShifts.length} {needsWorkers ? 'needs staff' : fullyStaffed ? 'filled' : 'published'}
            </div>
          )}
          
          {/* Draft shifts */}
          {draftShifts.length > 0 && (
            <div className="text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded bg-gray-100 text-gray-800 border border-gray-200">
              {draftShifts.length} draft
            </div>
          )}

          {/* Total workers assigned */}
          {totalAssigned > 0 && (
            <div className="text-xs text-gray-600 mt-0.5 sm:mt-1">
              {totalAssigned} worker{totalAssigned !== 1 ? 's' : ''}
            </div>
          )}
          
          {/* Total count if more than 2 */}
          {shifts.length > 2 && (
            <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">
              +{shifts.length - 2} more
            </div>
          )}
        </div>
      )}

      {/* Hover indicator */}
      {shifts.length > 0 && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
};

export default DayCell;
