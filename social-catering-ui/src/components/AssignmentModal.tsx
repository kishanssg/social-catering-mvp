import React, { useState, useEffect } from 'react';
import { X, Search, Users, Clock, MapPin, AlertCircle, Check } from 'lucide-react';
import { formatDateTime, formatTime } from '../utils/dateUtils';
import { apiClient } from '../lib/api';

interface Worker {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  skills: string[];
  certifications: string[];
  availability_status: string;
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
}

interface AssignmentModalProps {
  shiftId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignmentModal({ shiftId, onClose, onSuccess }: AssignmentModalProps) {
  const [shift, setShift] = useState<Shift | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await apiClient.get('/workers?active=true');
      
      if (response.data.status === 'success') {
        const allWorkers = response.data.data.workers || response.data.data;
        
        // Filter workers by required skill if shift has one
        if (shift?.role_needed) {
          const filteredWorkers = allWorkers.filter(worker => 
            worker.skills_json?.includes(shift.role_needed)
          );
          setWorkers(filteredWorkers);
        } else {
          setWorkers(allWorkers);
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
        errorMessage += '\n\nDetails:\n• ' + error.response.data.details.join('\n• ');
      } else if (error.response?.data?.errors) {
        errorMessage += '\n\nDetails:\n• ' + error.response.data.errors.join('\n• ');
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Assign Worker</h3>
            {shift && (
              <p className="text-sm text-gray-600 mt-1">
                {shift.client_name} • {shift.role_needed}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

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
                        <span className="font-medium">Pay Rate:</span> ${shift.pay_rate}/hour
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
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search workers by name, email, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Workers List */}
            <div className="flex-1 overflow-y-auto p-6">
              {error ? (
                <div className="text-center py-8">
                  <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-red-600">
                    {error.split('\n').map((line, index) => (
                      <p key={index} className={line.startsWith('•') ? 'ml-2' : ''}>
                        {line}
                      </p>
                    ))}
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
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <ul>
                    {filteredWorkers.map((worker) => {
                      const isSelected = selectedWorker?.id === worker.id;
                      return (
                        <li
                          key={worker.id}
                          className={`flex items-center justify-between px-4 py-3 border-b last:border-b-0 ${isSelected ? 'bg-teal-50' : 'bg-white'} cursor-pointer`}
                          onClick={() => setSelectedWorker(worker)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-semibold">
                              {worker.first_name[0]}{worker.last_name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{worker.first_name} {worker.last_name}</div>
                              <div className="text-xs text-gray-600">{worker.skills_json?.slice(0,3).join(', ')}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white">
                              <Check size={14} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-red-600">
                    {error.split('\n').map((line, index) => (
                      <p key={index} className={line.startsWith('•') ? 'ml-2' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignWorker}
                  disabled={!selectedWorker || assigning}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? 'Assigning...' : 'Assign Worker'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
