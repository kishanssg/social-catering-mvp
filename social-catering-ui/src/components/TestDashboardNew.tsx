import React from 'react';
import { StatCard } from './dashboard/StatCard';
import { CalendarWidget } from './dashboard/CalendarWidget';
import { UrgentShiftsList } from './dashboard/UrgentShiftsList';

// Mock data for testing
const mockCalendarShifts = [
  {
    id: 1,
    date: new Date('2024-01-15'),
    status: 'needs_workers' as const,
    count: 2
  },
  {
    id: 2,
    date: new Date('2024-01-16'),
    status: 'partially_staffed' as const,
    count: 1
  },
  {
    id: 3,
    date: new Date('2024-01-17'),
    status: 'fully_staffed' as const,
    count: 3
  }
];

const mockUrgentShifts = [
  {
    id: 1,
    job_title: 'Corporate Gala',
    role_needed: 'Server',
    start_time_utc: '2024-01-15T18:00:00Z',
    staffing_progress: {
      assigned: 2,
      required: 5,
      percentage: 40
    },
    status: 'needs_workers'
  },
  {
    id: 2,
    job_title: 'Wedding Reception',
    role_needed: 'Bartender',
    start_time_utc: '2024-01-16T19:00:00Z',
    staffing_progress: {
      assigned: 1,
      required: 2,
      percentage: 50
    },
    status: 'partially_staffed'
  }
];

export function TestDashboardNew() {
  const handleDayClick = (date: Date) => {
    console.log('Day clicked:', date);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard Components Test</h1>
      
      {/* Test StatCards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stat Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Active Jobs"
            value={12}
            onClick={() => console.log('Active Jobs clicked')}
          />
          <StatCard
            label="Today's Shifts"
            value={8}
            onClick={() => console.log('Today clicked')}
          />
          <StatCard
            label="This Week"
            value={34}
            onClick={() => console.log('Week clicked')}
          />
          <StatCard
            label="Gaps to Fill"
            value={5}
            onClick={() => console.log('Gaps clicked')}
          />
        </div>
      </div>

      {/* Test Calendar Widget */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar Widget</h2>
        <CalendarWidget
          shifts={mockCalendarShifts}
          onDayClick={handleDayClick}
        />
      </div>

      {/* Test Urgent Shifts List */}
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
  );
}
