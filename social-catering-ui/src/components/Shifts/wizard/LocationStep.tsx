import React from 'react';
import type { Location } from '../../../types/index';

interface LocationStepProps {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  locations: Location[];
}

const LocationStep: React.FC<LocationStepProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrevious,
  locations
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.location_id) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Previous
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default LocationStep;
