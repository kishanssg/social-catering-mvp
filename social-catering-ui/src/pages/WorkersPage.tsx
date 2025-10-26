import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Filter,
  Mail,
  Phone,
  User,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  X,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { Toast } from '../components/common/Toast';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Worker {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  active: boolean;
  skills_json: string[];
  certifications?: Array<{
    id: number;
    name: string;
    expires_at_utc?: string;
  }>;
}

interface AvailableShift {
  id: number;
  event: {
    id: number;
    title: string;
  };
  role_needed: string;
  start_time_utc: string;
  end_time_utc: string;
  location: string;
  current_status: string;
  pay_rate?: number; // Add pay_rate field
  total_positions?: number;
  filled_positions?: number;
  available_positions?: number;
  all_shift_ids?: number[]; // All shift IDs for this role at this event
}

export function WorkersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'status'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Bulk assignment state
  const [bulkAssignModal, setBulkAssignModal] = useState<{
    isOpen: boolean;
    worker?: Worker;
  }>({ isOpen: false });
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    worker?: Worker;
  }>({ isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ isVisible: false, message: '', type: 'success' });
  
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadWorkers();
    }
  }, [isAuthenticated, authLoading]);

  // Refresh workers when navigating back to this page (e.g., after creating a worker)
  useEffect(() => {
    if (isAuthenticated && !authLoading && location.pathname === '/workers') {
      loadWorkers();
    }
  }, [location.pathname, isAuthenticated, authLoading]);
  
  async function loadWorkers() {
    setLoading(true);
    try {
      const response = await apiClient.get('/workers');
      
      if (response.data.status === 'success') {
        const workersData = response.data.data || [];
        setWorkers(workersData);
      } else {
        setWorkers([]);
      }
    } catch (error) {
      console.error('Failed to load workers:', error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }
  
  const handleDeleteClick = (worker: Worker) => {
    setDeleteModal({ isOpen: true, worker });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.worker) return;
    
    setIsDeleting(true);
    try {
      const response = await apiClient.delete(`/workers/${deleteModal.worker?.id}`);
      
      if (response.data.status === 'success') {
        setToast({
          isVisible: true,
          message: `${deleteModal.worker.first_name || 'Unknown'} ${deleteModal.worker.last_name || 'Worker'} has been deleted successfully`,
          type: 'success'
        });
        loadWorkers();
        setDeleteModal({ isOpen: false });
      }
    } catch (error) {
      console.error('Failed to delete worker:', error);
      setToast({
        isVisible: true,
        message: 'Failed to delete worker. Please try again.',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false });
  };
  
  const openBulkAssignModal = (worker: Worker) => {
    setBulkAssignModal({ isOpen: true, worker });
    setConflicts([]); // Clear any previous conflicts
    setError(null); // Clear any previous errors
  };
  
  const closeBulkAssignModal = () => {
    setBulkAssignModal({ isOpen: false });
  };
  
  const handleBulkAssignSuccess = (message?: string) => {
    closeBulkAssignModal();
    setToast({
      isVisible: true,
      message: message || 'Worker scheduled successfully',
      type: 'success'
    });
    loadWorkers();
  };
  
  // Filter and sort workers
  const filteredWorkers = workers
    .filter(worker => {
      if (filterStatus === 'active' && !worker.active) return false;
      if (filterStatus === 'inactive' && worker.active) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (worker.first_name || '').toLowerCase().includes(query) ||
          (worker.last_name || '').toLowerCase().includes(query) ||
          (worker.email || '').toLowerCase().includes(query) ||
          (worker.phone || '').includes(query) ||
          // Search by skills
          (worker.skills_json || []).some(skill => 
            (skill || '').toLowerCase().includes(query)
          ) ||
          // Search by certifications
          (worker.certifications || []).some(cert => 
            (cert?.name || '').toLowerCase().includes(query)
          )
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`);
        case 'email':
          return (a.email || '').localeCompare(b.email || '');
        case 'status':
          return (b.active ? 1 : 0) - (a.active ? 1 : 0);
        default:
          return 0;
      }
    });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please log in to view workers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Workers</h1>
            <p className="text-gray-600 mt-1">Manage your workforce</p>
          </div>
          
          <button
            onClick={() => navigate('/workers/create')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            Add New Worker
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search workers by name, email, phone, skills, or certifications"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="status">Sort by Status</option>
          </select>
          
          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'all'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'inactive'
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Workers Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="text-center py-12">
            <User size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No workers found' : 'No workers yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Try adjusting your search or filters'
                : 'Add your first worker to get started'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/workers/create')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus size={20} />
                Add Worker
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Worker Name
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Phone Number
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Email Address
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Status
                  </th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredWorkers.map((worker) => (
                  <tr 
                    key={worker.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/workers/${worker.id}`)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                          {(worker.first_name || 'U')[0]}{(worker.last_name || 'W')[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {worker.first_name || 'Unknown'} {worker.last_name || 'Worker'}
                          </p>
                          {worker.skills_json && worker.skills_json.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {worker.skills_json.slice(0, 3).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                >
                                  {skill}
                                </span>
                              ))}
                              {worker.skills_json.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  +{worker.skills_json.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {worker.phone || '—'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {worker.email}
                    </td>
                    <td className="py-4 px-6">
                      {worker.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <CheckCircle size={14} />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          <XCircle size={14} />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 🆕 NEW: Bulk Schedule Button */}
                        {worker.active && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openBulkAssignModal(worker);
                            }}
                            className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            title="Schedule Worker"
                          >
                            <Calendar size={14} className="inline mr-1" />
                            Schedule
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/workers/${worker.id}/edit`);
                          }}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteClick(worker);
                          }}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* 🆕 Bulk Assignment Modal */}
      {bulkAssignModal.isOpen && bulkAssignModal.worker && (
        <BulkAssignmentModal
          worker={bulkAssignModal.worker}
          onClose={closeBulkAssignModal}
          onSuccess={handleBulkAssignSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Worker"
        message="Are you sure you want to delete this worker?"
        confirmText="Delete Worker"
        cancelText="Cancel"
        isLoading={isDeleting}
        isDestructive={true}
        workerName={deleteModal.worker ? `${deleteModal.worker.first_name || 'Unknown'} ${deleteModal.worker.last_name || 'Worker'}` : undefined}
      />

      {/* Toast Notifications */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

// Bulk Assignment Modal Component
interface BulkAssignmentModalProps {
  worker: Worker;
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

function BulkAssignmentModal({ worker, onClose, onSuccess }: BulkAssignmentModalProps) {
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [shiftPayRates, setShiftPayRates] = useState<{ [shiftId: number]: number }>({});
  const [invalidShifts, setInvalidShifts] = useState<Set<number>>(new Set());
  const [shiftValidationReasons, setShiftValidationReasons] = useState<{ [shiftId: number]: string[] }>({});
  
  useEffect(() => {
    if (worker && worker.id) {
      loadAvailableShifts();
    }
  }, [worker?.id]);
  
  // CRITICAL FIX (Issue #1): Pre-validate shifts when they load
  useEffect(() => {
    if (worker && worker.id && availableShifts.length > 0) {
      validateShifts();
    }
  }, [worker?.id, availableShifts]);
  
  async function loadAvailableShifts() {
    if (!worker || !worker.id) {
      return;
    }
    
    setLoading(true);
    try {
      // Get upcoming published events with unfilled shifts
      const response = await apiClient.get('/events', {
        params: {
          tab: 'active',
          filter: 'needs_workers'
        }
      });
      
      if (response.data.status === 'success') {
        const events = response.data.data;
        
        // Group shifts by role per event - show only one entry per role per event
        const shifts: AvailableShift[] = [];
        events.forEach((event: any) => {
          if (event && event.shifts_by_role) {
            // Create event object once per event to ensure consistency
            const eventData = {
              id: event.id,
              title: event.title || 'Untitled Event'
            };
            
            event.shifts_by_role.forEach((roleGroup: any) => {
              // Only include roles that match worker's skills and aren't fully staffed
              if (
                roleGroup &&
                worker.skills_json && 
                worker.skills_json.includes(roleGroup.role_name) &&
                roleGroup.filled_shifts < roleGroup.total_shifts
              ) {
                // Filter to only include shifts with available capacity
                const availableShifts = (roleGroup.shifts || []).filter((s: any) => {
                  const filled = s.filled_positions || 0;
                  return s.capacity > filled;
                });
                
                if (availableShifts.length === 0) {
                  return; // Skip this role if no shifts have available capacity
                }
                
                // Use the first available shift as representative
                const representativeShift = availableShifts[0];
                if (representativeShift) {
                  const allShiftIds = availableShifts.map((s: any) => s.id);
                  const shiftData = {
                    id: representativeShift.id,
                    event: eventData,
                    role_needed: roleGroup.role_name,
                    start_time_utc: representativeShift.start_time_utc,
                    end_time_utc: representativeShift.end_time_utc,
                    location: event.venue?.formatted_address || 'Location TBD',
                    current_status: representativeShift.status,
                    pay_rate: representativeShift.pay_rate, // Add pay_rate
                    // Add metadata about positions
                    total_positions: roleGroup.total_shifts,
                    filled_positions: roleGroup.filled_shifts,
                    available_positions: availableShifts.reduce((sum, s) => sum + (s.capacity - (s.filled_positions || 0)), 0),
                    all_shift_ids: allShiftIds
                  };
                  shifts.push(shiftData);
                }
              }
            });
          }
        });
        
        setAvailableShifts(shifts);
      }
    } catch (error) {
      console.error('Failed to load available shifts:', error);
      setError('Failed to load available shifts');
    } finally {
      setLoading(false);
    }
  }
  
  // CRITICAL FIX (Issue #1): Pre-validate shifts to show conflicts before submission
  async function validateShifts() {
    if (!worker || !worker.id) return;
    
    try {
      // Get all shift IDs from available shifts
      const allShiftIds: number[] = [];
      availableShifts.forEach(shift => {
        if (shift.all_shift_ids) {
          allShiftIds.push(...shift.all_shift_ids);
        }
      });
      
      if (allShiftIds.length === 0) return;
      
      const response = await apiClient.post('/staffing/validate_bulk', {
        worker_id: worker.id,
        shift_ids: allShiftIds
      });
      
      if (response.data.status === 'success') {
        const { invalid_shifts } = response.data.data;
        
        // Build invalid shifts set and reasons
        const invalidSet = new Set<number>();
        const reasonsMap: { [shiftId: number]: string[] } = {};
        
        invalid_shifts.forEach((invalid: any) => {
          // Map the invalid shift_id to the representative shift ID
          const representativeShift = availableShifts.find(s => 
            s.all_shift_ids?.includes(invalid.shift_id)
          );
          
          if (representativeShift) {
            invalidSet.add(representativeShift.id);
            reasonsMap[representativeShift.id] = invalid.errors.map((e: any) => e.message);
          }
        });
        
        setInvalidShifts(invalidSet);
        setShiftValidationReasons(reasonsMap);
      }
    } catch (error) {
      console.error('Failed to validate shifts:', error);
      // Don't block UI if validation fails
    }
  }
  
  const toggleShift = (shiftId: number) => {
    const newSelected = new Set(selectedShiftIds);
    const shiftToToggle = availableShifts.find(s => s.id === shiftId);
    
    if (!shiftToToggle) return;
    
    if (newSelected.has(shiftId)) {
      // Removing selection - always allowed
      newSelected.delete(shiftId);
    } else {
      // CRITICAL FIX (Issue #1): Prevent selecting invalid shifts
      if (invalidShifts.has(shiftId)) {
        const reasons = shiftValidationReasons[shiftId] || ['Not available'];
        setError(`Cannot select this shift: ${reasons.join(', ')}`);
        return;
      }
      
      // Adding selection - check for conflicts
      const hasConflict = Array.from(newSelected).some(selectedId => {
        const selectedShift = availableShifts.find(s => s.id === selectedId);
        return selectedShift && 
               selectedShift.event?.id === shiftToToggle.event?.id &&
               selectedShift.role_needed !== shiftToToggle.role_needed;
      });
      
      if (hasConflict) {
        setError(`Cannot select multiple roles for the same event (${shiftToToggle.event?.title || 'Untitled Event'}). Please deselect other roles for this event first.`);
        return;
      }
      
      newSelected.add(shiftId);
    }
    
    setSelectedShiftIds(newSelected);
    setError(null); // Clear any previous errors
  };

  const setShiftPayRate = (shiftId: number, payRate: number) => {
    setShiftPayRates(prev => ({ ...prev, [shiftId]: payRate }));
  };
  
  const toggleAll = () => {
    if (selectedShiftIds.size === filteredShifts.length) {
      setSelectedShiftIds(new Set());
    } else {
      setSelectedShiftIds(new Set(filteredShifts.map(s => s.id)));
    }
  };
  
  async function handleBulkAssign() {
    if (selectedShiftIds.size === 0) {
      setError('Please select at least one shift');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Get all actual shift IDs for the selected roles
      const allShiftIds: number[] = [];
      const selectedShifts = availableShifts.filter(shift => selectedShiftIds.has(shift.id));
      
      // For each selected role, get all shift IDs for that role at that event
      selectedShifts.forEach(shift => {
        if (shift.all_shift_ids) {
          allShiftIds.push(...(shift.all_shift_ids || []));
        }
      });
      
      // Remove duplicates
      const uniqueShiftIds = [...new Set(allShiftIds)];
      
      // Create assignments with pay rates
      const assignments = uniqueShiftIds.map(shiftId => {
        const shift = availableShifts.find(s => s.all_shift_ids?.includes(shiftId));
        const payRate = shiftPayRates[shiftId] || (Number(shift?.pay_rate) || 0);
        return {
          shift_id: shiftId,
          worker_id: worker.id,
          hourly_rate: payRate
        };
      });

      const response = await apiClient.post('/staffing/bulk_create', {
        assignments: assignments
      });
      
      // CRITICAL FIX: Handle partial success mode
      if (response.data.status === 'success') {
        onSuccess(response.data.message);
      } else if (response.data.status === 'partial_success') {
        // Partial success - show what succeeded and what failed
        const { successful, failed } = response.data.data;
        const successCount = successful.length;
        const failCount = failed.length;
        
        // Build detailed error message
        let message = `Successfully scheduled ${successCount} of ${uniqueShiftIds.length} shifts`;
        if (failCount > 0) {
          message += '\n\nFailed to schedule:\n';
          failed.forEach((f: any) => {
            message += `• ${f.event}: ${f.reasons.join(', ')}\n`;
          });
        }
        
        // Show both success and error
        onSuccess(message);
      } else if (response.data.status === 'error') {
        // All failed
        let errorMessage = response.data.message || 'Failed to schedule worker for shifts';
        if (response.data.details && response.data.details.length > 0) {
          errorMessage += '\n\nDetails:\n• ' + response.data.details.join('\n• ');
        }
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error('Failed to bulk assign:', error);
      
      // Handle batch overlap errors (new in Issue #2 fix)
      if (error.response?.data?.status === 'error' && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (errors.some((e: any) => e.type === 'batch_overlap')) {
          const overlapError = errors.find((e: any) => e.type === 'batch_overlap');
          setError(overlapError.message);
          return;
        }
      }
      
      if (error.response?.data?.conflicts) {
        setConflicts(error.response?.data?.conflicts || []);
        let errorMessage = 'Scheduling conflicts detected. Please review below.';
        if (error.response.data.details && error.response.data.details.length > 0) {
          errorMessage += '\n\nConflicts:\n• ' + error.response.data.details.join('\n• ');
        }
        setError(errorMessage);
      } else {
        let errorMessage = error.response?.data?.message || 'Failed to schedule worker for shifts';
        if (error.response?.data?.details && error.response.data.details.length > 0) {
          errorMessage += '\n\nDetails:\n• ' + error.response.data.details.join('\n• ');
        }
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  }
  
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'EEE, MMM d, yyyy');
  };
  
  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a');
  };
  
  // Get unique roles from worker's skills
  const workerRoles = worker.skills_json || [];
  
  // Filter shifts
  const filteredShifts = availableShifts.filter(shift => {
    if (filterRole !== 'all' && shift.role_needed !== filterRole) {
      return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (shift.event?.title || '').toLowerCase().includes(query) ||
        (shift.location || '').toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Check for conflicts for each shift
  const getShiftConflictStatus = (shift: AvailableShift) => {
    const hasOtherRoleSelected = Array.from(selectedShiftIds).some(selectedId => {
      const selectedShift = availableShifts.find(s => s.id === selectedId);
      return selectedShift && 
             selectedShift.event?.id === shift.event?.id &&
             selectedShift.role_needed !== shift.role_needed;
    });
    
    return hasOtherRoleSelected;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Schedule {worker.first_name} {worker.last_name} for Shifts
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Worker Skills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {worker.skills_json?.map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <X size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    {error.split('\n').map((line, index) => (
                      <p key={index} className={line.startsWith('•') ? 'ml-2' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Conflict Display */}
              {conflicts.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Scheduling Conflicts</h4>
                  <div className="space-y-2">
                    {conflicts.map((conflict, index) => (
                      <div key={index} className="text-sm">
                        <p className="text-yellow-800">
                          <strong>{conflict.new_shift?.event || 'Unknown Event'}</strong> conflicts with:
                        </p>
                        <ul className="ml-4 mt-1 space-y-1">
                          {(conflict.conflicting_with || []).map((existing: any, idx: number) => (
                            <li key={idx} className="text-yellow-700">
                              {existing.event || 'Unknown Event'} ({format(parseISO(existing.start_time), 'MMM d, h:mm a')} - {format(parseISO(existing.end_time), 'h:mm a')})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Filters */}
              <div className="mb-4 flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search events or locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="all">All Roles</option>
                  {workerRoles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              
              {/* Selection Header */}
              {filteredShifts.length > 0 && (
                <div className="mb-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedShiftIds.size === filteredShifts.length && filteredShifts.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All ({filteredShifts.length} shifts)
                    </span>
                  </label>
                  
                  {selectedShiftIds.size > 0 && (
                    <span className="text-sm font-medium text-teal-600">
                      {selectedShiftIds.size} selected
                    </span>
                  )}
                </div>
              )}
              
              {/* Shifts List */}
              {filteredShifts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Briefcase size={48} className="mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">No available shifts found</p>
                  <p className="text-sm mt-1">
                    {searchQuery || filterRole !== 'all'
                      ? 'Try adjusting your filters'
                      : `No shifts matching ${worker.first_name}'s skills need workers`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredShifts.map((shift) => {
                    const isSelected = selectedShiftIds.has(shift.id);
                    const hasConflict = getShiftConflictStatus(shift);
                    const isInvalid = invalidShifts.has(shift.id);
                    const isDisabled = (hasConflict || isInvalid) && !isSelected;
                    const validationReasons = shiftValidationReasons[shift.id] || [];
                    
                    return (
                      <button
                        key={shift.id}
                        onClick={() => toggleShift(shift.id)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => toggleShift(shift.id)}
                            className={`mt-1 w-4 h-4 rounded focus:ring-teal-500 ${
                              isDisabled 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-teal-600'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className={`font-medium ${
                                  isDisabled ? 'text-gray-500' : 'text-gray-900'
                                }`}>
                                  {shift.event?.title || 'Untitled Event'}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                                    isDisabled 
                                      ? 'bg-gray-200 text-gray-500' 
                                      : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {shift.role_needed}
                                  </span>
                                  {shift.total_positions && shift.total_positions > 1 && (
                                    <span className={`text-xs ${
                                      isDisabled ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                      {shift.available_positions} of {shift.total_positions} positions available
                                    </span>
                                  )}
                                  {hasConflict && !isSelected && (
                                    <span className="text-xs text-red-600 font-medium">
                                      (Conflicts with selected role)
                                    </span>
                                  )}
                                  {isInvalid && !isSelected && (
                                    <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                                      <AlertTriangle size={12} />
                                      (Not available)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                <span>{formatDate(shift.start_time_utc)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400" />
                                <span>
                                  {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-gray-400" />
                                <span className="truncate">{shift.location}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Pay Rate Section - Right Side */}
                          <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              {shiftPayRates[shift.id] && shiftPayRates[shift.id] !== (Number(shift.pay_rate) || 0) && (
                                <span className="text-xs text-amber-600 font-medium">
                                  (custom)
                                </span>
                              )}
                              
                              <DollarSign size={14} className="text-gray-400" />
                              <span className="text-gray-500 text-sm">Pay:</span>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                placeholder={(Number(shift.pay_rate) || 0).toString()}
                                value={shiftPayRates[shift.id] !== undefined ? shiftPayRates[shift.id] : (Number(shift.pay_rate) || 0)}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow numbers, decimal point, and empty string
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    setShiftPayRate(shift.id, parseFloat(value) || 0);
                                  }
                                }}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                onMouseDown={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                              />
                              <span className="text-gray-500 text-sm">/hr</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Validation Reasons Display */}
                        {isInvalid && validationReasons.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <div className="flex items-start gap-2 text-xs">
                              <AlertTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                              <div className="text-red-700">
                                <p className="font-medium mb-1">Cannot assign to this shift:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {validationReasons.map((reason, idx) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedShiftIds.size > 0 ? (
              <span className="font-medium">
                {selectedShiftIds.size} shift{selectedShiftIds.size !== 1 ? 's' : ''} selected
              </span>
            ) : (
              <span>Select shifts to assign {worker.first_name} to</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkAssign}
              disabled={selectedShiftIds.size === 0 || submitting}
              className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  Schedule for {selectedShiftIds.size} Shift{selectedShiftIds.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}