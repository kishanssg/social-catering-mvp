import { useState, useEffect } from 'react';
import { X, Users, AlertTriangle, Check, Calendar, Clock, ChevronRight, DollarSign } from 'lucide-react';
import type { Shift } from '../services/shiftsApi';
import type { Worker } from '../services/workersApi';
import { apiService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import Toast from './Toast';
import { format, parseISO } from 'date-fns';

interface BulkAssignModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BulkAssignModal = ({ onClose, onSuccess }: BulkAssignModalProps) => {
  const [step, setStep] = useState<'select-worker' | 'select-shifts' | 'confirm'>('select-worker');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<{ shift: Shift; success: boolean; error?: string }[]>([]);
  const [searchWorker, setSearchWorker] = useState('');
  const [searchShift, setSearchShift] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [workerPayRates, setWorkerPayRates] = useState<{ [workerId: number]: number }>({});
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [workersRes, shiftsRes] = await Promise.all([
        apiService.getWorkers(),
        apiService.getShifts({ status: 'published' })
      ]);
      
      // Extract workers from the correct response structure
      const workersData = workersRes.data?.workers || [];
      setWorkers(workersData.filter((w: Worker) => w.active));
      
      // Extract shifts from the correct response structure
      const shiftsData = shiftsRes.data?.shifts || [];
      setShifts(shiftsData.filter((s: Shift) => {
        const assignedCount = s.assignments?.length || 0;
        return assignedCount < s.capacity && s.status === 'published';
      }));
      
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleWorkerSelect = (worker: Worker) => {
    setSelectedWorker(worker);
    setStep('select-shifts');
  };

  const setWorkerPayRate = (workerId: number, payRate: number) => {
    setWorkerPayRates(prev => ({ ...prev, [workerId]: payRate }));
  };
  
  const toggleShift = (shift: Shift) => {
    setSelectedShifts(prev => {
      const exists = prev.find(s => s.id === shift.id);
      if (exists) {
        return prev.filter(s => s.id !== shift.id);
      } else {
        return [...prev, shift];
      }
    });
  };
  
  const handleBulkAssign = async () => {
    if (!selectedWorker || selectedShifts.length === 0) return;
    
    setAssigning(true);
    setError('');
    const assignResults = [];
    
    for (const shift of selectedShifts) {
      try {
        const payRate = workerPayRates[selectedWorker.id] || shift.pay_rate;
        await apiService.createAssignment({
          shift_id: shift.id,
          worker_id: selectedWorker.id,
          hourly_rate: payRate
        });
        assignResults.push({ shift, success: true });
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to assign';
        assignResults.push({ shift, success: false, error: errorMessage });
      }
    }
    
    setResults(assignResults);
    setAssigning(false);
    setStep('confirm');
  };
  
  const handleComplete = () => {
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount > 0) {
      setToast({ 
        message: `Successfully assigned ${selectedWorker?.first_name} to ${successCount} of ${totalCount} shifts!`, 
        type: 'success' 
      });
    }
    
    onSuccess();
    onClose();
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'EEE, MMM d, yyyy');
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
  
  // Filter workers by search
  const filteredWorkers = workers.filter(w => {
    if (!searchWorker.trim()) return true;
    
    const search = searchWorker.toLowerCase().trim();
    const firstName = (w.first_name || '').toLowerCase();
    const lastName = (w.last_name || '').toLowerCase();
    const email = (w.email || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`;
    
    return (
      firstName.includes(search) ||
      lastName.includes(search) ||
      fullName.includes(search) ||
      email.includes(search)
    );
  });
  
  // Filter shifts by search
  const filteredShifts = shifts.filter(s => {
    if (!searchShift.trim()) return true;
    
    const search = searchShift.toLowerCase().trim();
    const clientName = (s.client_name || '').toLowerCase();
    const roleNeeded = (s.role_needed || '').toLowerCase();
    
    return (
      clientName.includes(search) ||
      roleNeeded.includes(search)
    );
  });
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Assign Worker</h2>
            <p className="text-sm text-gray-500 mt-1">
              Assign one worker to multiple shifts at once
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-center gap-4">
            {/* Step 1 */}
            <div className={`flex items-center gap-2 ${
              step === 'select-worker' ? 'text-blue-600' : 
              step === 'select-shifts' || step === 'confirm' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                step === 'select-worker' ? 'bg-blue-600 text-white' :
                step === 'select-shifts' || step === 'confirm' ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                {step === 'select-shifts' || step === 'confirm' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  '1'
                )}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Select Worker</span>
            </div>
            
            <ChevronRight className="h-5 w-5 text-gray-400" />
            
            {/* Step 2 */}
            <div className={`flex items-center gap-2 ${
              step === 'select-shifts' ? 'text-blue-600' : 
              step === 'confirm' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                step === 'select-shifts' ? 'bg-blue-600 text-white' :
                step === 'confirm' ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                {step === 'confirm' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  '2'
                )}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Select Shifts</span>
            </div>
            
            <ChevronRight className="h-5 w-5 text-gray-400" />
            
            {/* Step 3 */}
            <div className={`flex items-center gap-2 ${
              step === 'confirm' ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                step === 'confirm' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="text-sm font-medium hidden sm:inline">Confirm</span>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
                  {loading ? (
                    <LoadingSpinner message="Loading workers and shifts..." />
                  ) : error ? (
                    <ErrorMessage message={error} onRetry={loadData} />
                  ) : step === 'select-worker' ? (
            // STEP 1: Select Worker
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Select the worker you want to assign to multiple shifts:
              </p>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search workers..."
                value={searchWorker}
                onChange={(e) => setSearchWorker(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {/* Workers List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredWorkers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No workers found
                  </div>
                ) : (
                  filteredWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      className="w-full p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-medium">
                            {worker.first_name[0]}{worker.last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {worker.first_name} {worker.last_name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">{worker.email}</div>
                          {worker.skills_json && worker.skills_json.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {worker.skills_json.slice(0, 3).map(skill => (
                                <span key={skill} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  {skill}
                                </span>
                              ))}
                              {worker.skills_json.length > 3 && (
                                <span className="px-2 py-0.5 text-xs text-gray-500">
                                  +{worker.skills_json.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Pay Rate Input and Select Button */}
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <input
                              type="number"
                              step="1"
                              min="0"
                              placeholder="Rate"
                              value={workerPayRates[worker.id] || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers, decimal point, and empty string
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  setWorkerPayRate(worker.id, parseFloat(value) || 0);
                                }
                              }}
                              className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              onMouseDown={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                            />
                            <span className="text-sm text-gray-600">/hr</span>
                          </div>
                          
                          <button
                            onClick={() => handleWorkerSelect(worker)}
                            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : step === 'select-shifts' ? (
            // STEP 2: Select Shifts
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Select shifts to assign <strong>{selectedWorker?.first_name} {selectedWorker?.last_name}</strong>:
                </p>
                <div className="text-sm font-medium text-blue-600">
                  {selectedShifts.length} selected
                </div>
              </div>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search shifts..."
                value={searchShift}
                onChange={(e) => setSearchShift(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {/* Shifts List */}
              {filteredShifts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {searchShift ? 'No shifts match your search' : 'No shifts available for assignment'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredShifts.map((shift) => {
                    const isSelected = selectedShifts.some(s => s.id === shift.id);
                    const assignedCount = shift.assignments?.length || 0;
                    
                    return (
                      <label
                        key={shift.id}
                        className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleShift(shift)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{shift.client_name}</div>
                            <div className="text-sm text-gray-600 mt-1">{shift.role_needed}</div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(shift.start_time_utc)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                ${shift.pay_rate || 0}/hr
                              </div>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                {assignedCount}/{shift.capacity} assigned
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // STEP 3: Results
            <div className="space-y-4">
              {assigning ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Assigning worker to shifts...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    This may take a moment
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-blue-900 mb-1">
                      Assignment Results
                    </h3>
                    <p className="text-sm text-blue-700">
                      {selectedWorker?.first_name} {selectedWorker?.last_name} was assigned to {results.filter(r => r.success).length} of {results.length} shifts
                    </p>
                  </div>
                  
                  {/* Results List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          result.success 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {result.success ? (
                            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">
                              {result.shift.client_name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {result.shift.role_needed} • {formatDate(result.shift.start_time_utc)}
                            </div>
                            {result.error && (
                              <div className="text-sm text-red-700 mt-2 flex items-start gap-1">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>{result.error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="pt-4 border-t mt-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {results.filter(r => r.success).length}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Successful
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {results.filter(r => !r.success).length}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Failed
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          {step === 'select-worker' ? (
            <>
              <div className="text-sm text-gray-500">
                Step 1 of 3
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white"
              >
                Cancel
              </button>
            </>
          ) : step === 'select-shifts' ? (
            <>
              <button
                onClick={() => {
                  setStep('select-worker');
                  setSelectedShifts([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white"
              >
                ← Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={selectedShifts.length === 0 || assigning}
                  className="btn-green disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {assigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      Assign to {selectedShifts.length} {selectedShifts.length === 1 ? 'Shift' : 'Shifts'}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-500">
                Assignment complete
              </div>
              <button
                onClick={handleComplete}
                className="btn-green"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default BulkAssignModal;
