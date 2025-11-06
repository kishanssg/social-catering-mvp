import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, User, Phone, FileText, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { apiClient } from '../lib/api';

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
  staffing_summary: string;
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

export function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [approvals, setApprovals] = useState<{ approved: number; total: number } | null>(null);
  
  useEffect(() => {
    loadEvent();
  }, [id]);
  
  async function loadEvent() {
    setLoading(true);
    try {
      const response = await apiClient.get(`/events/${id}`);
      
      if (response.data.status === 'success') {
        setEvent(response.data.data);
        // Also fetch approvals summary for glance state
        try {
          const appr = await apiClient.get(`/events/${id}/approvals`);
          if (appr.data?.status === 'success') {
            const assignments = appr.data.data.assignments || [];
            const total = assignments.length;
            const approved = assignments.filter((a: any) => a.approved).length;
            setApprovals({ approved, total });
          }
        } catch (e) {
          // Non-blocking
          setApprovals(null);
        }
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
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner message="Loading event details..." />
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Not Found</h3>
          <button
            onClick={() => navigate('/events')}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }
  
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
  
  // Group shifts by role
  const shiftsByRole = event.shifts.reduce((acc, shift) => {
    if (!acc[shift.role_needed]) {
      acc[shift.role_needed] = [];
    }
    acc[shift.role_needed].push(shift);
    return acc;
  }, {} as Record<string, typeof event.shifts>);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Events
        </button>
        
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {event.title}
              </h1>
              
              {/* Status Badge */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
                {approvals && (
                  approvals.total > 0 ? (
                    approvals.approved === approvals.total ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                        ✓ All Hours Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                        Approvals {approvals.approved}/{approvals.total}
                      </span>
                    )
                  ) : null
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {event.unfilled_roles_count > 0 && (
                <button
                  onClick={() => navigate(`/events?tab=active&event_id=${event.id}`)}
                  className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Assign Workers
                </button>
              )}
            </div>
          </div>
          
          {/* Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Date & Time */}
            {event.schedule && (
              <div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Calendar size={18} />
                  <span className="text-sm font-medium">Date & Time</span>
                </div>
                <p className="text-gray-900 font-medium">
                  {formatDate(event.schedule.start_time_utc)}
                </p>
                <p className="text-gray-600">
                  {formatTime(event.schedule.start_time_utc)} - {formatTime(event.schedule.end_time_utc)}
                </p>
                {event.schedule.break_minutes > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {event.schedule.break_minutes} min break
                  </p>
                )}
              </div>
            )}
            
            {/* Venue */}
            {event.venue && (
              <div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MapPin size={18} />
                  <span className="text-sm font-medium">Venue</span>
                </div>
                <p className="text-gray-900 font-medium">{event.venue.name}</p>
                <p className="text-gray-600 text-sm">{event.venue.formatted_address}</p>
                {event.venue.phone && (
                  <p className="text-gray-600 text-sm mt-1">
                    <Phone size={14} className="inline mr-1" />
                    {event.venue.phone}
                  </p>
                )}
              </div>
            )}
            
            {/* Supervisor */}
            {event.supervisor_name && (
              <div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <User size={18} />
                  <span className="text-sm font-medium">Event Supervisor</span>
                </div>
                <p className="text-gray-900 font-medium">{event.supervisor_name}</p>
                {event.supervisor_phone && (
                  <p className="text-gray-600 text-sm">
                    <Phone size={14} className="inline mr-1" />
                    {event.supervisor_phone}
                  </p>
                )}
              </div>
            )}
            
            {/* Staffing Summary */}
            <div>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Users size={18} />
                <span className="text-sm font-medium">Staffing Status</span>
              </div>
              <p className="text-gray-900 font-medium mb-2">
                {event.staffing_summary}
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
              <p className="text-sm text-gray-600 mt-1">
                {event.staffing_percentage}% complete
              </p>
            </div>
          </div>
          
          {/* Check-in Instructions */}
          {event.check_in_instructions && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <FileText size={18} />
                <span className="text-sm font-medium">Check-in Instructions</span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                {event.check_in_instructions}
              </p>
            </div>
          )}
          
          {/* Venue Instructions */}
          {event.venue && (event.venue.arrival_instructions || event.venue.parking_info) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {event.venue.arrival_instructions && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Arrival Instructions:</p>
                  <p className="text-sm text-gray-600">{event.venue.arrival_instructions}</p>
                </div>
              )}
              {event.venue.parking_info && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Parking:</p>
                  <p className="text-sm text-gray-600">{event.venue.parking_info}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Roles & Shifts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Roles & Shifts</h2>
          
          <div className="space-y-3">
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
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-gray-900">{roleName}</h3>
                        <p className="text-sm text-gray-600">
                          {assignedForRole} of {totalForRole} shifts filled
                          {skillReq?.pay_rate && (
                            <span className="ml-2 text-gray-500">
                              • ${skillReq.pay_rate}/hr
                            </span>
                          )}
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      {needsWorkersForRole === 0 ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          All Filled
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          {needsWorkersForRole} Need Workers
                        </span>
                      )}
                      
                      {/* Expand Icon */}
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {/* Role Details (Expanded) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                      {/* Skill Requirements */}
                      {skillReq && (
                        <div className="mb-4 pb-4 border-b border-gray-200">
                          {skillReq.description && (
                            <p className="text-sm text-gray-700 mb-2">{skillReq.description}</p>
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
                      <div className="space-y-2">
                        {shifts.map((shift, index) => (
                          <div
                            key={shift.id}
                            className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-200"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-600">
                                Shift {index + 1}
                              </span>
                              <span className="text-sm text-gray-600">
                                {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {shift.staffing_progress.percentage === 100 ? (
                                <span className="text-sm font-medium text-green-600">
                                  ✓ Assigned
                                </span>
                              ) : (
                                <span className="text-sm font-medium text-red-600">
                                  Needs Worker
                                </span>
                              )}
                              
                              {shift.staffing_progress.percentage < 100 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/events?tab=active&shift_id=${shift.id}`);
                                  }}
                                  className="px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition-colors"
                                >
                                  Assign
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Bulk Assign Button */}
                      {needsWorkersForRole > 0 && (
                        <button
                          onClick={() => navigate(`/events?tab=active&event_id=${event.id}&role=${encodeURIComponent(roleName)}`)}
                          className="mt-3 w-full px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                        >
                          Assign All {roleName} Shifts ({needsWorkersForRole})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
