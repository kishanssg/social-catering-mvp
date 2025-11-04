import React from 'react';
import type { Location } from '../../../types/index';

interface ReviewStepProps {
  formData: any;
  updateFormData: (data: any) => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  locations: Location[];
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  updateFormData,
  onPrevious,
  onSubmit,
  isSubmitting,
  locations
}) => {
  const selectedLocation = locations.find(l => l.id === formData.location_id);
  
  return (
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
          <p className="font-semibold">{selectedLocation?.display_name}</p>
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
          type="button"
          onClick={onPrevious}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Shift'}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
