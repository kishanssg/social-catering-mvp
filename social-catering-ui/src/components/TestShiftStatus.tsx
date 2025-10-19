import React, { useState } from 'react';
import { ShiftStatusManager } from './Shifts/ShiftStatusManager';

// Mock shift data for testing
const mockShifts = [
  {
    id: 1,
    client_name: 'Wedding Reception',
    status: 'draft',
    assigned_count: 0,
    capacity: 4,
    available_slots: 4,
    start_time_utc: '2025-10-15T16:00:00Z',
    end_time_utc: '2025-10-15T22:00:00Z'
  },
  {
    id: 2,
    client_name: 'Corporate Lunch',
    status: 'published',
    assigned_count: 2,
    capacity: 4,
    available_slots: 2,
    start_time_utc: '2025-10-16T11:00:00Z',
    end_time_utc: '2025-10-16T15:00:00Z'
  },
  {
    id: 3,
    client_name: 'Birthday Party',
    status: 'published',
    assigned_count: 3,
    capacity: 3,
    available_slots: 0,
    start_time_utc: '2025-10-17T14:00:00Z',
    end_time_utc: '2025-10-17T18:00:00Z'
  },
  {
    id: 4,
    client_name: 'Charity Event',
    status: 'assigned',
    assigned_count: 5,
    capacity: 5,
    available_slots: 0,
    start_time_utc: '2025-10-10T10:00:00Z', // Past date
    end_time_utc: '2025-10-10T14:00:00Z'
  },
  {
    id: 5,
    client_name: 'Gala Dinner',
    status: 'completed',
    assigned_count: 6,
    capacity: 6,
    available_slots: 0,
    start_time_utc: '2025-10-05T18:00:00Z',
    end_time_utc: '2025-10-05T23:00:00Z'
  }
];

export default function TestShiftStatus() {
  const [shifts, setShifts] = useState(mockShifts);
  const [selectedShift, setSelectedShift] = useState(mockShifts[0]);

  const handleStatusChange = () => {
    // In a real app, this would refetch the shift data
    console.log('Status changed, refetching data...');
    // For demo purposes, we'll just log it
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Test Shift Status Workflow</h1>
        <p className="text-gray-600 mt-2">Test the shift status management functionality</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shift List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Shifts</h2>
          <div className="space-y-3">
            {shifts.map(shift => (
              <div
                key={shift.id}
                onClick={() => setSelectedShift(shift)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedShift.id === shift.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{shift.client_name}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(shift.start_time_utc).toLocaleDateString()} - 
                      {new Date(shift.start_time_utc).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    <p className="text-sm text-gray-600">
                      Staffing: {shift.assigned_count}/{shift.capacity}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shift.status)}`}>
                    {shift.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Manager */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Status Manager</h2>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{selectedShift.client_name}</h3>
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedShift.status)}`}>
                  {selectedShift.status}
                </span>
                <span className="text-sm text-gray-600">
                  {selectedShift.assigned_count}/{selectedShift.capacity} staffed
                </span>
              </div>
              
              <ShiftStatusManager 
                shift={selectedShift} 
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>

          {/* Status Workflow Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Status Workflow</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span><strong>Draft</strong> → Can be published or archived</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span><strong>Published</strong> → Can be marked assigned (when fully staffed), completed, or archived</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span><strong>Assigned</strong> → Can be marked completed (after end time) or archived</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span><strong>Completed</strong> → Can only be archived</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span><strong>Archived</strong> → No further actions available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

