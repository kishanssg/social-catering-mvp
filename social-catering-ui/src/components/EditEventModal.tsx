import React, { useState, useEffect, useMemo } from 'react';
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
  
  // Schedule editing state
  const [editedDate, setEditedDate] = useState<string>('');
  const [editedStartTime, setEditedStartTime] = useState<string>('');
  const [editedEndTime, setEditedEndTime] = useState<string>('');
  const [editedBreakMinutes, setEditedBreakMinutes] = useState<number>(0);
  const showErrorToast = (message: string) => {
    setToast({
      isVisible: true,
      message,
      type: 'error'
    });
  };

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
  const displayEvent = fullEventData || event; // ✅ Fix: Define displayEvent for JSX usage

  const roleMetaBySkill = useMemo(() => {
    if (!displayEvent?.shifts_by_role) return new Map<string, any>();
    const map = new Map<string, any>();
    displayEvent.shifts_by_role.forEach((group: any) => {
      const key = group.skill_name || group.role_name;
      if (key) {
        map.set(key, group);
      }
    });
    return map;
  }, [displayEvent]);
  
  // Initialize schedule editing state when event data loads
  useEffect(() => {
    if (displayEvent?.schedule) {
      const schedule = displayEvent.schedule;
      // Parse UTC times and convert to local timezone for editing
      const startDateUTC = new Date(schedule.start_time_utc);
      const endDateUTC = new Date(schedule.end_time_utc);
      
      // Get local date components (not UTC)
      const localYear = startDateUTC.getFullYear();
      const localMonth = String(startDateUTC.getMonth() + 1).padStart(2, '0');
      const localDay = String(startDateUTC.getDate()).padStart(2, '0');
      const dateStr = `${localYear}-${localMonth}-${localDay}`;
      
      // Get local time components (not UTC) - this is what the user sees
      const startHours = startDateUTC.getHours();
      const startMinutes = startDateUTC.getMinutes();
      const endHours = endDateUTC.getHours();
      const endMinutes = endDateUTC.getMinutes();
      
      const startTimeStr = String(startHours).padStart(2, '0') + ':' + String(startMinutes).padStart(2, '0');
      const endTimeStr = String(endHours).padStart(2, '0') + ':' + String(endMinutes).padStart(2, '0');
      
      setEditedDate(dateStr);
      setEditedStartTime(startTimeStr);
      setEditedEndTime(endTimeStr);
      setEditedBreakMinutes(schedule.break_minutes || 0);
    }
  }, [displayEvent?.schedule]);
  
  useEffect(() => {
    if (!eventData) return;
    
    // Use skill_requirements as Single Source of Truth for pay rates AND needed_workers
    if (eventData.skill_requirements && Array.isArray(eventData.skill_requirements)) {
      console.log('=== EditEventModal: Initializing roles from skill_requirements ===');
      const initialRoles: SkillRequirement[] = eventData.skill_requirements
        .map((req) => {
          // ✅ CRITICAL FIX: Use req.needed_workers from EventSkillRequirement (SSOT), NOT shifts.length
          // shifts.length can include orphaned shifts that shouldn't exist
          // The backend will auto-clean orphaned shifts when we save
          const roleGroup = roleMetaBySkill.get(req.skill_name);
          console.log(`Role: ${req.skill_name}`, {
            needed_workers_from_req: req.needed_workers,
            shifts_length_from_meta: roleGroup?.shifts?.length,
            total_shifts_from_meta: roleGroup?.total_shifts,
            using: req.needed_workers || 1
          });
          
          return {
            skill_name: req.skill_name,
            needed_workers: req.needed_workers || 1, // SSOT: Use needed_workers from requirement
            // Use pay_rate from EventSkillRequirement - this is the SSOT
            pay_rate: req.pay_rate || 15, // Falls back to 15 if not set
            description: req.description || '',
            uniform_id: undefined, // TODO: Map uniform_name to uniform_id if needed
            cert_id: undefined // TODO: Map certification_name to cert_id if needed
          };
        })
        .sort((a, b) => a.skill_name.localeCompare(b.skill_name));
      console.log('Initialized roles:', initialRoles);
      setRoles(initialRoles);
    } else if (eventData.shifts_by_role && Array.isArray(eventData.shifts_by_role)) {
      // Fallback to shifts_by_role if skill_requirements not available
      // In this case, use total_shifts from the role group (which should match needed_workers from backend)
      console.log('=== EditEventModal: Initializing roles from shifts_by_role ===');
      const initialRoles: SkillRequirement[] = eventData.shifts_by_role.map((role: any) => {
        // Use total_shifts (which comes from needed_workers in backend) NOT shifts.length
        const neededCount = role.total_shifts || 1;
        console.log(`Role: ${role.skill_name}`, {
          total_shifts: role.total_shifts,
          shifts_length: role.shifts?.length,
          using: neededCount
        });
        
        return {
          skill_name: role.skill_name || role.role_name || '',
          needed_workers: neededCount, // Use total_shifts, not actual shift count
          // Use pay_rate from role-level (from our API fix)
          pay_rate: role.pay_rate || 15,
          description: '',
          uniform_id: undefined,
          cert_id: undefined
        };
      });
      console.log('Initialized roles:', initialRoles);
      setRoles(initialRoles);
    }
  }, [eventData, roleMetaBySkill]);

  const handleRoleChange = (index: number, field: keyof SkillRequirement, value: any) => {
    if (index < 0 || index >= roles.length) return; // Guard against invalid index
    const role = roles[index];
    const roleMeta = roleMetaBySkill.get(role.skill_name);
    const assignedCount = roleMeta?.assigned_workers || roleMeta?.filled_shifts || 0;
    if (field === 'needed_workers') {
      const numeric = typeof value === 'number' ? value : parseInt(value, 10);
      if (Number.isNaN(numeric) || numeric < assignedCount || numeric < 1) {
        showErrorToast(`Cannot set below ${Math.max(assignedCount,1)}. ${assignedCount} worker(s) currently assigned to ${role.skill_name || 'this role'}.`);
        return;
      }
    }
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
    if (index < 0 || index >= roles.length) return; // Guard against invalid index
    const role = roles[index];
    const roleMeta = roleMetaBySkill.get(role.skill_name);
    const assignedCount = roleMeta?.assigned_workers || roleMeta?.filled_shifts || 0;
    if (assignedCount > 0) {
      setToast({
        isVisible: true,
        message: `Cannot remove role with ${assignedCount} worker(s) assigned. Please unassign workers first.`,
        type: 'error'
      });
      return;
    }
    setRoles(roles.filter((_, i) => i !== index));
  };

  const handleSkillSelect = (index: number, skillName: string) => {
    if (index < 0 || index >= roles.length) return; // Guard against invalid index
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
      const eventToUpdate = fullEventData || event;
      
      // Build the update payload
      const updatePayload: any = {
        roles: roles.map(role => ({
          skill_name: role.skill_name,
          needed: role.needed_workers,
          pay_rate: role.pay_rate,
          description: role.description,
          uniform_id: role.uniform_id,
          cert_id: role.cert_id
        }))
      };
      
      // Include schedule if it exists (use edited values if in editing mode)
      if (eventToUpdate.schedule) {
        if (isEditing && editedDate && editedStartTime && editedEndTime) {
          // User has edited the schedule - combine date and time in local timezone, then convert to UTC
          // JavaScript Date constructor interprets YYYY-MM-DDTHH:mm as local time
          const startDateTimeLocal = new Date(`${editedDate}T${editedStartTime}`);
          let endDateTimeLocal = new Date(`${editedDate}T${editedEndTime}`);
          
          // If end time is before start time, assume end is next day
          if (endDateTimeLocal <= startDateTimeLocal) {
            endDateTimeLocal.setDate(endDateTimeLocal.getDate() + 1);
          }
          
          // Convert local time to UTC ISO string
          updatePayload.schedule = {
            start_time_utc: startDateTimeLocal.toISOString(),
            end_time_utc: endDateTimeLocal.toISOString(),
            break_minutes: editedBreakMinutes || 0
          };
          
          console.log('📅 Schedule update:', {
            editedDate,
            editedStartTime,
            editedEndTime,
            start_time_utc: updatePayload.schedule.start_time_utc,
            end_time_utc: updatePayload.schedule.end_time_utc
          });
        } else {
          // Not editing or no edited values - use original schedule
          updatePayload.schedule = {
            start_time_utc: eventToUpdate.schedule.start_time_utc,
            end_time_utc: eventToUpdate.schedule.end_time_utc,
            break_minutes: eventToUpdate.schedule.break_minutes || 0
          };
        }
      }
      
      console.log('💾 Saving event update:', {
        eventId: eventToUpdate.id,
        hasSchedule: !!updatePayload.schedule,
        isEditing,
        payload: updatePayload
      });
      
      const response = await apiClient.patch(`/events/${eventToUpdate.id}`, {
        event: updatePayload
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
        <div className="bg-white w-full h-full sm:h-auto sm:max-w-4xl sm:rounded-lg shadow-xl overflow-hidden flex flex-col sm:max-h-[90vh]">
          {/* Header */}
          <div className="sticky top-0 bg-white px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Edit Event: {displayEvent.title}</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 min-h-touch min-w-touch" aria-label="Close">
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {/* Event Details (Read-only for now) */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-lg font-semibold text-gray-900">Event Details</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                >
                  <Edit size={14} />
                  {isEditing ? 'Cancel Edit' : 'Edit'}
                </button>
                {!isEditing && (
                  <button
                    onClick={handleEditEventDetails}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-all shadow-sm"
                  >
                    Full Edit
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Venue</p>
                <p className="text-sm font-semibold text-gray-900">{displayEvent.venue?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date</p>
                {isEditing && displayEvent.schedule ? (
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                ) : (
                  <p className="text-sm font-semibold text-gray-900">
                    {displayEvent.schedule && new Date(displayEvent.schedule.start_time_utc).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                )}
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Location</p>
                <p className="text-sm font-semibold text-gray-900 leading-relaxed">{displayEvent.venue?.formatted_address}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Time</p>
                {isEditing && displayEvent.schedule ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={editedStartTime}
                      onChange={(e) => setEditedStartTime(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="time"
                      value={editedEndTime}
                      onChange={(e) => setEditedEndTime(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                ) : (
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
                )}
              </div>
              {displayEvent.schedule && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Break</p>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={editedBreakMinutes}
                      onChange={(e) => setEditedBreakMinutes(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-gray-900">
                      {displayEvent.schedule.break_minutes || 0} minutes
                    </p>
                  )}
                </div>
              )}
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

            {roles.map((role, index) => {
              const roleMeta = roleMetaBySkill.get(role.skill_name);
              const assignedCount = roleMeta?.assigned_workers || roleMeta?.filled_shifts || 0;
              return (
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
                        onClick={() => handleRoleChange(index, 'needed_workers', role.needed_workers - 1)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors font-semibold text-gray-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={role.needed_workers}
                        onChange={(e) => handleRoleChange(index, 'needed_workers', parseInt(e.target.value) || 1)}
                        min={Math.max(assignedCount, 1)}
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
                {(() => {
                  return assignedCount > 0 ? (
                    <div className="text-sm text-amber-600 font-semibold bg-amber-50 px-3 py-2 rounded-lg">
                      {assignedCount} worker(s) assigned
                    </div>
                  ) : null;
                })()}
              </div>
            )})}
          </div>
          </div>
          {/* Footer */}
          <div className="sticky bottom-0 bg-white px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-end z-10">
            {footerContent}
          </div>
        </div>
      </div>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}

