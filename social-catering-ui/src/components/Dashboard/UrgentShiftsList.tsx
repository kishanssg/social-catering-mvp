import React from 'react';
import { format, differenceInHours } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface UrgentShift {
  id: number;
  event_title: string;
  role_needed: string;
  start_time_utc: string;
  staffing_progress: {
    assigned: number;
    required: number;
    percentage: number;
  };
}

interface UrgentShiftsListProps {
  shifts: UrgentShift[];
}

export function UrgentShiftsList({ shifts }: UrgentShiftsListProps) {
  const navigate = useNavigate();
  
  const getUrgencyLevel = (shift: UrgentShift) => {
    const hoursUntil = differenceInHours(new Date(shift.start_time_utc), new Date());
    const percentage = shift.staffing_progress.percentage;
    
    if (percentage === 0 || hoursUntil < 48) return 'urgent';
    if (percentage < 50) return 'high';
    return 'medium';
  };
  
  const getUrgencyBadge = (level: string) => {
    switch (level) {
      case 'urgent':
        return <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded">🔴 URGENT</span>;
      case 'high':
        return <span className="px-2 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded">⚠️ HIGH</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded">⚠️ MEDIUM</span>;
    }
  };
  
  const getTimeUntil = (dateStr: string) => {
    const hours = differenceInHours(new Date(dateStr), new Date());
    const days = Math.floor(hours / 24);
    
    if (hours < 24) return `Shift in ${hours} hours`;
    if (days === 1) return 'Shift tomorrow';
    return `Shift in ${days} days`;
  };
  
  // Sort by urgency: urgent first, then by time
  const sortedShifts = [...shifts].sort((a, b) => {
    const urgencyA = getUrgencyLevel(a);
    const urgencyB = getUrgencyLevel(b);
    
    const urgencyOrder = { urgent: 0, high: 1, medium: 2 };
    if (urgencyOrder[urgencyA] !== urgencyOrder[urgencyB]) {
      return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
    }
    
    return new Date(a.start_time_utc).getTime() - new Date(b.start_time_utc).getTime();
  });
  
  if (sortedShifts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
        <p className="text-gray-600">Every shift is fully staffed. Great work!</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">⚠️ Needs Attention</h3>
        <p className="text-sm text-gray-500 mt-1">Sorted by urgency • {sortedShifts.length} shifts need workers</p>
      </div>
      
      {/* List */}
      <div className="divide-y divide-gray-200">
        {sortedShifts.map(shift => {
          const urgency = getUrgencyLevel(shift);
          const needed = shift.staffing_progress.required - shift.staffing_progress.assigned;
          
          return (
            <div
              key={shift.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getUrgencyBadge(urgency)}
                    <span className="text-sm text-gray-600">
                      {format(new Date(shift.start_time_utc), 'EEE, MMM d')}
                    </span>
                  </div>
                  
                  <h4 className="text-base font-medium text-gray-900 mb-1 truncate">
                    {shift.event_title} - {shift.role_needed}
                  </h4>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">
                      {shift.staffing_progress.assigned} of {shift.staffing_progress.required} workers
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="font-medium text-red-600">
                      {needed} still needed
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">
                      {getTimeUntil(shift.start_time_utc)}
                    </span>
                  </div>
                </div>
                
                {/* Right: Action */}
                <button
                  onClick={() => navigate(`/assignments?shift_id=${shift.id}`)}
                  className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
                >
                  Assign Now
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}