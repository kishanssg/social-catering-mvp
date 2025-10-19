import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronRight,
  Check,
  X,
  Plus,
  Upload,
  User,
  Award
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

type Step = 'details' | 'skills';

interface WorkerForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  skills: string[];
  certifications: Array<{
    name: string;
    expires_at_utc: string;
  }>;
}

const AVAILABLE_SKILLS = [
  'Server',
  'Bartender',
  'Chef',
  'Line Cook',
  'Sous Chef',
  'Captain',
  'Busser',
  'Host/Hostess',
  'Banquet Server/Runner',
  'Dishwasher'
];

const PRESET_CERTIFICATIONS = [
  'Food Handler Certificate',
  'ServSafe Manager',
  'TIPS Certification',
  'Alcohol Service License',
  'SafeStaff',
  'CPR Certified',
  'First Aid Certified'
];

export function WorkerCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showCertDropdown, setShowCertDropdown] = useState(false);
  
  const [formData, setFormData] = useState<WorkerForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notes: '',
    skills: [],
    certifications: []
  });
  
  useEffect(() => {
    if (isEditMode) {
      loadWorker();
    }
  }, [id]);
  
  async function loadWorker() {
    setLoading(true);
    try {
      const response = await apiClient.get(`/workers/${id}`);
      
      if (response.data.status === 'success') {
        // The API returns { worker: {...} } not { data: {...} }
        const worker = response.data.worker;
        setFormData({
          first_name: worker.first_name || '',
          last_name: worker.last_name || '',
          email: worker.email || '',
          phone: worker.phone || '',
          notes: worker.notes || '',
          skills: worker.skills_json || [],
          certifications: worker.certifications?.map((c: any) => ({
            name: c.name,
            expires_at_utc: c.expires_at_utc ? c.expires_at_utc.split('T')[0] : ''
          })) || []
        });
      }
    } catch (error) {
      console.error('Failed to load worker:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function handleAddSkill(skill: string) {
    if (!formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
    setShowSkillDropdown(false);
  }
  
  function handleRemoveSkill(skill: string) {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  }
  
  function handleAddCertification(certName: string) {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, {
        name: certName,
        expires_at_utc: ''
      }]
    }));
    setShowCertDropdown(false);
  }
  
  function handleRemoveCertification(index: number) {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  }
  
  function handleUpdateCertExpiry(index: number, date: string) {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) => 
        i === index ? { ...cert, expires_at_utc: date } : cert
      )
    }));
  }
  
  async function handleSubmit() {
    // Validate
    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (currentStep === 'details') {
      setCurrentStep('skills');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const url = isEditMode ? `/workers/${id}` : '/workers';
      const method = isEditMode ? 'PATCH' : 'POST';
      
      const response = await apiClient({
        method,
        url,
        data: {
          worker: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            notes: formData.notes,
            skills_json: formData.skills,
            active: true,
            certifications_attributes: formData.certifications.map(cert => ({
              name: cert.name,
              expires_at_utc: cert.expires_at_utc || null
            }))
          }
        }
      });
      
      if (response.data.status === 'success') {
        navigate('/workers');
      } else {
        alert(response.data.errors?.join(', ') || 'Failed to save worker');
      }
    } catch (error) {
      console.error('Failed to save worker:', error);
      alert('Failed to save worker');
    } finally {
      setSubmitting(false);
    }
  }
  
  const availableSkillsFiltered = AVAILABLE_SKILLS.filter(
    skill => !formData.skills.includes(skill)
  );
  
  const availableCertsFiltered = PRESET_CERTIFICATIONS.filter(
    cert => !formData.certifications.some(c => c.name === cert)
  );
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button
            onClick={() => navigate('/workers')}
            className="hover:text-gray-900 transition"
          >
            Workers
          </button>
          <ChevronRight size={16} />
          <span className="text-gray-900">{isEditMode ? 'Edit Worker' : 'Add New Worker'}</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Steps */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              {/* Step 1 */}
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentStep === 'skills' 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-gray-900 text-white'
                }`}>
                  {currentStep === 'skills' ? <Check size={16} /> : '1'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Add New Worker</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Invite a new user to join as a Worker.
                  </p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentStep === 'skills'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
                <div>
                  <h3 className={`font-semibold ${
                    currentStep === 'skills' ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    Add Skills
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Specify Worker's Skills
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              {currentStep === 'details' ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Worker Details</h2>
                  
                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      placeholder="123-456-7890"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full name
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="First name"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Last name"
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email address
                    </label>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  
                  {/* Home Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      placeholder="Additional notes about this worker..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  
                </div>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Skills & Certifications</h2>
                  
                  {/* Skills */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Skills
                    </label>
                    
                    {/* Selected Skills */}
                    <div className="space-y-2 mb-3">
                      {formData.skills.map((skill, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                              <Award size={16} className="text-gray-600" />
                            </div>
                            <span className="font-medium text-gray-900">{skill}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add Skill Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowSkillDropdown(!showSkillDropdown)}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition flex items-center justify-between"
                      >
                        <span>Pick the Skills Needed</span>
                        <Plus size={20} />
                      </button>
                      
                      {showSkillDropdown && (
                        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {availableSkillsFiltered.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              All skills added
                            </div>
                          ) : (
                            availableSkillsFiltered.map(skill => (
                              <button
                                key={skill}
                                onClick={() => handleAddSkill(skill)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition"
                              >
                                {skill}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Certifications */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certifications (Optional)
                    </label>
                    
                    {/* Selected Certifications */}
                    <div className="space-y-2 mb-3">
                      {formData.certifications.map((cert, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                                <Award size={16} className="text-teal-600" />
                              </div>
                              <span className="font-medium text-gray-900">{cert.name}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveCertification(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          {/* Expiry Date */}
                          <div className="ml-11">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Expiration Date (Optional)
                            </label>
                            <input
                              type="date"
                              value={cert.expires_at_utc}
                              onChange={(e) => handleUpdateCertExpiry(index, e.target.value)}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add Certification Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowCertDropdown(!showCertDropdown)}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition flex items-center justify-between"
                      >
                        <span>Add Certification</span>
                        <Plus size={20} />
                      </button>
                      
                      {showCertDropdown && (
                        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {availableCertsFiltered.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              All preset certifications added
                            </div>
                          ) : (
                            availableCertsFiltered.map(cert => (
                              <button
                                key={cert}
                                onClick={() => handleAddCertification(cert)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition"
                              >
                                {cert}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={() => {
              if (currentStep === 'skills') {
                setCurrentStep('details');
              } else {
                navigate('/workers');
              }
            }}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            {currentStep === 'skills' ? 'Back' : 'Cancel'}
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting 
              ? 'Saving...' 
              : currentStep === 'details' 
                ? 'Continue' 
                : isEditMode 
                  ? 'Update Worker' 
                  : 'Create User & Invite'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
