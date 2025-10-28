import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronRight,
  Check,
  X,
  Plus,
  Upload,
  User
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Toast } from '../components/common/Toast';
import checkIcon from '../assets/icons/check.svg';
import ellipseIcon from '../assets/icons/Ellipse_workerscreen.svg';
import workerCheckIcon from '../assets/icons/worker_check.svg';
import bartenderIcon from '../assets/icons/Skills/Bartender.svg';
import banquetServerIcon from '../assets/icons/Skills/Banquet Server.svg';
import captainIcon from '../assets/icons/Skills/Captain.svg';
import eventHelperIcon from '../assets/icons/Skills/Event Helper.svg';
import prepCookIcon from '../assets/icons/Skills/Prep Cook.svg';

type Step = 'details' | 'skills';

interface WorkerForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  profile_photo_url: string;
  skills: string[];
  // Nested attributes array that backend expects
  worker_certifications_attributes: Array<{
    id?: number | null;
    certification_id: number;
    expires_at_utc: string; // YYYY-MM-DD
    _destroy?: boolean;
    // local-only for UI rendering
    name?: string;
  }>;
}

// Global certifications list fetched from API
interface Certification { id: number; name: string }

export function WorkerCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showCertDropdown, setShowCertDropdown] = useState(false);
  const [certificationsCatalog, setCertificationsCatalog] = useState<Certification[]>([]);
  
  const [formData, setFormData] = useState<WorkerForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    profile_photo_url: '',
    skills: [],
    worker_certifications_attributes: []
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }>({});

  // Toast state
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ isVisible: false, message: '', type: 'success' });

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Only accept digits (no hyphens, spaces, or special characters)
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  };
  
  const handlePhoneChange = (value: string) => {
    // Strip out all non-numeric characters
    const digitsOnly = value.replace(/\D/g, '');
    setFormData({ ...formData, phone: digitsOnly });
  };

  // Available skills with icons (matching CreateEventWizard)
  const availableSkills = [
    { name: 'Bartender', icon: bartenderIcon },
    { name: 'Banquet Server/Runner', icon: banquetServerIcon },
    { name: 'Captain', icon: captainIcon },
    { name: 'Event Helper', icon: eventHelperIcon },
    { name: 'Prep Cook', icon: prepCookIcon },
  ];

  const getSkillIcon = (skillName: string) => {
    const skillIconMap: { [key: string]: string } = {
      'Bartender': bartenderIcon,
      'Banquet Server/Runner': banquetServerIcon,
      'Captain': captainIcon,
      'Event Helper': eventHelperIcon,
      'Prep Cook': prepCookIcon,
    };
    return skillIconMap[skillName] || bartenderIcon; // Default to bartender icon
  };
  
  useEffect(() => {
    // Load global certifications for consistent selection everywhere
    (async () => {
      try {
        const res = await apiClient.get('/certifications');
        const list = res.data?.data || res.data || [];
        setCertificationsCatalog(list);
      } catch (e) {
        console.error('Failed to load certifications catalog', e);
      }
    })();

    if (isEditMode) {
      loadWorker();
    }
  }, [id]);
  
  async function loadWorker() {
    setLoading(true);
    try {
      const response = await apiClient.get(`/workers/${id}`);
      
      if (response.data.status === 'success') {
        // The API returns { data: { worker: {...} }, status: "success" }
        const worker = response.data.data.worker;
        // Normalize certifications: handle both worker.worker_certifications (array/object) and worker.certifications
        const rawCerts = Array.isArray(worker?.worker_certifications)
          ? worker.worker_certifications
          : Array.isArray(worker?.certifications)
            ? worker.certifications
            : [];
        const normalizedCerts = Array.isArray(rawCerts) ? rawCerts : [];
        setFormData({
          first_name: worker.first_name || '',
          last_name: worker.last_name || '',
          email: worker.email || '',
          phone: worker.phone ? worker.phone.replace(/\D/g, '') : '',
          address_line1: worker.address_line1 || '',
          address_line2: worker.address_line2 || '',
          profile_photo_url: worker.profile_photo_url || '',
          skills: worker.skills_json || [],
          // Map existing worker_certifications (if present in API) into nested attributes
          worker_certifications_attributes: normalizedCerts.map((wc: any) => ({
            id: wc.id,
            certification_id: wc.certification?.id ?? wc.certification_id ?? wc.id,
            name: wc.certification?.name ?? wc.name,
            expires_at_utc: wc.expires_at_utc ? String(wc.expires_at_utc).split('T')[0] : '',
            _destroy: false
          }))
        });
        if (worker.profile_photo_url) setPhotoPreview(worker.profile_photo_url);
      }
    } catch (error) {
      console.error('Failed to load worker:', error);
    } finally {
      setLoading(false);
    }
  }

  function onChoosePhoto() {
    fileInputRef.current?.click();
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }
  
  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Frontend required field guard
      validateField('first_name', formData.first_name);
      validateField('last_name', formData.last_name);
      validateField('email', formData.email);
      validateField('phone', formData.phone);
      const firstOk = formData.first_name.trim().length >= 2;
      const lastOk = formData.last_name.trim().length >= 2;
      const emailOk = !!formData.email.trim() && validateEmail(formData.email);
      const phoneOk = !!formData.phone.trim() && validatePhone(formData.phone);
      if (!firstOk || !lastOk || !emailOk || !phoneOk) {
        setSubmitting(false);
        return;
      }

      const method = isEditMode ? 'PATCH' : 'POST';
      const url = isEditMode ? `/workers/${id}` : '/workers';

      const form = new FormData();
      form.append('worker[first_name]', formData.first_name);
      form.append('worker[last_name]', formData.last_name);
      form.append('worker[email]', formData.email);
      form.append('worker[phone]', formData.phone);
      form.append('worker[address_line1]', formData.address_line1);
      form.append('worker[address_line2]', formData.address_line2);
      formData.skills.forEach((s) => form.append('worker[skills_json][]', s));
      // Always include nested attributes entries; backend will handle _destroy and id mapping
      formData.worker_certifications_attributes.forEach((c, i) => {
        if (c.id != null) {
          form.append(`worker[worker_certifications_attributes][${i}][id]`, String(c.id));
        }
        form.append(`worker[worker_certifications_attributes][${i}][certification_id]`, String(c.certification_id));
        if (c.expires_at_utc) {
          form.append(`worker[worker_certifications_attributes][${i}][expires_at_utc]`, c.expires_at_utc);
        }
        if (c._destroy) {
          form.append(`worker[worker_certifications_attributes][${i}][_destroy]`, 'true');
        }
      });
      if (photoFile) form.append('profile_photo', photoFile);

      const response = await apiClient.request({ method, url, data: form });
      
      if (response.data.status === 'success') {
        navigate('/workers');
      } else {
        setToast({
          isVisible: true,
          message: response.data.errors?.join(', ') || 'Failed to save worker',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Failed to save worker:', error);
      let errorMessage = 'Failed to save worker';
      
      if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setToast({
        isVisible: true,
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  }
  
  
  const availableCertsFiltered = (certificationsCatalog || []).filter((cert) => {
    const certs = Array.isArray(formData.worker_certifications_attributes)
      ? formData.worker_certifications_attributes
      : [];
    return !certs.some((c) => c.certification_id === cert.id && !c._destroy);
  });

  // Define steps similar to CreateEventWizard
  const steps = [
    {
      id: 1,
      title: 'Add New Worker',
      description: 'Invite a new user to join as a Worker.',
      completed: currentStep === 'skills',
      active: currentStep === 'details'
    },
    {
      id: 2,
      title: 'Add Skills',
      description: 'Specify Worker\'s Skills.',
      completed: false,
      active: currentStep === 'skills'
    }
  ];

  const validateField = (name: keyof typeof fieldErrors, value: string) => {
    const errors = { ...fieldErrors };
    
    switch(name) {
      case 'first_name':
        if (value.length < 2) {
          errors.first_name = 'First name must be at least 2 characters';
        } else {
          delete errors.first_name;
        }
        break;
      case 'last_name':
        if (value.length < 2) {
          errors.last_name = 'Last name must be at least 2 characters';
        } else {
          delete errors.last_name;
        }
        break;
      case 'email':
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (!validateEmail(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
      case 'phone':
        if (value.length > 0 && !validatePhone(value)) {
          errors.phone = 'Please enter a valid phone number (10-15 digits only, no hyphens or spaces)';
        } else {
          delete errors.phone;
        }
        break;
    }
    
    setFieldErrors(errors);
  };

  const canContinue = () => {
    if (currentStep === 'details') {
      const hasValidFirstName = formData.first_name.trim().length >= 2;
      const hasValidLastName = formData.last_name.trim().length >= 2;
      const hasValidEmail = !!formData.email.trim() && validateEmail(formData.email);
      const hasValidPhone = !!formData.phone.trim() && validatePhone(formData.phone);
      
      return hasValidFirstName && hasValidLastName && hasValidEmail && hasValidPhone;
    }
    return true;
  };

  const handleContinue = () => {
    if (currentStep === 'details') {
      setCurrentStep('skills');
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep === 'skills') {
      setCurrentStep('details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button
              onClick={() => navigate('/workers')}
              className="hover:text-gray-900 transition"
            >
              Workers
            </button>
            <ChevronRight size={16} />
            <span className="text-gray-900">{isEditMode ? 'Edit Worker' : 'Add New Worker'}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 justify-center gap-12 px-8 min-h-0" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        {/* Progress rail */}
        <div className="w-[280px] flex-shrink-0 self-start">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4" style={{ minHeight: index < steps.length - 1 ? '100px' : 'auto' }}>
              <div className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: step.completed ? '#FFFFFF' : step.active ? '#000000' : 'transparent',
                    border: step.completed || step.active ? '2px solid #000000' : '0.8px solid #292826',
                    boxShadow: (step.active || step.completed) ? '0 2px 8px 0 rgba(0,0,0,0.04)' : 'none',
                  }}
                >
                  {step.completed ? (
                    <img src={checkIcon} width="18" height="18" alt="Completed" className="flex-shrink-0" />
                  ) : step.active ? (
                    <div className="rounded-full bg-white" style={{ width: '12px', height: '12px' }} />
                  ) : null}
                </div>
                {index < steps.length - 1 && <div className="flex-1" style={{ width: '2px', backgroundColor: 'rgba(0,0,0,0.5)' }} />}
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <span className="text-sm font-bold font-manrope leading-[140%] text-font-primary">{step.title}</span>
                <span className="text-sm font-normal font-manrope leading-[140%] text-font-secondary">{step.description}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="flex flex-col p-8 rounded-lg border border-primary-color/10 bg-white self-start overflow-visible"
             style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)', maxWidth: '850px', width: '100%', minHeight: '600px' }}>
          {/* Form Content */}
          <div className="flex flex-col gap-6 flex-1 overflow-visible pr-2"
            style={{
              fontFamily: 'Manrope, sans-serif',
            }}>
            
            {currentStep === 'details' ? (
              <>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold text-font-primary">Worker Details</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Phone number */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-font-primary">Phone number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={() => validateField('phone', formData.phone)}
                      className={`px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                        fieldErrors.phone ? 'border-red-500' : 'border-gray-300 focus:ring-teal-500'
                      }`}
                      placeholder="1234567890"
                    />
                    {fieldErrors.phone && (
                      <p className="text-sm text-red-600">{fieldErrors.phone}</p>
                    )}
                  </div>

                  {/* Full name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-font-primary">First name</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        onBlur={() => validateField('first_name', formData.first_name)}
                        className={`px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                          fieldErrors.first_name ? 'border-red-500' : 'border-gray-300 focus:ring-teal-500'
                        }`}
                        placeholder="First name"
                      />
                      {fieldErrors.first_name && (
                        <p className="text-sm text-red-600">{fieldErrors.first_name}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-font-primary">Last name</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        onBlur={() => validateField('last_name', formData.last_name)}
                        className={`px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                          fieldErrors.last_name ? 'border-red-500' : 'border-gray-300 focus:ring-teal-500'
                        }`}
                        placeholder="Last name"
                      />
                      {fieldErrors.last_name && (
                        <p className="text-sm text-red-600">{fieldErrors.last_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Email address */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-font-primary">Email address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onBlur={() => validateField('email', formData.email)}
                      className={`px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                        fieldErrors.email ? 'border-red-500' : 'border-gray-300 focus:ring-teal-500'
                      }`}
                      placeholder="Email address"
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-red-600">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Home address */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-font-primary">Home address</label>
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        type="text"
                        value={formData.address_line1}
                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Address line 1"
                      />
                      <input
                        type="text"
                        value={formData.address_line2}
                        onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Address line 2"
                      />
                    </div>
                  </div>

                  {/* Profile Photo */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-font-primary">Profile Photo</label>
                    <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-lg">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" className="w-16 h-16 object-cover" />
                        ) : (
                          <User size={24} className="text-gray-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
                        <button type="button" onClick={onChoosePhoto} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2">
                          <Upload size={16} />
                          {photoPreview ? 'Change Photo' : 'Upload Photo'}
                        </button>
                        {photoPreview && (
                          <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="text-red-600 hover:text-red-700 text-sm">
                            Remove
                          </button>
                        )}
                        <span className="text-xs text-gray-500">JPG, PNG up to 5MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold text-font-primary">Worker Skills</h2>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Skills Section */}
                  <div className="flex flex-col gap-4">
                    <label className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">Skills</label>
                    
                    {/* Skills Dropdown */}
                    <div className="relative">
                      <div 
                        className="flex items-center justify-between h-11 px-4 rounded-lg border border-primary-color/10 bg-white cursor-pointer hover:border-primary-color/30 transition-colors"
                        onClick={() => setShowSkillDropdown(!showSkillDropdown)}
                      >
                        <span className="text-sm font-normal font-manrope leading-[140%] text-primary-color">
                          {formData.skills.length > 0 ? formData.skills.join(', ') : 'Pick the Skills the Worker Has'}
                        </span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 6L8 10L12 6" stroke="#292826" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>

                      {/* Skills Dropdown */}
                      {showSkillDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-primary-color/10 rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                          {availableSkills
                            .filter(skill => !formData.skills.includes(skill.name))
                            .map((skill) => (
                              <div
                                key={skill.name}
                                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                                onClick={() => {
                                  setFormData({ ...formData, skills: [...formData.skills, skill.name] });
                                  setShowSkillDropdown(false);
                                }}
                              >
                                <img 
                                  src={skill.icon} 
                                  width="20" 
                                  height="20" 
                                  alt={skill.name}
                                  className="flex-shrink-0"
                                  style={{ imageRendering: 'crisp-edges' }}
                                />
                                <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">
                                  {skill.name}
                                </span>
                              </div>
                            ))}
                          {formData.skills.length === availableSkills.length && (
                            <div className="px-3 py-2.5 text-sm text-gray-500 text-center">
                              All skills selected
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected Skills Cards */}
                    {formData.skills.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {formData.skills.map((skillName) => (
                          <div
                            key={skillName}
                            className="flex items-center justify-between p-3 rounded-lg border border-primary-color/10 bg-white"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
                          >
                            <div className="flex items-center gap-3">
                              <img 
                                src={getSkillIcon(skillName)} 
                                width="24" 
                                height="24" 
                                alt={skillName}
                                className="flex-shrink-0"
                                style={{ imageRendering: 'crisp-edges' }}
                              />
                              <span className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">
                                {skillName}
                              </span>
                            </div>
                            <button
                              onClick={() => setFormData({ ...formData, skills: formData.skills.filter(s => s !== skillName) })}
                              className="flex items-center justify-center w-6 h-6 text-red-500 hover:bg-red-50 rounded"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Certifications */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-font-primary">Certifications</label>
                    <div className="space-y-3">
                      {(Array.isArray(formData.worker_certifications_attributes)
                        ? formData.worker_certifications_attributes
                        : []
                      ).map((cert, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <select
                              value={cert.certification_id || ''}
                              onChange={(e) => {
                                const selectedId = parseInt(e.target.value || '0', 10);
                                const selected = certificationsCatalog.find(c => c.id === selectedId);
                                const newCerts = [...formData.worker_certifications_attributes];
                                newCerts[index].certification_id = selectedId;
                                newCerts[index].name = selected?.name || '';
                                setFormData({ ...formData, worker_certifications_attributes: newCerts });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                            >
                              <option value="">Select certification…</option>
                              {certificationsCatalog.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <input
                              type="date"
                              value={cert.expires_at_utc}
                              onChange={(e) => {
                                const newCerts = [...formData.worker_certifications_attributes];
                                newCerts[index].expires_at_utc = e.target.value;
                                setFormData({ ...formData, worker_certifications_attributes: newCerts });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newCerts = [...formData.worker_certifications_attributes];
                              if (newCerts[index].id) {
                                newCerts[index]._destroy = true;
                              } else {
                                newCerts.splice(index, 1);
                              }
                              setFormData({ ...formData, worker_certifications_attributes: newCerts });
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCertDropdown(!showCertDropdown)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        <Plus size={16} />
                        <span>Add Certification</span>
                      </button>
                      
                      {showCertDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                          {availableCertsFiltered.map((cert) => (
                            <button
                              type="button"
                              key={cert.id}
                              onClick={() => {
                                // Prevent duplicates; if exists and marked for destroy, unmark instead
                                const existingIdx = formData.worker_certifications_attributes.findIndex(
                                  (c) => c.certification_id === cert.id && !c._destroy
                                );
                                if (existingIdx !== -1) {
                                  setShowCertDropdown(false);
                                  return;
                                }
                                const resurrectIdx = formData.worker_certifications_attributes.findIndex(
                                  (c) => c.certification_id === cert.id && c._destroy
                                );
                                if (resurrectIdx !== -1) {
                                  const newCerts = [...formData.worker_certifications_attributes];
                                  newCerts[resurrectIdx]._destroy = false;
                                  setFormData({ ...formData, worker_certifications_attributes: newCerts });
                                  setShowCertDropdown(false);
                                  return;
                                }
                                setFormData({
                                  ...formData,
                                  worker_certifications_attributes: [
                                    ...formData.worker_certifications_attributes,
                                    { id: null, certification_id: cert.id, name: cert.name, expires_at_utc: '', _destroy: false }
                                  ]
                                });
                                setShowCertDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                            >
                              {cert.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center gap-4 pt-6 border-t border-gray-200">
            {/* Left side - Back button */}
            <div>
              {currentStep === 'skills' && (
                <button 
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>
              )}
            </div>

            {/* Right side - Cancel and Continue/Create */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/workers')}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!canContinue() || submitting}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? 'Saving...' : currentStep === 'details' ? 'Continue' : (isEditMode ? 'Update Worker' : 'Create Worker')}
              </button>
            </div>
          </div>
        </div>
      </div>

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