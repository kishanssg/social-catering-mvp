import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Edit,
  Award,
  Clock,
  Briefcase,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface WorkerDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  active: boolean;
  skills_json: string[];
  certifications?: Array<{
    id: number;
    name: string;
    expires_at_utc?: string;
  }>;
  created_at: string;
}

interface Assignment {
  id: number;
  event: {
    id: number;
    title: string;
  };
  shift: {
    role_needed: string;
    start_time_utc: string;
    end_time_utc: string;
    location: string;
  };
  hours_worked?: number;
  status: string;
  is_completed: boolean;
}

export function WorkerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  
  useEffect(() => {
    loadWorkerData();
  }, [id]);
  
  async function loadWorkerData() {
    setLoading(true);
    try {
      // Load worker details
      const workerResponse = await apiClient.get(`/workers/${id}`);
      
      if (workerResponse.data.status === 'success') {
        // The API returns { worker: {...} } not { data: {...} }
        setWorker(workerResponse.data.worker);
      }
      
      // Load worker assignments
      const assignmentsResponse = await apiClient.get(`/staffing?worker_id=${id}`);
      
      if (assignmentsResponse.data.status === 'success') {
        setAssignments(assignmentsResponse.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load worker data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleToggleStatus() {
    if (!worker) return;
    
    try {
      const response = await apiClient({
        method: 'PATCH',
        url: `/workers/${id}`,
        data: {
          worker: {
            active: !worker.active
          }
        }
      });
      
      if (response.data.status === 'success') {
        loadWorkerData();
      }
    } catch (error) {
      console.error('Failed to update worker status:', error);
      alert('Failed to update worker status');
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (!worker) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Worker Not Found</h3>
          <button
            onClick={() => navigate('/workers')}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            Back to Workers
          </button>
        </div>
      </div>
    );
  }
  
  const upcomingAssignments = assignments.filter(a => !a.is_completed);
  const pastAssignments = assignments.filter(a => a.is_completed);
  
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy');
  };
  
  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a');
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/workers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft size={20} />
          Back to Workers
        </button>
        
        {/* Worker Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-2xl font-semibold">
                {worker.first_name[0]}{worker.last_name[0]}
              </div>
              
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {worker.first_name} {worker.last_name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  {worker.active ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      <CheckCircle size={14} />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                      <XCircle size={14} />
                      Inactive
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    Joined {formatDate(worker.created_at)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleStatus}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  worker.active
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {worker.active ? 'Deactivate' : 'Activate'}
              </button>
              
              <button
                onClick={() => navigate(`/workers/${id}/edit`)}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition flex items-center gap-2"
              >
                <Edit size={16} />
                Edit
              </button>
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Mail size={18} className="text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{worker.email}</p>
              </div>
            </div>
            
            {worker.phone && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Phone size={18} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{worker.phone}</p>
                </div>
              </div>
            )}
            
            {(worker.address_line1 || worker.address_line2) && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <MapPin size={18} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm font-medium text-gray-900">
                    {worker.address_line1}
                    {worker.address_line2 && `, ${worker.address_line2}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Skills & Certifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Skills */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills</h2>
            {worker.skills_json && worker.skills_json.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {worker.skills_json.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-teal-100 text-teal-700 text-sm font-medium rounded-lg"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No skills added yet</p>
            )}
          </div>
          
          {/* Certifications */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h2>
            {worker.certifications && worker.certifications.length > 0 ? (
              <div className="space-y-2">
                {worker.certifications.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Award size={16} className="text-teal-600" />
                      <span className="text-sm font-medium text-gray-900">{cert.name}</span>
                    </div>
                    {cert.expires_at_utc && (
                      <span className="text-xs text-gray-500">
                        Exp: {formatDate(cert.expires_at_utc)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No certifications added yet</p>
            )}
          </div>
        </div>
        
        {/* Assignments */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Tabs */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`py-4 px-1 font-medium transition-colors border-b-2 ${
                  activeTab === 'upcoming'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Upcoming ({upcomingAssignments.length})
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`py-4 px-1 font-medium transition-colors border-b-2 ${
                  activeTab === 'past'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Past ({pastAssignments.length})
              </button>
            </div>
          </div>
          
          {/* Assignment List */}
          <div className="p-6">
            {activeTab === 'upcoming' ? (
              upcomingAssignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No upcoming assignments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{assignment.event.title}</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {assignment.shift.role_needed}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(assignment.shift.start_time_utc)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatTime(assignment.shift.start_time_utc)} - {formatTime(assignment.shift.end_time_utc)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          {assignment.shift.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              pastAssignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No past assignments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{assignment.event.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                            {assignment.shift.role_needed}
                          </span>
                          {assignment.hours_worked && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                              {assignment.hours_worked} hrs
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(assignment.shift.start_time_utc)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          {assignment.shift.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}