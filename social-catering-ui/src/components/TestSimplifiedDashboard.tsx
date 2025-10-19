import React from 'react';
import { SimpleStatCard } from './dashboard/SimpleStatCard';
import { MonthCalendar } from './dashboard/MonthCalendar';
import { UrgentShiftsList } from './dashboard/UrgentShiftsList';

// Mock data for testing
const mockCalendarData = [
  {
    date: new Date('2024-01-15'),
    status: 'needs_workers' as const,
    shiftsCount: 2,
    needsWorkers: 3
  },
  {
    date: new Date('2024-01-16'),
    status: 'partially_staffed' as const,
    shiftsCount: 1,
    needsWorkers: 1
  },
  {
    date: new Date('2024-01-17'),
    status: 'fully_staffed' as const,
    shiftsCount: 3,
    needsWorkers: 0
  },
  {
    date: new Date('2024-01-20'),
    status: 'needs_workers' as const,
    shiftsCount: 1,
    needsWorkers: 2
  }
];

const mockUrgentShifts = [
  {
    id: 1,
    job_title: 'Corporate Holiday Gala',
    role_needed: 'Server',
    start_time_utc: '2024-01-15T18:00:00Z',
    staffing_progress: {
      assigned: 0,
      required: 5,
      percentage: 0
    }
  },
  {
    id: 2,
    job_title: 'Wedding Reception',
    role_needed: 'Bartender',
    start_time_utc: '2024-01-16T19:00:00Z',
    staffing_progress: {
      assigned: 1,
      required: 3,
      percentage: 33
    }
  },
  {
    id: 3,
    job_title: 'Birthday Party',
    role_needed: 'Server',
    start_time_utc: '2024-01-25T20:00:00Z',
    staffing_progress: {
      assigned: 2,
      required: 4,
      percentage: 50
    }
  }
];

export function TestSimplifiedDashboard() {
  const handleDayClick = (date: Date) => {
    console.log('Day clicked:', date);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Simplified Dashboard Test</h1>
        
        {/* Test Stats Row */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stats Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SimpleStatCard
              label="Draft Jobs"
              value={4}
              onClick={() => console.log('Draft clicked')}
            />
            <SimpleStatCard
              label="Published Jobs"
              value={8}
              onClick={() => console.log('Published clicked')}
            />
            <SimpleStatCard
              label="Completed Jobs"
              value={12}
              onClick={() => console.log('Completed clicked')}
            />
            <SimpleStatCard
              label="Gaps to Fill"
              value={11}
              isHero
              onClick={() => console.log('Gaps clicked')}
            />
          </div>
        </div>

        {/* Test Calendar */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Month Calendar</h2>
          <MonthCalendar
            daysData={mockCalendarData}
            onDayClick={handleDayClick}
          />
        </div>

        {/* Test Urgent List */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Urgent Shifts List</h2>
          <UrgentShiftsList shifts={mockUrgentShifts} />
        </div>

        {/* Test Empty State */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Empty State</h2>
          <UrgentShiftsList shifts={[]} />
        </div>
      </div>
    </div>
  );
}
