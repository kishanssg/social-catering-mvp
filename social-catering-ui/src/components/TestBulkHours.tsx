import React, { useState } from 'react';
import { BulkHoursModal } from './Assignments/BulkHoursModal';

// Mock shift data for testing
const mockShift = {
  id: 1,
  client_name: 'Wedding Reception',
  start_time_utc: '2025-10-15T16:00:00Z',
  duration_hours: 6,
  pay_rate: 25,
  assignments: [
    {
      id: 1,
      worker: {
        id: 1,
        first_name: 'Alice',
        last_name: 'Smith'
      },
      hours_worked: null,
      hourly_rate: null,
      status: 'assigned'
    },
    {
      id: 2,
      worker: {
        id: 2,
        first_name: 'Bob',
        last_name: 'Johnson'
      },
      hours_worked: 5.5,
      hourly_rate: 25,
      status: 'assigned'
    },
    {
      id: 3,
      worker: {
        id: 3,
        first_name: 'Charlie',
        last_name: 'Brown'
      },
      hours_worked: null,
      hourly_rate: null,
      status: 'assigned'
    },
    {
      id: 4,
      worker: {
        id: 4,
        first_name: 'Diana',
        last_name: 'Prince'
      },
      hours_worked: 6,
      hourly_rate: 30,
      status: 'assigned'
    }
  ]
};

export default function TestBulkHours() {
  const [modalOpen, setModalOpen] = useState(false);
  const [shift, setShift] = useState(mockShift);

  const handleSave = () => {
    console.log('Hours saved successfully!');
    setModalOpen(false);
    // In a real app, this would refetch the shift data
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Test Bulk Hours Entry</h1>
        <p className="text-gray-600 mt-2">Test the bulk hours entry functionality</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shift Info */}
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Shift Details</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">Client:</span>
                <p className="font-medium">{shift.client_name}</p>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <p className="font-medium">
                  {new Date(shift.start_time_utc).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Scheduled Hours:</span>
                <p className="font-medium">{shift.duration_hours} hours</p>
              </div>
              <div>
                <span className="text-gray-600">Base Rate:</span>
                <p className="font-medium">${shift.pay_rate}/hour</p>
              </div>
            </div>
          </div>

          {/* Current Assignments */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Current Assignments</h3>
            <div className="space-y-3">
              {shift.assignments.map((assignment: any) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {assignment.worker.first_name} {assignment.worker.last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {assignment.hours_worked 
                        ? `${assignment.hours_worked}h @ $${assignment.hourly_rate}/hr = $${(assignment.hours_worked * assignment.hourly_rate).toFixed(2)}`
                        : 'No hours entered'
                      }
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                    {assignment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Test Controls</h3>
            <div className="space-y-4">
              <button
                onClick={() => setModalOpen(true)}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Open Bulk Hours Modal
              </button>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Features to test:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Individual hours entry for each worker</li>
                  <li>"Apply to all" checkbox functionality</li>
                  <li>Real-time total calculation</li>
                  <li>Input validation (min/max values)</li>
                  <li>Save functionality (updates all assignments)</li>
                  <li>Modal close/cancel behavior</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Mock Data Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Mock Data</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Alice Smith: No hours entered (will default to 6h @ $25/hr)</p>
              <p>• Bob Johnson: 5.5h @ $25/hr = $137.50</p>
              <p>• Charlie Brown: No hours entered (will default to 6h @ $25/hr)</p>
              <p>• Diana Prince: 6h @ $30/hr = $180.00</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Hours Modal */}
      {modalOpen && (
        <BulkHoursModal
          shift={shift}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

