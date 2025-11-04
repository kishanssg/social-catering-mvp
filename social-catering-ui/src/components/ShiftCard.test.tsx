// src/components/ShiftCard.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShiftCard from './ShiftCard';

// Mock the API client
jest.mock('../lib/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockShift = {
  id: 1,
  role_needed: 'Server',
  capacity: 1,
  start_time_utc: '2025-01-15T10:00:00Z',
  end_time_utc: '2025-01-15T14:00:00Z',
  location: 'Test Venue',
  status: 'published',
  staffing_progress: {
    assigned: 0,
    required: 1,
    percentage: 0,
  },
  fully_staffed: false,
  assignments: [],
  event: {
    id: 1,
    title: 'Test Event',
    venue: {
      id: 1,
      name: 'Test Venue',
      formatted_address: '123 Test St, Test City, FL 32301',
    },
  },
};

const mockWorkers = [
  {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    skills_json: ['Server'],
  },
  {
    id: 2,
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    skills_json: ['Bartender'],
  },
];

describe('ShiftCard', () => {
  const defaultProps = {
    shift: mockShift,
    workers: mockWorkers,
    onAssignWorker: jest.fn(),
    onUnassignWorker: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders shift information correctly', () => {
    render(<ShiftCard {...defaultProps} />);
    
    expect(screen.getByText('Server')).toBeInTheDocument();
    expect(screen.getByText('Test Venue')).toBeInTheDocument();
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('0 of 1 filled (0%)')).toBeInTheDocument();
  });

  it('shows assign button when shift is not fully staffed', () => {
    render(<ShiftCard {...defaultProps} />);
    
    expect(screen.getByText('Assign Worker')).toBeInTheDocument();
  });

  it('hides assign button when shift is fully staffed', () => {
    const fullyStaffedShift = {
      ...mockShift,
      staffing_progress: {
        assigned: 1,
        required: 1,
        percentage: 100,
      },
      fully_staffed: true,
      assignments: [
        {
          id: 1,
          worker: {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
          },
          status: 'confirmed',
        },
      ],
    };

    render(<ShiftCard {...defaultProps} shift={fullyStaffedShift} />);
    
    expect(screen.queryByText('Assign Worker')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 1 filled (100%)')).toBeInTheDocument();
  });

  it('calls onAssignWorker when assign button is clicked', () => {
    render(<ShiftCard {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Assign Worker'));
    
    expect(defaultProps.onAssignWorker).toHaveBeenCalledWith(mockShift.id);
  });

  it('displays assigned workers correctly', () => {
    const shiftWithAssignments = {
      ...mockShift,
      staffing_progress: {
        assigned: 1,
        required: 1,
        percentage: 100,
      },
      assignments: [
        {
          id: 1,
          worker: {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
          },
          status: 'confirmed',
        },
      ],
    };

    render(<ShiftCard {...defaultProps} shift={shiftWithAssignments} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('calls onUnassignWorker when unassign button is clicked', () => {
    const shiftWithAssignments = {
      ...mockShift,
      assignments: [
        {
          id: 1,
          worker: {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
          },
          status: 'confirmed',
        },
      ],
    };

    render(<ShiftCard {...defaultProps} shift={shiftWithAssignments} />);
    
    fireEvent.click(screen.getByText('Unassign'));
    
    expect(defaultProps.onUnassignWorker).toHaveBeenCalledWith(1);
  });

  it('formats time correctly', () => {
    render(<ShiftCard {...defaultProps} />);
    
    // Check for formatted time display
    expect(screen.getByText(/10:00 AM/)).toBeInTheDocument();
    expect(screen.getByText(/2:00 PM/)).toBeInTheDocument();
  });

  it('shows correct staffing progress for multi-capacity shifts', () => {
    const multiCapacityShift = {
      ...mockShift,
      capacity: 3,
      staffing_progress: {
        assigned: 2,
        required: 3,
        percentage: 67,
      },
      assignments: [
        {
          id: 1,
          worker: { id: 1, first_name: 'John', last_name: 'Doe' },
          status: 'confirmed',
        },
        {
          id: 2,
          worker: { id: 2, first_name: 'Jane', last_name: 'Smith' },
          status: 'confirmed',
        },
      ],
    };

    render(<ShiftCard {...defaultProps} shift={multiCapacityShift} />);
    
    expect(screen.getByText('2 of 3 filled (67%)')).toBeInTheDocument();
    expect(screen.getByText('Assign Worker')).toBeInTheDocument();
  });

  it('handles shifts with no location gracefully', () => {
    const shiftWithoutLocation = {
      ...mockShift,
      location: null,
    };

    render(<ShiftCard {...defaultProps} shift={shiftWithoutLocation} />);
    
    expect(screen.getByText('123 Test St, Test City, FL 32301')).toBeInTheDocument();
  });

  it('handles shifts with no event gracefully', () => {
    const shiftWithoutEvent = {
      ...mockShift,
      event: null,
    };

    render(<ShiftCard {...defaultProps} shift={shiftWithoutEvent} />);
    
    expect(screen.getByText('Location not specified')).toBeInTheDocument();
  });
});
