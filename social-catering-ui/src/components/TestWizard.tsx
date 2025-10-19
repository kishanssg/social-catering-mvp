import React, { useState } from 'react';
import { useLocations } from '../hooks/useLocations';
import { useSkills } from '../hooks/useSkills';
import StepIndicator from './Shifts/StepIndicator';
import BasicInfoStep from './Shifts/wizard/BasicInfoStep';
import LocationStep from './Shifts/wizard/LocationStep';
import ScheduleStep from './Shifts/wizard/ScheduleStep';
import ReviewStep from './Shifts/wizard/ReviewStep';

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

const TestWizard: React.FC = () => {
  const { locations, loading: locationsLoading, error: locationsError } = useLocations();
  const { skills, loading: skillsLoading, error: skillsError } = useSkills();
  
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
      console.log('Form submitted with data:', formData);
      alert('Wizard test successful! Check console for data.');
    } catch (error) {
      console.error('Failed to submit:', error);
      alert('Test failed. Check console for errors.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (locationsLoading || skillsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading wizard data...</p>
        </div>
      </div>
    );
  }

  if (locationsError || skillsError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading Data</h2>
          <p className="text-red-600 mt-2">
            {locationsError && `Locations: ${locationsError}`}
            {skillsError && `Skills: ${skillsError}`}
          </p>
          <p className="text-red-600 mt-2">Make sure the backend is running on port 3001</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Shift Wizard</h1>
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800">Data Status:</h3>
        <p className="text-blue-700">Skills: {skills.length} loaded</p>
        <p className="text-blue-700">Locations: {locations.length} loaded</p>
      </div>
      
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

export default TestWizard;
