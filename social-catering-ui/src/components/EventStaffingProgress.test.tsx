// src/components/EventStaffingProgress.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventStaffingProgress from './EventStaffingProgress';

const mockEvent = {
  id: 1,
  title: 'Test Event',
  status: 'published',
  shifts_by_role: [
    {
      role_name: 'Server',
      total_shifts: 3,
      assigned_shifts: 2,
      total_workers_needed: 3,
      assigned_workers: 2,
      staffing_percentage: 67,
      shifts: [
        {
          id: 1,
          role_needed: 'Server',
          capacity: 1,
          staffing_progress: { assigned: 1, required: 1, percentage: 100 },
          fully_staffed: true,
          assignments: [
            {
              id: 1,
              worker: { id: 1, first_name: 'John', last_name: 'Doe' },
              status: 'confirmed',
            },
          ],
        },
        {
          id: 2,
          role_needed: 'Server',
          capacity: 1,
          staffing_progress: { assigned: 1, required: 1, percentage: 100 },
          fully_staffed: true,
          assignments: [
            {
              id: 2,
              worker: { id: 2, first_name: 'Jane', last_name: 'Smith' },
              status: 'confirmed',
            },
          ],
        },
        {
          id: 3,
          role_needed: 'Server',
          capacity: 1,
          staffing_progress: { assigned: 0, required: 1, percentage: 0 },
          fully_staffed: false,
          assignments: [],
        },
      ],
    },
    {
      role_name: 'Bartender',
      total_shifts: 1,
      assigned_shifts: 0,
      total_workers_needed: 1,
      assigned_workers: 0,
      staffing_percentage: 0,
      shifts: [
        {
          id: 4,
          role_needed: 'Bartender',
          capacity: 1,
          staffing_progress: { assigned: 0, required: 1, percentage: 0 },
          fully_staffed: false,
          assignments: [],
        },
      ],
    },
  ],
};

describe('EventStaffingProgress', () => {
  const defaultProps = {
    event: mockEvent,
    onAssignWorker: jest.fn(),
    onUnassignWorker: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders event title correctly', () => {
    render(<EventStaffingProgress {...defaultProps} />);
    
    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });

  it('displays role groups correctly', () => {
    render(<EventStaffingProgress {...defaultProps} />);
    
    expect(screen.getByText('Server')).toBeInTheDocument();
    expect(screen.getByText('Bartender')).toBeInTheDocument();
  });

  it('shows correct staffing percentages for each role', () => {
    render(<EventStaffingProgress {...defaultProps} />);
    
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays shift counts correctly', () => {
    render(<EventStaffingProgress {...defaultProps} />);
    
    expect(screen.getByText('2 of 3 shifts assigned')).toBeInTheDocument();
    expect(screen.getByText('0 of 1 shifts assigned')).toBeInTheDocument();
  });

  it('shows individual shift staffing progress', () => {
    render(<EventStaffingProgress {...defaultProps} />);
    
    // Check for individual shift progress indicators
    expect(screen.getAllByText('100%')).toHaveLength(2); // Two fully staffed shifts
    expect(screen.getAllByText('0%')).toHaveLength(2); // Two unstaffed shifts
  });

  it('calls onAssignWorker when assign button is clicked', () => {
    render(<EventStaffingProgress {...defaultProps} />);
    
    const assignButtons = screen.getAllByText('Assign Worker');
    fireEvent.click(assignButtons[0]);
    
    expect(defaultProps.onAssignWorker).toHaveBeenCalledWith(3); // First unstaffed shift
  });

  it('calls onUnassignWorker when unassign button is clicked', () => {
    render(<EventStaffingProgress {...defaultProps} />);
    
    const unassignButtons = screen.getAllByText('Unassign');
    fireEvent.click(unassignButtons[0]);
    
    expect(defaultProps.onUnassignWorker).toHaveBeenCalledWith(1); // First assignment
  });

  it('handles events with no shifts gracefully', () => {
    const eventWithoutShifts = {
      ...mockEvent,
      shifts_by_role: [],
    };

    render(<EventStaffingProgress {...defaultProps} event={eventWithoutShifts} />);
    
    expect(screen.getByText('No shifts available')).toBeInTheDocument();
  });

  it('handles events with null shifts_by_role gracefully', () => {
    const eventWithNullShifts = {
      ...mockEvent,
      shifts_by_role: null,
    };

    render(<EventStaffingProgress {...defaultProps} event={eventWithNullShifts} />);
    
    expect(screen.getByText('No shifts available')).toBeInTheDocument();
  });

  it('displays correct overall event staffing percentage', () => {
    render(<EventStaffingProgress {...defaultProps} />);
    
    // Overall: 2 assigned out of 4 total = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows different colors for different staffing levels', () => {
    render(<EventStaffingProgress {...defaultProps} />);
    
    // Check for different progress bar colors
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2); // One for each role
  });

  it('handles fully staffed events correctly', () => {
    const fullyStaffedEvent = {
      ...mockEvent,
      shifts_by_role: [
        {
          role_name: 'Server',
          total_shifts: 2,
          assigned_shifts: 2,
          total_workers_needed: 2,
          assigned_workers: 2,
          staffing_percentage: 100,
          shifts: [
            {
              id: 1,
              role_needed: 'Server',
              capacity: 1,
              staffing_progress: { assigned: 1, required: 1, percentage: 100 },
              fully_staffed: true,
              assignments: [
                {
                  id: 1,
                  worker: { id: 1, first_name: 'John', last_name: 'Doe' },
                  status: 'confirmed',
                },
              ],
            },
            {
              id: 2,
              role_needed: 'Server',
              capacity: 1,
              staffing_progress: { assigned: 1, required: 1, percentage: 100 },
              fully_staffed: true,
              assignments: [
                {
                  id: 2,
                  worker: { id: 2, first_name: 'Jane', last_name: 'Smith' },
                  status: 'confirmed',
                },
              ],
            },
          ],
        },
      ],
    };

    render(<EventStaffingProgress {...defaultProps} event={fullyStaffedEvent} />);
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.queryByText('Assign Worker')).not.toBeInTheDocument();
  });

  it('handles events with mixed assignment statuses', () => {
    const mixedStatusEvent = {
      ...mockEvent,
      shifts_by_role: [
        {
          role_name: 'Server',
          total_shifts: 2,
          assigned_shifts: 2,
          total_workers_needed: 2,
          assigned_workers: 1, // One confirmed, one pending
          staffing_percentage: 50,
          shifts: [
            {
              id: 1,
              role_needed: 'Server',
              capacity: 1,
              staffing_progress: { assigned: 1, required: 1, percentage: 100 },
              fully_staffed: true,
              assignments: [
                {
                  id: 1,
                  worker: { id: 1, first_name: 'John', last_name: 'Doe' },
                  status: 'confirmed',
                },
              ],
            },
            {
              id: 2,
              role_needed: 'Server',
              capacity: 1,
              staffing_progress: { assigned: 0, required: 1, percentage: 0 },
              fully_staffed: false,
              assignments: [
                {
                  id: 2,
                  worker: { id: 2, first_name: 'Jane', last_name: 'Smith' },
                  status: 'pending',
                },
              ],
            },
          ],
        },
      ],
    };

    render(<EventStaffingProgress {...defaultProps} event={mixedStatusEvent} />);
    
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 shifts assigned')).toBeInTheDocument();
  });
});
