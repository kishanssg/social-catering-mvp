import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, Save, Edit } from 'lucide-react';
import { Modal } from './common/Modal';
import { apiClient } from '../lib/api';
import { Toast } from './common/Toast';
import bartenderIcon from '../assets/icons/Skills/Bartender.svg';
import banquetServerIcon from '../assets/icons/Skills/Banquet Server.svg';
import captainIcon from '../assets/icons/Skills/Captain.svg';
import eventHelperIcon from '../assets/icons/Skills/Event Helper.svg';
import prepCookIcon from '../assets/icons/Skills/Prep Cook.svg';

interface SkillRequirement {
  skill_name: string;
  needed_workers: number;
  pay_rate?: number;
  description?: string;
  uniform_id?: number;
  cert_id?: number;
}

interface EditableEvent {
  id: number;
  title: string;
  status: string;
  venue: {
    id: number;
    name: string;
    formatted_address: string;
  } | null;
  schedule?: {
    start_time_utc: string;
    end_time_utc: string;
    break_minutes: number;
  } | null;
  shifts_by_role?: any; // Accept flexible structure
  skill_requirements?: Array<{
    id: number;
    skill_name: string;
    needed_workers: number;
    description?: string;
    uniform_name?: string;
    certification_name?: string;
    pay_rate?: number;
  }>; // EventSkillRequirements - Single Source of Truth for pay rates
}

interface EditEventModalProps {
  event: EditableEvent;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEventModal({ event, isOpen, onClose, onSuccess }: EditEventModalProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [roles, setRoles] = useState<SkillRequirement[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [fullEventData, setFullEventData] = useState<EditableEvent | null>(null);
  const [openSkillDropdown, setOpenSkillDropdown] = useState<number | null>(null);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' }>({
    isVisible: false,
    message: '',
    type: 'error'
  });
  
  // Fetch full event details (including skill_requirements) when modal opens
  useEffect(() => {
    if (isOpen && event.id) {
      loadFullEventDetails();
    }
  }, [isOpen, event.id]);
  
  const loadFullEventDetails = async () => {
    setLoadingEvent(true);
    try {
      const response = await apiClient.get(`/events/${event.id}`);
      if (response.data.status === 'success') {
        setFullEventData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load full event details:', error);
      setFullEventData(event); // Fallback to prop
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleEditEventDetails = () => {
    onClose(); // Close this modal
    navigate(`/events/${event.id}/edit`); // Navigate to create event wizard in edit mode
  };

  const availableSkills = [
    { name: 'Bartender', icon: bartenderIcon },
    { name: 'Banquet Server/Runner', icon: banquetServerIcon },
    { name: 'Captain', icon: captainIcon },
    { name: 'Event Helper', icon: eventHelperIcon },
    { name: 'Prep Cook', icon: prepCookIcon },
  ];

  // Initialize roles from event
  // Priority: skill_requirements (SSOT) > shifts_by_role > defaults
  // Use fullEventData if available (includes skill_requirements), otherwise fallback to event prop
  const eventData = fullEventData || event;
  
  useEffect(() => {
    if (!eventData) return;
    
    // Use skill_requirements as Single Source of Truth for pay rates
    if (eventData.skill_requirements && Array.isArray(eventData.skill_requirements)) {
      const initialRoles: SkillRequirement[] = eventData.skill_requirements.map((req) => {
        // Find corresponding shift count from shifts_by_role
        const roleGroup = eventData.shifts_by_role?.find(
          (r: any) => (r.skill_name || r.role_name) === req.skill_name
        );
        const shiftCount = roleGroup?.shifts?.length || roleGroup?.total_shifts || req.needed_workers || 1;
        
        return {
          skill_name: req.skill_name,
          needed_workers: shiftCount,
          // Use pay_rate from EventSkillRequirement - this is the SSOT
          pay_rate: req.pay_rate || 15, // Falls back to 15 if not set
          description: req.description || '',
          uniform_id: undefined, // TODO: Map uniform_name to uniform_id if needed
          cert_id: undefined // TODO: Map certification_name to cert_id if needed
        };
      });
      setRoles(initialRoles);
    } else if (eventData.shifts_by_role && Array.isArray(eventData.shifts_by_role)) {
      // Fallback to shifts_by_role if skill_requirements not available
      const initialRoles: SkillRequirement[] = eventData.shifts_by_role.map((role: any) => {
        const shiftCount = role.shifts ? role.shifts.length : (role.total_shifts || 1);
        
        return {
          skill_name: role.skill_name || role.role_name || '',
          needed_workers: shiftCount,
          // Use pay_rate from role-level (from our API fix)
          pay_rate: role.pay_rate || 15,
          description: '',
          uniform_id: undefined,
          cert_id: undefined
        };
      });
      setRoles(initialRoles);
    }
  }, [eventData]);

  const handleRoleChange = (index: number, field: keyof SkillRequirement, value: any) => {
    const newRoles = [...roles];
    newRoles[index] = { ...newRoles[index], [field]: value };
    setRoles(newRoles);
  };

  const handleAddRole = () => {
    setRoles([...roles, {
      skill_name: '',
      needed_workers: 1,
      pay_rate: 15,
      description: '',
      uniform_id: undefined,
      cert_id: undefined
    }]);
  };

  const handleRemoveRole = (index: number) => {
    if (roles[index].needed_workers > 0) {
      const roleData = displayEvent?.shifts_by_role?.[index];
      const hasAssignedWorkers = roleData && 
        ((roleData as any).assigned_workers > 0 || (roleData as any).filled_shifts > 0);
      if (hasAssignedWorkers) {
        // TODO: Show confirmation for removing assigned roles
        setToast({
          isVisible: true,
          message: 'Cannot remove role with assigned workers. Please unassign workers first.',
          type: 'error'
        });
        return;
      }
    }
    setRoles(roles.filter((_, i) => i !== index));
  };

  const handleSkillSelect = (index: number, skillName: string) => {
    const skill = availableSkills.find(s => s.name === skillName);
    const newRoles = [...roles];
    newRoles[index] = { 
      ...newRoles[index], 
      skill_name: skillName 
    };
    setRoles(newRoles);
    setOpenSkillDropdown(null);
  };

  const handleSave = async () => {
    // Use displayEvent for schedule check
    const eventToCheck = fullEventData || event;
    // Check if event has started (client-side guard)
    if (eventToCheck.schedule && new Date(eventToCheck.schedule.start_time_utc) <= new Date()) {
      setToast({
        isVisible: true,
        message: 'Cannot edit event that has already started',
        type: 'error'
      });
      return;
    }
    
    setSaving(true);
    try {
      const response = await apiClient.patch(`/events/${displayEvent.id}`, {
        event: {
          roles: roles.map(role => ({
            skill_name: role.skill_name,
            needed: role.needed_workers,
            pay_rate: role.pay_rate,
            description: role.description,
            uniform_id: role.uniform_id,
            cert_id: role.cert_id
          }))
        }
      });

      if (response.data.status === 'success') {
        setToast({
          isVisible: true,
          message: response.data.message || 'Event updated successfully',
          type: 'success'
        });
        onSuccess();
        onClose();
      } else {
        setToast({
          isVisible: true,
          message: response.data.message || 'Failed to update event',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Failed to update event:', error);
      // Friendly 422 banner rendering from structured conflicts
      const data = error?.response?.data;
      if (data?.status === 'validation_error' && data?.data?.conflicts?.length) {
        const lines = data.data.conflicts.map((c: any) => {
          const start = new Date(c.conflicting_shift_start_time_utc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const end = new Date(c.conflicting_shift_end_time_utc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          return `${c.worker_name} conflicts with ${c.conflicting_event_title} (${start} – ${end})`;
        });
        setToast({
          isVisible: true,
          message: `Can't save changes: ${lines.length} worker${lines.length!==1?'s':''} would be double-booked\n• ` + lines.join('\n• '),
          type: 'error'
        });
      } else {
        setToast({
          isVisible: true,
          message: data?.message || 'Failed to update event',
          type: 'error'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const footerContent = (
    <div className="flex gap-2">
      <button
        onClick={onClose}
        disabled={saving}
        className="btn-secondary"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Edit Event: ${displayEvent.title}`}
        size="lg"
        footer={footerContent}
      >
        <div className="space-y-6">
          {/* Event Details (Read-only for now) */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-lg font-semibold text-gray-900">Event Details</h4>
              <button
                onClick={handleEditEventDetails}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
              >
                <Edit size={14} />
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Venue</p>
                <p className="text-sm font-semibold text-gray-900">{displayEvent.venue?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {displayEvent.schedule && new Date(displayEvent.schedule.start_time_utc).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Location</p>
                <p className="text-sm font-semibold text-gray-900 leading-relaxed">{displayEvent.venue?.formatted_address}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Time</p>
                <p className="text-sm font-semibold text-gray-900">
                  {displayEvent.schedule && (
                    <>
                      {new Date(displayEvent.schedule.start_time_utc).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })} - {new Date(displayEvent.schedule.end_time_utc).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true
                      })}
                    </>
                  )}
                </p>
              </div>
              <div></div>
            </div>
          </div>

          {/* Roles List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900">Roles</h4>
              <button
                onClick={handleAddRole}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                Add Role
              </button>
            </div>

            {roles.map((role, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4 mb-3">
                  <div className="flex-1 relative overflow-visible">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role Name *
                    </label>
                    <div className="relative" style={{ zIndex: openSkillDropdown === index ? 1000 : 1 }}>
                      <button
                        type="button"
                        onClick={() => setOpenSkillDropdown(openSkillDropdown === index ? null : index)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-left flex items-center justify-between"
                      >
                        {role.skill_name ? (
                          <div className="flex items-center gap-2">
                            {availableSkills.find(s => s.name === role.skill_name)?.icon && (
                              <img 
                                src={availableSkills.find(s => s.name === role.skill_name)!.icon} 
                                alt={role.skill_name}
                                className="w-5 h-5"
                              />
                            )}
                            <span className="text-gray-900">{role.skill_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Pick the Skills the Worker Has</span>
                        )}
                        <svg className="w-4 h-4 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </button>
                      
                      {openSkillDropdown === index && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-[9999] max-h-[300px] overflow-y-auto w-full min-w-max">
                          {availableSkills
                            .filter(skill => !roles.some((r, i) => i !== index && r.skill_name === skill.name))
                            .map((skill) => (
                              <div
                                key={skill.name}
                                onClick={() => handleSkillSelect(index, skill.name)}
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-teal-50 border-b border-gray-100 last:border-0"
                              >
                                <img 
                                  src={skill.icon} 
                                  width="24" 
                                  height="24" 
                                  alt={skill.name}
                                  className="flex-shrink-0"
                                />
                                <span className="text-sm font-medium text-gray-900">
                                  {skill.name}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Needed Workers *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRoleChange(index, 'needed_workers', Math.max(1, role.needed_workers - 1))}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors font-semibold text-gray-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={role.needed_workers}
                        onChange={(e) => handleRoleChange(index, 'needed_workers', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                      />
                      <button
                        onClick={() => handleRoleChange(index, 'needed_workers', role.needed_workers + 1)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors font-semibold text-gray-700"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveRole(index)}
                        className="ml-2 w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove role"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Show assigned workers count */}
                {displayEvent.shifts_by_role?.[index] && (
                  ((event.shifts_by_role[index] as any).assigned_workers > 0 || (event.shifts_by_role[index] as any).filled_shifts > 0) && (
                    <div className="text-sm text-amber-600 font-semibold bg-amber-50 px-3 py-2 rounded-lg">
                      {(event.shifts_by_role[index] as any).assigned_workers || (event.shifts_by_role[index] as any).filled_shifts} worker(s) assigned
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}

