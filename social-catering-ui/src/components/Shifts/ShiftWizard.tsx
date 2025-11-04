import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createShift } from '../../services/api';
import { useLocations } from '../../hooks/useLocations';
import { useSkills } from '../../hooks/useSkills';
import StepIndicator from './StepIndicator';
import BasicInfoStep from './wizard/BasicInfoStep';
import LocationStep from './wizard/LocationStep';
import ScheduleStep from './wizard/ScheduleStep';
import ReviewStep from './wizard/ReviewStep';

interface ShiftFormData {
  client_name: string;
  role_needed: string;
  location_id: number | null;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  capacity: number;
  pay_rate: number;
  notes: string;
  status: 'draft' | 'published';
}

const ShiftWizard: React.FC = () => {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const { skills } = useSkills();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ShiftFormData>({
    client_name: '',
    role_needed: '',
    location_id: null,
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    capacity: 1,
    pay_rate: 15.00,
    notes: '',
    status: 'draft'
  });

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Location' },
    { number: 3, title: 'Schedule' },
    { number: 4, title: 'Review' }
  ];

  const updateFormData = (data: Partial<ShiftFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Combine date and time into UTC datetime
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);
      
      const shiftData = {
        client_name: formData.client_name,
        role_needed: formData.role_needed,
        location_id: formData.location_id,
        start_time_utc: startDateTime.toISOString(),
        end_time_utc: endDateTime.toISOString(),
        capacity: formData.capacity,
        pay_rate: formData.pay_rate,
        notes: formData.notes,
        status: formData.status
      };
      
      await createShift(shiftData);
      navigate('/shifts');
    } catch (error) {
      console.error('Failed to create shift:', error);
      alert('Failed to create shift. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Shift</h1>
      
      <StepIndicator steps={steps} currentStep={currentStep} />
      
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        {currentStep === 1 && (
          <BasicInfoStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            skills={skills.map(s => s.name)}
          />
        )}
        
        {currentStep === 2 && (
          <LocationStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            locations={locations}
          />
        )}
        
        {currentStep === 3 && (
          <ScheduleStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )}
        
        {currentStep === 4 && (
          <ReviewStep
            formData={formData}
            updateFormData={updateFormData}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            locations={locations}
          />
        )}
      </div>
    </div>
  );
};

export default ShiftWizard;