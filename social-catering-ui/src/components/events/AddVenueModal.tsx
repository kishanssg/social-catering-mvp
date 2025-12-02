import { useState } from 'react';
import { X, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { venuesApi, type CreateVenueParams, type Venue } from '../../services/venuesApi';

interface AddVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueCreated: (venue: Venue) => void;
  initialName?: string;
}

export function AddVenueModal({ isOpen, onClose, onVenueCreated, initialName = '' }: AddVenueModalProps) {
  const [formData, setFormData] = useState<CreateVenueParams>({
    name: initialName,
    formatted_address: '',
    address: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const venue = await venuesApi.create(formData);
      onVenueCreated(venue);
      handleClose();
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.errors?.join(', ') ||
        err?.response?.data?.error ||
        'Failed to create venue';
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      formatted_address: '',
      address: '',
      notes: '',
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <MapPin className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Venue</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Add a new location to your saved venues. You can edit details later if needed.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="m-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900">Failed to create venue</h4>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Venue Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Venue Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Grand Ballroom, City Hall, Oak Street Pavilion"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              autoFocus
            />
          </div>

          {/* Formatted Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Address (as displayed) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="formatted_address"
              value={formData.formatted_address}
              onChange={handleChange}
              required
              placeholder="123 Main St, City, ST 12345"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Raw Address / Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Address Notes <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </label>
            <textarea
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              rows={3}
              placeholder="Additional address details, building info, etc."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Internal Notes <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={3}
              placeholder="Parking info, contact details, etc."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Venue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


