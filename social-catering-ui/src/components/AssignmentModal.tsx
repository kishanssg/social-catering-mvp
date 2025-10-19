import React, { useState, useEffect } from 'react';
import { X, Search, Users, Clock, MapPin, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
    loadAvailableWorkers();
  }, [shiftId]);

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
          worker.skills.some(skill => skill.toLowerCase().includes(query))
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
      const response = await apiClient.get('/workers');
      
      if (response.data.status === 'success') {
        setWorkers(response.data.data.workers || response.data.data);
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
        shift_id: shift.id,
        worker_id: selectedWorker.id,
        status: 'assigned',
        assigned_at_utc: new Date().toISOString(),
      });

      const data = response.data;

      if (data.status === 'success') {
        onSuccess();
      } else {
        setError(data.message || 'Failed to assign worker');
      }
    } catch (error) {
      console.error('Failed to assign worker:', error);
      setError('Failed to assign worker');
    } finally {
      setAssigning(false);
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch {
      return dateString;
    }
  };

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
                      <div className="text-sm text-gray-900">{shift.location}</div>
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
                          <span className="font-medium">Notes:</span> {shift.notes}
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
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {searchQuery ? 'No workers found matching your search' : 'No available workers'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedWorker?.id === worker.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedWorker(worker)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-teal-700">
                                {worker.first_name[0]}{worker.last_name[0]}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {worker.first_name} {worker.last_name}
                              </h4>
                              <p className="text-sm text-gray-600">{worker.email}</p>
                            </div>
                          </div>
                          
                          {worker.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {worker.skills.slice(0, 3).map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  {skill}
                                </span>
                              ))}
                              {worker.skills.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  +{worker.skills.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                          
                          {worker.phone && (
                            <p className="text-sm text-gray-600">{worker.phone}</p>
                          )}
                        </div>
                        
                        {selectedWorker?.id === worker.id && (
                          <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
                            <X size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
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
