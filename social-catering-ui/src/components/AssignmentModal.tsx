import React, { useState, useEffect } from 'react';
import { Search, Users, Clock, MapPin, AlertCircle, DollarSign } from 'lucide-react';
import { formatDateTime, formatTime } from '../utils/dateUtils';
import { apiClient } from '../lib/api';
import { Modal } from './common/Modal';

interface Worker {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  skills: string[];
  certifications: string[];
  availability_status: string;
  skills_json?: string[];
}

interface Shift {
  id: number;
  client_name: string;
  role_needed: string;
  location: string;
  start_time_utc: string;
  end_time_utc: string;
  pay_rate: number;
  required_skill?: string;
  uniform_name?: string;
  notes?: string;
  event_id?: number;
  event?: {
    venue?: {
      formatted_address?: string;
    };
  };
}

interface AssignmentModalProps {
  shiftId: number;
  suggestedPayRate?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignmentModal({ shiftId, suggestedPayRate, onClose, onSuccess }: AssignmentModalProps) {
  const [shift, setShift] = useState<Shift | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerPayRates, setWorkerPayRates] = useState<{ [workerId: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setWorkerPayRate = (workerId: number, payRate: number) => {
    setWorkerPayRates(prev => ({ ...prev, [workerId]: payRate }));
  };

  useEffect(() => {
    loadShiftDetails();
  }, [shiftId]);

  useEffect(() => {
    if (shift) {
      loadAvailableWorkers();
    }
  }, [shift]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredWorkers(workers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredWorkers(
        workers.filter(worker =>
          worker.first_name.toLowerCase().includes(query) ||
          worker.last_name.toLowerCase().includes(query) ||
          worker.email.toLowerCase().includes(query) ||
          worker.skills_json?.some(skill => skill.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, workers]);

  async function loadShiftDetails() {
    try {
      const response = await apiClient.get(`/shifts/${shiftId}`);
      
      if (response.data.status === 'success') {
        setShift(response.data.data);
        
        // If suggestedPayRate wasn't provided, try to get it from skill_requirement (SSOT)
        if (!suggestedPayRate && response.data.data.skill_requirement?.pay_rate) {
          // The pay_rate from skill_requirement is the SSOT, but we can't update the prop
          // So we'll use it in the defaultRate calculation below
        }
      } else {
        setError('Failed to load shift details');
      }
    } catch (error) {
      console.error('Failed to load shift details:', error);
      setError('Failed to load shift details');
    }
  }

  async function loadAvailableWorkers() {
    try {
      // First, get assigned worker IDs for this shift
      const assignedWorkerIds = new Set<number>();
      if (shift?.event_id) {
        try {
          const eventRes = await apiClient.get(`/events/${shift.event_id}`);
          const event = eventRes.data?.data || {};
          
          // Get all assigned workers for this specific role
          if (event.shifts_by_role) {
            const roleShifts = event.shifts_by_role.find((r: any) => 
              r.skill_name === shift.role_needed || r.role_name === shift.role_needed
            );
            if (roleShifts?.shifts) {
              roleShifts.shifts.forEach((s: any) => {
                if (s.assignments) {
                  s.assignments.forEach((assignment: any) => {
                    // Check for worker_id in multiple places (assignment.worker_id or assignment.worker.id)
                    const workerId = assignment.worker_id || assignment.worker?.id;
                    const status = assignment.status;
                    
                    if (workerId && status !== 'cancelled' && status !== 'no_show') {
                      assignedWorkerIds.add(workerId);
                    }
                  });
                }
              });
            }
          }
        } catch (e) {
          console.log('Could not fetch event to filter assigned workers:', e);
        }
      }
      
      console.log(`AssignmentModal: Found ${assignedWorkerIds.size} already assigned workers for "${shift?.role_needed}"`);
      
      const response = await apiClient.get('/workers?active=true');
      
      if (response.data.status === 'success') {
        const allWorkers = response.data.data.workers || response.data.data;
        
        // Filter workers by required skill if shift has one AND exclude already assigned workers
        if (shift?.role_needed) {
          const filteredWorkers = allWorkers.filter(worker => 
            worker.skills_json?.includes(shift.role_needed) &&
            !assignedWorkerIds.has(worker.id)
          );
          console.log(`AssignmentModal: Showing ${filteredWorkers.length} eligible workers`);
          setWorkers(filteredWorkers);
        } else {
          const filteredWorkers = allWorkers.filter(worker => !assignedWorkerIds.has(worker.id));
          setWorkers(filteredWorkers);
        }
      } else {
        setError('Failed to load workers');
      }
    } catch (error) {
      console.error('Failed to load workers:', error);
      setError('Failed to load workers');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignWorker() {
    if (!selectedWorker || !shift) return;

    setAssigning(true);
    setError(null);

    try {
      const response = await apiClient.post('/staffing', {
        assignment: {
          shift_id: shift.id,
          worker_id: selectedWorker.id,
          status: 'assigned',
          assigned_at_utc: new Date().toISOString(),
          hourly_rate: (selectedWorker.id in workerPayRates) 
            ? workerPayRates[selectedWorker.id] 
            : (suggestedPayRate || Number(shift.pay_rate) || 0),
        }
      });

      const data = response.data;

      if (data.status === 'success') {
        onSuccess();
      } else {
        // Display specific error messages from backend
        let errorMessage = data.message || 'Failed to assign worker';
        if (data.details && data.details.length > 0) {
          errorMessage += '\n\nDetails:\n• ' + data.details.join('\n• ');
        } else if (data.errors) {
          errorMessage += '\n\nDetails:\n• ' + data.errors.join('\n• ');
        }
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Failed to assign worker:', error);
      
      // Try to extract specific error message from axios error
      let errorMessage = 'Failed to assign worker';
      if (error.response?.data?.details && error.response.data.details.length > 0) {
        // Format conflict messages more clearly
        const conflictDetails = error.response.data.details.map(detail => {
          // Extract event name and time from conflict message if available
          if (detail.includes('conflicting shift')) {
            return detail;
          }
          return detail;
        });
        errorMessage += '\n\n' + conflictDetails.join('\n');
      } else if (error.response?.data?.errors) {
        errorMessage += '\n\n' + error.response.data.errors.join('\n');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setAssigning(false);
    }
  }


  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Assign Worker" size="lg">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </Modal>
    );
  }

  const footerContent = (
    <>
      {error && (
        <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-amber-50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <h4 className="text-sm font-semibold text-red-900">
              ⚠️ Scheduling Conflict Detected
            </h4>
          </div>
          <p className="text-xs text-gray-600 ml-8">
            Please resolve the conflict before attempting to assign this worker
          </p>
        </div>
      )}
      
      <div className="flex gap-2">
          <button
            onClick={onClose}
          disabled={assigning}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleAssignWorker}
          disabled={!selectedWorker || assigning || !!error}
          className={`btn-primary ${error ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={error ? 'Cannot assign due to scheduling conflict' : ''}
        >
          {assigning ? 'Assigning Worker...' : 'Assign Worker'}
          </button>
        </div>
    </>
  );

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={shift ? `${shift.client_name} • ${shift.role_needed}` : 'Assign Worker'}
      size="xl"
      footer={footerContent}
    >
        <div className="flex h-[600px]">
          {/* Left: Shift Details */}
          <div className="w-1/3 border-r border-gray-200 p-6 bg-gray-50">
            {shift ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Shift Details</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDateTime(shift.start_time_utc)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-900">
                        {shift.location || shift.event?.venue?.formatted_address || 'Location not specified'}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Users size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-900">{shift.role_needed}</div>
                        {shift.required_skill && (
                          <div className="text-sm text-gray-600">Requires: {shift.required_skill}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Pay Rate:</span> ${(
                          suggestedPayRate || 
                          (shift?.skill_requirement?.pay_rate != null ? Number(shift.skill_requirement.pay_rate) : null) || 
                          Number(shift.pay_rate) || 
                          0
                        ).toFixed(2)}/hour
                      </div>
                      {shift.uniform_name && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Uniform:</span> {shift.uniform_name}
                        </div>
                      )}
                    </div>
                    
                    {shift.notes && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Notes:</span>
                          <div className="mt-1 whitespace-pre-line">
                            {shift.notes.split('Uniform:').map((part, index) => {
                              if (index === 0) {
                                return part.trim();
                              } else {
                                return (
                                  <div key={index}>
                                    <br />
                                    <span className="font-medium">Uniform:</span> {part.trim()}
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Failed to load shift details</p>
              </div>
            )}
          </div>

          {/* Right: Worker Selection */}
          <div className="flex-1 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search workers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Workers List */}
            <div className="flex-1 overflow-y-auto">
              {error ? (
                <div className="p-6 flex items-center justify-center h-full">
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-5 shadow-sm w-full max-w-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertCircle size={20} className="text-red-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-red-900 mb-1">
                          ⚠️ Scheduling Conflict
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          This worker cannot be assigned due to a scheduling conflict
                        </p>
                        <div className="bg-white border border-red-200 rounded p-3 mt-3">
                          <div className="text-sm text-red-800 font-mono">
                            {error.split('\n').map((line, index) => {
                              if (line.trim() === '') return null;
                              if (line.startsWith('•')) {
                                return (
                                  <div key={index} className="mt-1 flex items-start gap-2">
                                    <span className="text-red-500">●</span>
                                    <span className="flex-1">{line.replace('•', '').trim()}</span>
                                  </div>
                                );
                              }
                              if (line.startsWith('Details:')) return null;
                              if (line.includes('conflicting shift')) {
                                return (
                                  <div key={index} className="mt-1 text-red-700 font-medium">
                                    {line}
                                  </div>
                                );
                              }
                              return (
                                <div key={index} className="text-gray-700">
                        {line}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {searchQuery 
                      ? 'No workers found matching your search' 
                      : shift?.role_needed 
                        ? `No workers found with "${shift.role_needed}" skill`
                        : 'No available workers'
                    }
                  </p>
                  {shift?.role_needed && !searchQuery && (
                    <p className="text-xs text-gray-500 mt-1">
                      Try adding "{shift.role_needed}" skill to workers or select a different shift.
                    </p>
                  )}
                </div>
              ) : (
                  <ul>
                    {filteredWorkers.map((worker) => {
                      const isSelected = selectedWorker?.id === worker.id;
                    // Priority: suggestedPayRate (from roleGroup) > skill_requirement.pay_rate (SSOT) > shift.pay_rate > 0
                    const skillRequirementPayRate = shift?.skill_requirement?.pay_rate;
                    const defaultRate = suggestedPayRate || (skillRequirementPayRate != null ? Number(skillRequirementPayRate) : null) || Number(shift.pay_rate) || 0;
                    // Check if worker has explicitly set a custom rate (key exists in workerPayRates)
                    const hasCustomRate = worker.id in workerPayRates;
                    const workerPayRate = hasCustomRate ? workerPayRates[worker.id] : defaultRate;
                    const isCustomRate = hasCustomRate && workerPayRates[worker.id] !== defaultRate;
                    
                      return (
                      <li key={worker.id} className={`flex items-center justify-between px-4 py-3 border-b last:border-b-0 ${isSelected ? 'bg-teal-50' : 'bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-semibold">
                              {worker.first_name[0]}{worker.last_name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{worker.first_name} {worker.last_name}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(worker.skills_json || []).map((skill, idx) => {
                                  const isHighlighted = skill === shift?.role_needed;
                                  return (
                                    <span
                                      key={idx}
                                      className={`px-2 py-0.5 text-xs rounded ${
                                        isHighlighted
                                          ? 'bg-teal-100 text-teal-700 font-medium'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {skill}
                                    </span>
                                  );
                                })}
                              </div>
                          </div>
                            </div>
                        
                        {/* Pay Rate Input */}
                        <div className="flex items-center gap-2">
                          {/* Visual indicator if custom rate */}
                          {isCustomRate && (
                            <span className="text-xs text-amber-600 font-medium">
                              Custom
                            </span>
                          )}
                          
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.50"
                              min="0"
                              placeholder={defaultRate > 0 ? defaultRate.toString() : "Rate"}
                              value={hasCustomRate ? (workerPayRates[worker.id] || '') : (defaultRate > 0 ? defaultRate.toString() : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers, decimal point, and empty string
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  const numValue = parseFloat(value);
                                  if (value === '' || isNaN(numValue)) {
                                    // Remove from workerPayRates if cleared (will use default)
                                    const newRates = { ...workerPayRates };
                                    delete newRates[worker.id];
                                    setWorkerPayRates(newRates);
                                  } else {
                                    setWorkerPayRate(worker.id, numValue);
                                  }
                                }
                              }}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              onMouseDown={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-gray-600">/hr</span>
                          </div>
                          
                          <button
                            onClick={() => setSelectedWorker(worker)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                              isSelected
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                        </li>
                      );
                    })}
                  </ul>
              )}
            </div>

        </div>
      </div>
    </Modal>
  );
}
