import React from 'react';

interface BasicInfoStepProps {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  skills: string[];
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  updateFormData,
  onNext,
  skills
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.client_name && formData.role_needed) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
              step="0.50"
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
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default BasicInfoStep;
