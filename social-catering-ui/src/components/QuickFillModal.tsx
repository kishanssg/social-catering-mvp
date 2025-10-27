import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Modal } from './common/Modal';

interface WorkerLite {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  skills_json?: string[];
}

interface QuickFillModalProps {
  isOpen: boolean;
  eventId: number;
  roleName: string;
  unfilledShiftIds: number[]; // ordered by earliest-first
  defaultPayRate?: number;
  onClose: () => void;
  onDone: (summary: { assigned: number; conflicts: number; details?: string }) => void;
}

export function QuickFillModal({ isOpen, eventId, roleName, unfilledShiftIds, defaultPayRate, onClose, onDone }: QuickFillModalProps) {
  const [workers, setWorkers] = useState<WorkerLite[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workerPayRates, setWorkerPayRates] = useState<{ [workerId: number]: number }>({});
  const [currentDefaultPayRate, setCurrentDefaultPayRate] = useState<number>(0);

  const setWorkerPayRate = (workerId: number, payRate: number) => {
    setWorkerPayRates(prev => ({ ...prev, [workerId]: payRate }));
  };

  useEffect(() => {
    if (!isOpen) return;
    
    // Reset state when modal opens
    setWorkers([]);
    setSelected([]);
    setSearch('');
    setWorkerPayRates({});
    setLoading(true);
    
    (async () => {
      try {
        // Fetch workers
        const res = await apiClient.get('/workers?active=true');
        const list = res.data?.data || res.data || [];
        // Only show workers with the roleName in skills
        const filtered = list.filter((w: any) => (w.skills_json || []).includes(roleName));
        console.log(`QuickFill: Found ${filtered.length} workers with skill "${roleName}"`);
        setWorkers(filtered);
        
        // Set default pay rate from prop
        if (defaultPayRate) {
          const numericRate = Number(defaultPayRate) || 0;
          setCurrentDefaultPayRate(numericRate);
          console.log(`QuickFill: Default pay rate for ${roleName}: $${numericRate}/hr`);
        } else {
          console.log(`QuickFill: No default pay rate provided for ${roleName}`);
        }
      } catch (error) {
        console.error('Error loading workers:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, roleName, defaultPayRate]);

  const eligibleWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = workers;
    if (!q) return pool;
    return pool.filter((w) =>
      `${w.first_name} ${w.last_name}`.toLowerCase().includes(q) ||
      (w.email || '').toLowerCase().includes(q)
    );
  }, [workers, search]);

  const neededCount = unfilledShiftIds.length;

  const toggle = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= neededCount) return prev; // cap selection to unfilled shifts
      return [...prev, id];
    });
  };

  const assignRoundRobin = async () => {
    if (selected.length === 0 || neededCount === 0) return;
    setSubmitting(true);
    let assigned = 0;
    let conflicts = 0;
    const failedDetails: string[] = [];
    
    try {
      // Round-robin through selected workers against ordered unfilled shifts
      const selectedWorkers = selected.map((id) => workers.find((w) => w.id === id)).filter(Boolean) as WorkerLite[];
      const shifts = [...unfilledShiftIds];
      let wi = 0;
      while (shifts.length > 0 && selectedWorkers.length > 0) {
        const worker = selectedWorkers[wi % selectedWorkers.length];
        const shiftId = shifts.shift()!;
        try {
          const payRate = workerPayRates[worker.id] || (Number(currentDefaultPayRate) || 0) || 0;
          const res = await apiClient.post('/staffing', {
            assignment: {
              shift_id: shiftId,
              worker_id: worker.id,
              status: 'assigned',
              assigned_at_utc: new Date().toISOString(),
              hourly_rate: payRate,
            },
          });
          if (res.data?.status === 'success') {
            assigned += 1;
          } else {
            conflicts += 1;
            const errorMsg = res.data?.message || 'Unknown error';
            failedDetails.push(`${worker.first_name} ${worker.last_name} (${errorMsg})`);
          }
        } catch (e: any) {
          conflicts += 1;
          const workerName = `${worker.first_name} ${worker.last_name}`;
          const errorMsg = e.response?.data?.message || e.message || 'Unknown error';
          failedDetails.push(`${workerName} (${errorMsg})`);
        }
        wi += 1;
      }
      
      // Build detailed message if there are conflicts
      let conflictMessage = '';
      if (conflicts > 0 && failedDetails.length > 0) {
        conflictMessage = failedDetails.join(', ');
      }
      
      onDone({ assigned, conflicts, details: conflictMessage });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const footerContent = (
    <div className="flex gap-2">
      <button onClick={onClose} disabled={submitting} className="btn-secondary">
        Cancel
      </button>
      <button
        onClick={assignRoundRobin}
        disabled={submitting || selected.length === 0 || neededCount === 0}
        className="btn-primary"
      >
        {submitting ? 'Filling Shifts...' : selected.length === 1 
          ? `Assign worker to ${neededCount} shift${neededCount !== 1 ? 's' : ''}` 
          : `Assign ${selected.length} workers to ${neededCount} shifts`}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quick Fill — ${roleName}`}
      subtitle={`Unfilled shifts: ${neededCount}`}
      size="lg"
      footer={footerContent}
    >
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search eligible workers…`}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Eligible list */}
          <div className="max-h-[340px] overflow-y-auto border border-gray-200 rounded-lg">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading…</div>
            ) : eligibleWorkers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No eligible workers</div>
            ) : (
              <ul>
                {eligibleWorkers.map((w) => {
                  const isSelected = selected.includes(w.id);
                  return (
                    <li key={w.id} className={`flex items-center justify-between px-4 py-3 border-b last:border-b-0 ${isSelected ? 'bg-teal-50' : 'bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-semibold">
                          {w.first_name[0]}{w.last_name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{w.first_name} {w.last_name}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(w.skills_json || []).map((skill, idx) => {
                              const isHighlighted = skill === roleName;
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
                        {workerPayRates[w.id] && workerPayRates[w.id] !== (Number(currentDefaultPayRate) || 0) && (
                          <span className="text-xs text-amber-600 font-medium">
                            Custom
                          </span>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            step="1"
                            min="0"
                            placeholder={(Number(currentDefaultPayRate) || 0) ? (Number(currentDefaultPayRate) || 0).toString() : "Rate"}
                            value={workerPayRates[w.id] || ((Number(currentDefaultPayRate) || 0) || '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Only allow numbers, decimal point, and empty string
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setWorkerPayRate(w.id, parseFloat(value) || 0);
                              }
                            }}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            onMouseDown={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs text-gray-600">/hr</span>
                        </div>
                        
                        <button
                          onClick={() => toggle(w.id)}
                          disabled={!isSelected && selected.length >= neededCount}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-600'
                              : selected.length >= neededCount
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
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

          {/* Preview line */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle size={16} className="text-teal-600" />
            <span>
              Will assign <strong>{selected.length}</strong> worker{selected.length !== 1 ? 's' : ''} to <strong>{neededCount}</strong> shift{neededCount !== 1 ? 's' : ''}.
            </span>
          </div>
          
          {/* Pay Rate Summary */}
          {(Number(currentDefaultPayRate) || 0) > 0 && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Default rate for {roleName}:</span>
                <span className="font-medium">${(Number(currentDefaultPayRate) || 0).toFixed(2)}/hr</span>
              </div>
              {Object.keys(workerPayRates).length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Empty fields will use default rate (${(Number(currentDefaultPayRate) || 0).toFixed(2)}/hr)
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertTriangle size={14} className="text-yellow-600" />
            Conflicts and already-filled shifts will be skipped automatically.
          </div>
    </Modal>
  );
}


