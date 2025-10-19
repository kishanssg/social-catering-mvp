import React, { useState } from 'react';
import { Clock, Save, X } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface BulkHoursModalProps {
  shift: any;
  onClose: () => void;
  onSave: () => void;
}

interface HoursEntry {
  assignmentId: number;
  workerId: number;
  workerName: string;
  hours: string;
  rate: string;
}

export function BulkHoursModal({ shift, onClose, onSave }: BulkHoursModalProps) {
  const defaultHours = shift.duration_hours.toString();
  const defaultRate = shift.pay_rate.toString();
  
  const [entries, setEntries] = useState<HoursEntry[]>(
    shift.assignments?.map((assignment: any) => ({
      assignmentId: assignment.id,
      workerId: assignment.worker.id,
      workerName: `${assignment.worker.first_name} ${assignment.worker.last_name}`,
      hours: assignment.hours_worked?.toString() || defaultHours,
      rate: assignment.hourly_rate?.toString() || defaultRate
    })) || []
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  const handleHoursChange = (assignmentId: number, value: string) => {
    if (applyToAll) {
      setEntries(entries.map(e => ({ ...e, hours: value })));
    } else {
      setEntries(entries.map(e => 
        e.assignmentId === assignmentId ? { ...e, hours: value } : e
      ));
    }
  };

  const handleRateChange = (assignmentId: number, value: string) => {
    if (applyToAll) {
      setEntries(entries.map(e => ({ ...e, rate: value })));
    } else {
      setEntries(entries.map(e => 
        e.assignmentId === assignmentId ? { ...e, rate: value } : e
      ));
    }
  };

  const calculateTotal = () => {
    return entries.reduce((sum, entry) => {
      const hours = parseFloat(entry.hours) || 0;
      const rate = parseFloat(entry.rate) || 0;
      return sum + (hours * rate);
    }, 0).toFixed(2);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Update each assignment
      const updates = entries.map(entry => 
        api.updateAssignment(entry.assignmentId, {
          hours_worked: parseFloat(entry.hours),
          hourly_rate: parseFloat(entry.rate),
          status: 'completed'
        })
      );
      
      await Promise.all(updates);
      
      toast.success('Hours updated successfully');
      onSave();
    } catch (error) {
      console.error('Failed to update hours:', error);
      toast.error('Failed to update hours');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Enter Hours Worked</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Shift Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-sm">
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
              </div>
            </div>

            {/* Apply to All Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium">
                  Apply same hours and rate to all workers
                </span>
              </label>
            </div>

            {/* Hours Entry Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Worker
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hours Worked
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hourly Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => {
                    const total = (parseFloat(entry.hours) || 0) * (parseFloat(entry.rate) || 0);
                    return (
                      <tr key={entry.assignmentId}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.workerName}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="24"
                            value={entry.hours}
                            onChange={(e) => handleHoursChange(entry.assignmentId, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="mr-1">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={entry.rate}
                              onChange={(e) => handleRateChange(entry.assignmentId, e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-green-600">
                            ${total.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-lg font-bold text-green-600">
                        ${calculateTotal()}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || entries.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Hours'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
