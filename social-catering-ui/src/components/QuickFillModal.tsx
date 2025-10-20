import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiClient } from '../lib/api';

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
  onClose: () => void;
  onDone: (summary: { assigned: number; conflicts: number }) => void;
}

export function QuickFillModal({ isOpen, eventId, roleName, unfilledShiftIds, onClose, onDone }: QuickFillModalProps) {
  const [workers, setWorkers] = useState<WorkerLite[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/workers?active=true');
        const list = res.data?.data?.workers || res.data?.data || [];
        // Only show workers with the roleName in skills
        const filtered = list.filter((w: any) => (w.skills_json || []).includes(roleName));
        setWorkers(filtered);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, roleName]);

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
    try {
      // Round-robin through selected workers against ordered unfilled shifts
      const selectedWorkers = selected.map((id) => workers.find((w) => w.id === id)).filter(Boolean) as WorkerLite[];
      const shifts = [...unfilledShiftIds];
      let wi = 0;
      while (shifts.length > 0 && selectedWorkers.length > 0) {
        const worker = selectedWorkers[wi % selectedWorkers.length];
        const shiftId = shifts.shift()!;
        try {
          const res = await apiClient.post('/staffing', {
            assignment: {
              shift_id: shiftId,
              worker_id: worker.id,
              status: 'assigned',
              assigned_at_utc: new Date().toISOString(),
            },
          });
          if (res.data?.status === 'success') {
            assigned += 1;
          } else {
            conflicts += 1;
          }
        } catch (e) {
          conflicts += 1; // treat as conflict/failed
        }
        wi += 1;
      }
      onDone({ assigned, conflicts });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Quick Fill — {roleName}</h3>
            <p className="text-sm text-gray-500">Unfilled shifts: {neededCount}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
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
                          <div className="text-xs text-gray-600">{(w.skills_json || []).slice(0,3).join(', ')}</div>
                        </div>
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
              Will assign <strong>{Math.min(selected.length, neededCount)}</strong> worker{Math.min(selected.length, neededCount) !== 1 ? 's' : ''} to {neededCount} shift{neededCount !== 1 ? 's' : ''}.
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertTriangle size={14} className="text-yellow-600" />
            Conflicts and already-filled shifts will be skipped automatically.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Cancel</button>
          <button
            onClick={assignRoundRobin}
            disabled={submitting || selected.length === 0 || neededCount === 0}
            className="px-5 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Assigning…' : `Assign to ${neededCount} shifts`}
          </button>
        </div>
      </div>
    </div>
  );
}


