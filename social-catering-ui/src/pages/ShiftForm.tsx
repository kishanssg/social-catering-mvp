import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createShift, getShift, updateShift } from '../services/shiftsApi'
import {
  ArrowLeftIcon as ArrowLeft,
  CalendarDaysIcon as Calendar,
  ClockIcon as Clock,
  UsersIcon as Users,
  MapPinIcon as MapPin,
  CurrencyDollarIcon as DollarSign,
  DocumentTextIcon as FileText,
  CheckIcon as Save,
} from '@heroicons/react/24/outline'

export default function ShiftForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [loadingShift, setLoadingShift] = useState(isEditMode)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    client_name: '',
    role_needed: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    capacity: 1 as number | string,
    location: '',
    pay_rate: '',
    notes: '',
    status: 'draft',
  })

  useEffect(() => {
    if (isEditMode && id) {
      loadShift(parseInt(id))
    }
  }, [id, isEditMode])

  const loadShift = async (shiftId: number) => {
    try {
      const response = await getShift(shiftId)
      const shift = response.data.shift

      const startDate = new Date(shift.start_time_utc)
      const endDate = new Date(shift.end_time_utc)

      setFormData({
        client_name: shift.client_name,
        role_needed: shift.role_needed,
        start_date: startDate.toISOString().split('T')[0],
        start_time: startDate.toTimeString().slice(0, 5),
        end_date: endDate.toISOString().split('T')[0],
        end_time: endDate.toTimeString().slice(0, 5),
        capacity: shift.capacity,
        location: shift.location || '',
        pay_rate: shift.pay_rate?.toString() || '',
        notes: shift.notes || '',
        status: shift.status,
      })
    } catch (err) {
      setError('Failed to load shift')
      // eslint-disable-next-line no-console
      console.error('Error loading shift:', err)
    } finally {
      setLoadingShift(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const start_time_utc = new Date(`${formData.start_date}T${formData.start_time}:00`).toISOString()
      const end_time_utc = new Date(`${formData.end_date}T${formData.end_time}:00`).toISOString()

      const shiftData = {
        client_name: formData.client_name,
        role_needed: formData.role_needed,
        start_time_utc,
        end_time_utc,
        capacity: parseInt(String(formData.capacity)),
        location: formData.location || undefined,
        pay_rate: formData.pay_rate ? parseFloat(formData.pay_rate) : undefined,
        notes: formData.notes || undefined,
        status: formData.status as 'draft' | 'published' | 'assigned' | 'completed' | 'cancelled',
      }

      if (isEditMode && id) {
        await updateShift(parseInt(id), shiftData)
      } else {
        await createShift(shiftData)
      }

      navigate('/shifts')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save shift')
      // eslint-disable-next-line no-console
      console.error('Error saving shift:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (loadingShift) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading shift...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/shifts')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Shifts
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Shift' : 'Create New Shift'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isEditMode ? 'Update shift details' : 'Schedule a new shift for your team'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="e.g., Marriott Hotel Downtown"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role Needed *</label>
                <select
                  name="role_needed"
                  value={formData.role_needed}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  <option value="">Select a role</option>
                  <option value="Server">Server</option>
                  <option value="Bartender">Bartender</option>
                  <option value="Chef">Chef</option>
                  <option value="Dishwasher">Dishwasher</option>
                  <option value="Event Coordinator">Event Coordinator</option>
                  <option value="Prep Cook">Prep Cook</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="inline h-4 w-4 mr-1" /> Workers Needed *
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                  min={1}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" /> Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" /> Start Time *
                </label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" /> End Date *
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" /> End Time *
                </label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" /> Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., 123 Main St, Downtown"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" /> Pay Rate (per hour)
                </label>
                <input
                  type="number"
                  name="pay_rate"
                  value={formData.pay_rate}
                  onChange={handleChange}
                  step="0.01"
                  min={0}
                  className="input-field"
                  placeholder="e.g., 25.00"
                />
              </div>

              <div>
                <label className="block text sm font-medium text-gray-700 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" /> Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="input-field"
                  placeholder="Any special instructions or requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="assigned">Assigned</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">Draft shifts are not visible to workers</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/shifts')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="h-5 w-5" /> {loading ? 'Saving...' : isEditMode ? 'Update Shift' : 'Create Shift'}
          </button>
        </div>
      </form>
    </div>
  )
}


