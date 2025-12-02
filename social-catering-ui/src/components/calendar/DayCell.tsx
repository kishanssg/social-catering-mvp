import { format } from 'date-fns';
import type { Shift } from '../../services/shiftsApi';
import { StaffingStatusBadge } from '../ui/StaffingStatusBadge';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  shifts: Shift[];
  onClick: (date: Date) => void;
}

const DayCell = ({ date, isCurrentMonth, isToday, shifts, onClick }: DayCellProps) => {
  const dayNumber = format(date, 'd');
  
  // Group shifts by status
  const publishedShifts = shifts.filter(s => s.status === 'published');
  const draftShifts = shifts.filter(s => s.status === 'draft');
  
  // Calculate staffing status for published shifts
  // Count assigned workers (excluding cancelled/no_show)
  const totalAssigned = publishedShifts.reduce((sum, shift) => {
    const validAssignments = (shift.assignments || []).filter(
      (a: any) => !['cancelled', 'no_show'].includes(a.status)
    );
    return sum + validAssignments.length;
  }, 0);
  
  const totalCapacity = publishedShifts.reduce((sum, shift) => sum + (shift.capacity || 0), 0);
  
  // Determine staffing status (matching backend logic)
  let staffingStatus: 'ready' | 'partial' | 'needs_workers' | null = null;
  if (publishedShifts.length > 0) {
    if (totalAssigned === 0) {
      staffingStatus = 'needs_workers';
    } else if (totalAssigned >= totalCapacity) {
      staffingStatus = 'ready';
    } else {
      staffingStatus = 'partial';
    }
  }
  
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
        ${isToday ? 'ring-2 ring-gray-400 ring-inset bg-white' : ''}
        ${shifts.length > 0 ? 'hover:border-blue-300' : ''}
      `}
    >
      {/* Day Number */}
      <div className={`
        text-xs sm:text-sm font-semibold mb-1 sm:mb-2 flex items-center justify-center
        ${isToday ? 'border-2 border-gray-500 rounded-full h-5 w-5 sm:h-6 sm:w-6' : ''}
      `}>
        {dayNumber}
      </div>
      
      {/* Shift Indicators */}
      {shifts.length > 0 && (
        <div className="w-full space-y-1 sm:space-y-1.5">
          {/* Staffing Status Badge (icon only, matching legend) */}
          {staffingStatus && (
            <div className="flex items-center gap-1">
              <StaffingStatusBadge 
                status={staffingStatus} 
                showLabel={false}
                showIcon={true}
                size="xs"
              />
              <span className="text-xs text-gray-600">
                {publishedShifts.length} event{publishedShifts.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          
          {/* Workers count */}
          {totalAssigned > 0 && totalCapacity > 0 && (
            <div className="text-xs text-gray-600">
              {totalAssigned}/{totalCapacity} hired
            </div>
          )}
          
          {/* Draft shifts indicator */}
          {draftShifts.length > 0 && (
            <div className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
              {draftShifts.length} draft
            </div>
          )}
        </div>
      )}
    </button>
  );
};

export default DayCell;
