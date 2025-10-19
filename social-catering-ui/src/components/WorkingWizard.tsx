import React, { useState } from 'react';

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

const WorkingWizard: React.FC = () => {
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

  // Mock data instead of API calls
  const skills = [
    'Server', 'Bartender', 'Host/Hostess', 'Line Cook', 'Prep Cook', 
    'Dishwasher', 'Event Setup', 'Event Captain', 'Barista', 'Food Runner', 
    'Busser', 'Cashier'
  ];

  const locations = [
    { id: 1, name: 'FSU Alumni Center', full_address: '1030 W Pensacola St, Tallahassee, FL', display_name: 'FSU Alumni Center - Tallahassee, FL' },
    { id: 2, name: 'Goodwood Museum & Gardens', full_address: '1600 Miccosukee Rd, Tallahassee, FL', display_name: 'Goodwood Museum & Gardens - Tallahassee, FL' },
    { id: 3, name: 'Mission San Luis', full_address: '2100 W Tennessee St, Tallahassee, FL', display_name: 'Mission San Luis - Tallahassee, FL' },
    { id: 4, name: 'The Edison Restaurant', full_address: '470 Suwannee St, Tallahassee, FL', display_name: 'The Edison Restaurant - Tallahassee, FL' },
    { id: 5, name: 'Capital City Country Club', full_address: '1601 Golf Terrace Dr, Tallahassee, FL', display_name: 'Capital City Country Club - Tallahassee, FL' }
  ];

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Working Shift Wizard</h1>
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800">Data Status:</h3>
        <p className="text-blue-700">Skills: {skills.length} loaded (mock data)</p>
        <p className="text-blue-700">Locations: {locations.length} loaded (mock data)</p>
      </div>
      
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${currentStep === step.number 
                    ? 'bg-blue-600 text-white' 
                    : currentStep > step.number
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'}
                `}
              >
                {currentStep > step.number ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span className={`ml-2 ${currentStep === step.number ? 'font-semibold' : ''}`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div 
                className={`flex-1 h-1 mx-4 ${
                  currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.client_name}
                  onChange={(e) => updateFormData({ client_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., FSU Foundation Gala"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Needed *
                </label>
                <select
                  required
                  value={formData.role_needed}
                  onChange={(e) => updateFormData({ role_needed: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a role...</option>
                  {skills.map(skill => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => updateFormData({ capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.pay_rate}
                    onChange={(e) => updateFormData({ pay_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateFormData({ notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any special instructions or requirements..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Step 2: Location */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Select Location</h2>
            <div className="space-y-3">
              {locations.map(location => (
                <label
                  key={location.id}
                  className={`
                    block p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${formData.location_id === location.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <input
                    type="radio"
                    name="location"
                    value={location.id}
                    checked={formData.location_id === location.id}
                    onChange={() => updateFormData({ location_id: location.id })}
                    className="sr-only"
                  />
                  <div className="flex items-start">
                    <div className="flex-1">
                      <p className="font-semibold">{location.name}</p>
                      <p className="text-sm text-gray-600">{location.full_address}</p>
                    </div>
                    {formData.location_id === location.id && (
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={handlePrevious}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Schedule */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Schedule</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Start Date & Time</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => updateFormData({ 
                        start_date: e.target.value,
                        end_date: formData.end_date || e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => updateFormData({ start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">End Date & Time</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      min={formData.start_date}
                      onChange={(e) => updateFormData({ end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => updateFormData({ end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  💡 Tip: For same-day shifts, the end date will match the start date automatically.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={handlePrevious}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Review & Submit</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-sm text-gray-600">Client:</span>
                <p className="font-semibold">{formData.client_name}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Role:</span>
                <p className="font-semibold">{formData.role_needed}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Location:</span>
                <p className="font-semibold">
                  {locations.find(l => l.id === formData.location_id)?.display_name || 'Not selected'}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Schedule:</span>
                <p className="font-semibold">
                  {formData.start_date} {formData.start_time} - {formData.end_date} {formData.end_time}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Capacity:</span>
                  <p className="font-semibold">{formData.capacity} workers</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Hourly Rate:</span>
                  <p className="font-semibold">${formData.pay_rate}/hr</p>
                </div>
              </div>
              
              {formData.notes && (
                <div>
                  <span className="text-sm text-gray-600">Notes:</span>
                  <p className="font-semibold">{formData.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.status === 'published'}
                  onChange={(e) => updateFormData({ 
                    status: e.target.checked ? 'published' : 'draft' 
                  })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm">Publish shift immediately (workers can see and sign up)</span>
              </label>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Shift'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkingWizard;
