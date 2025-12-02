import React, { useState, useEffect } from 'react';
import { Modal } from './common/Modal';
import { apiClient } from '../lib/api';
import { Calendar, MapPin, Clock, User, Phone, FileText, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface EventDetail {
  id: number;
  title: string;
  status: string;
  staffing_status: string;
  venue: {
    id: number;
    name: string;
    formatted_address: string;
    arrival_instructions?: string;
    parking_info?: string;
    phone?: string;
  } | null;
  schedule: {
    start_time_utc: string;
    end_time_utc: string;
    break_minutes: number;
  } | null;
  skill_requirements: Array<{
    id: number;
    skill_name: string;
    needed_workers: number;
    description?: string;
    uniform_name?: string;
    certification_name?: string;
    pay_rate?: number;
  }>;
  total_workers_needed: number;
  assigned_workers_count: number;
  unfilled_roles_count: number;
  staffing_percentage: number;
  staffing_summary: string; // kept in type for now but not rendered directly
  check_in_instructions?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  shifts: Array<{
    id: number;
    role_needed: string;
    status: string;
    staffing_progress: {
      assigned: number;
      required: number;
      percentage: number;
    };
    start_time_utc: string;
    end_time_utc: string;
    assignments_count: number;
  }>;
}

interface EditEventSummaryModalProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function EditEventSummaryModal({ eventId, isOpen, onClose }: EditEventSummaryModalProps) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadEvent();
    }
  }, [isOpen, eventId]);

  async function loadEvent() {
    setLoading(true);
    try {
      const response = await apiClient.get(`/events/${eventId}`);
      if (response.data.status === 'success') {
        setEvent(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load event:', error);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }

  const toggleRole = (roleName: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleName)) {
      newExpanded.delete(roleName);
    } else {
      newExpanded.add(roleName);
    }
    setExpandedRoles(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!event && !loading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Event Not Found"
        size="lg"
      >
        <div className="py-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600">Could not load event details.</p>
        </div>
      </Modal>
    );
  }

  // Group shifts by role
  const shiftsByRole = event?.shifts.reduce((acc, shift) => {
    if (!acc[shift.role_needed]) {
      acc[shift.role_needed] = [];
    }
    acc[shift.role_needed].push(shift);
    return acc;
  }, {} as Record<string, typeof event.shifts>) || {};

  const modalContent = (
    <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      ) : event ? (
        <>
          {/* Event Details */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date & Time */}
              {event.schedule && (
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Calendar size={16} />
                    <span className="text-sm font-semibold">Date & Time</span>
                  </div>
                  <p className="text-gray-900 font-medium text-sm">
                    {formatDate(event.schedule.start_time_utc)}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {formatTime(event.schedule.start_time_utc)} - {formatTime(event.schedule.end_time_utc)}
                  </p>
                  {event.schedule.break_minutes > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {event.schedule.break_minutes} min break
                    </p>
                  )}
                </div>
              )}
              
              {/* Venue */}
              {event.venue && (
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <MapPin size={16} />
                    <span className="text-sm font-semibold">Venue</span>
                  </div>
                  <p className="text-gray-900 font-medium text-sm">{event.venue.name}</p>
                  <p className="text-gray-600 text-xs">{event.venue.formatted_address}</p>
                  {event.venue.phone && (
                    <p className="text-gray-600 text-xs mt-1">
                      <Phone size={12} className="inline mr-1" />
                      {event.venue.phone}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Supervisor & Staffing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
              {event.supervisor_name && (
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <User size={16} />
                    <span className="text-sm font-semibold">Supervisor</span>
                  </div>
                  <p className="text-gray-900 font-medium text-sm">{event.supervisor_name}</p>
                  {event.supervisor_phone && (
                    <p className="text-gray-600 text-xs">
                      <Phone size={12} className="inline mr-1" />
                      {event.supervisor_phone}
                    </p>
                  )}
                </div>
              )}
              
              {/* Staffing Status */}
              <div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Users size={16} />
                  <span className="text-sm font-semibold">Staffing</span>
                </div>
                <p className="text-gray-900 font-medium text-sm mb-2">
                  {event.assigned_workers_count || 0} of {event.total_workers_needed || 0} workers hired
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      event.staffing_percentage === 100
                        ? 'bg-green-500'
                        : event.staffing_percentage > 0
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${event.staffing_percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Check-in Instructions */}
            {event.check_in_instructions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <FileText size={16} />
                  <span className="text-sm font-semibold">Check-in Instructions</span>
                </div>
                <p className="text-gray-700 text-xs leading-relaxed">
                  {event.check_in_instructions}
                </p>
              </div>
            )}
          </div>

          {/* Roles & Shifts */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Roles & Shifts</h3>
            
            <div className="space-y-2">
              {Object.entries(shiftsByRole).map(([roleName, shifts]) => {
                const isExpanded = expandedRoles.has(roleName);
                const totalForRole = shifts.length;
                const assignedForRole = shifts.filter(s => s.staffing_progress.percentage === 100).length;
                const needsWorkersForRole = totalForRole - assignedForRole;
                
                const skillReq = event.skill_requirements.find(sr => sr.skill_name === roleName);
                
                return (
                  <div key={roleName} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Role Header */}
                    <button
                      onClick={() => toggleRole(roleName)}
                      className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <h4 className="text-sm font-semibold text-gray-900">{roleName}</h4>
                        <p className="text-xs text-gray-600">
                          {assignedForRole}/{totalForRole} filled
                          {skillReq?.pay_rate && (
                            <span className="ml-1 text-gray-500">
                              • ${skillReq.pay_rate}/hr
                            </span>
                          )}
                        </p>
                        
                        {/* Status Badge */}
                        {needsWorkersForRole === 0 ? (
                          <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            All Filled
                          </span>
                        ) : (
                          <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            {needsWorkersForRole} Need Workers
                          </span>
                        )}
                      </div>
                      
                      {/* Expand Icon */}
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-gray-400 ml-2" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400 ml-2" />
                      )}
                    </button>
                    
                    {/* Role Details (Expanded) */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
                        {/* Skill Requirements */}
                        {skillReq && (
                          <div className="mb-3 pb-3 border-b border-gray-200">
                            {skillReq.description && (
                              <p className="text-xs text-gray-700 mb-2">{skillReq.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {skillReq.uniform_name && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-xs text-gray-600 rounded">
                                  Uniform: {skillReq.uniform_name}
                                </span>
                              )}
                              {skillReq.certification_name && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-xs text-gray-600 rounded">
                                  Cert: {skillReq.certification_name}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Individual Shifts */}
                        <div className="space-y-1.5">
                          {shifts.map((shift, index) => (
                            <div
                              key={shift.id}
                              className="flex items-center justify-between py-1.5 px-2 bg-white rounded border border-gray-200"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-600">
                                  Shift {index + 1}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {shift.staffing_progress.percentage === 100 ? (
                                  <span className="text-xs font-medium text-green-600">
                                    ✓ Filled
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-red-600">
                                    Open
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  const footerContent = (
    <div className="flex gap-2">
      <button
        onClick={onClose}
        className="btn-secondary"
      >
        Close
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event?.title || 'Event Summary'}
      size="xl"
      footer={footerContent}
    >
      {modalContent}
    </Modal>
  );
}

