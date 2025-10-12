import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteShift, getShift, type Shift } from '../services/shiftsApi'
import ShiftStatusBadge from '../components/ShiftStatusBadge'
import { format, parseISO } from 'date-fns'
import AssignWorkerModal from '../components/AssignWorkerModal'
import ShiftStatusWorkflow from '../components/ShiftStatusWorkflow'
import ShiftRoster from '../components/ShiftRoster'
import {
  ArrowLeftIcon as ArrowLeft,
  PencilSquareIcon as Edit2,
  TrashIcon as Trash2,
  CalendarDaysIcon as Calendar,
  ClockIcon as Clock,
  MapPinIcon as MapPin,
  CurrencyDollarIcon as DollarSign,
  DocumentTextIcon as FileText,
  UserPlusIcon as UserPlus,
  ExclamationCircleIcon as AlertCircle,
} from '@heroicons/react/24/outline'

export default function ShiftDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  useEffect(() => {
    if (id) {
      loadShift(parseInt(id))
    }
  }, [id])

  const loadShift = async (shiftId: number) => {
    try {
      setLoading(true)
      const response = await getShift(shiftId)
      setShift(response.data.shift)
    } catch (err) {
      setError('Failed to load shift')
       
      console.error('Error loading shift:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteShift(parseInt(id))
      navigate('/shifts')
    } catch (err) {
      setError('Failed to delete shift')
       
      console.error('Error deleting shift:', err)
    }
  }


  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'EEEE, MMMM d, yyyy')
    } catch {
      return dateString
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'h:mm a')
    } catch {
      return dateString
    }
  }

  const calculateDuration = (start: string, end: string) => {
    try {
      const startDate = parseISO(start)
      const endDate = parseISO(end)
      const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      return `${hours.toFixed(1)} hours`
    } catch {
      return 'N/A'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading shift...</div>
      </div>
    )
  }

  if (error && !shift) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button onClick={() => navigate('/shifts')} className="mt-4 text-blue-600 hover:text-blue-700">
          Back to Shifts
        </button>
      </div>
    )
  }

  if (!shift) return null

  const assignedCount = shift.assigned_count || shift.assignments?.length || 0
  const needsMoreWorkers = assignedCount < shift.capacity
  
  // Calculate effective staffing based on completed assignments only
  const completedAssignments = shift.assignments?.filter(a => a.status === 'completed').length || 0
  const effectiveStaffingPercentage = Math.round((completedAssignments / shift.capacity) * 100)
  const isEffectivelyStaffed = completedAssignments >= shift.capacity

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/shifts')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-5 w-5" /> Back to Shifts
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{shift.client_name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <ShiftStatusBadge status={shift.status} />
              <span className="text-gray-600">{shift.role_needed}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to={`/shifts/${shift.id}/edit`} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Edit2 className="h-4 w-4" /> Edit
            </Link>
            <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {needsMoreWorkers && shift.status === 'published' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-900">Shift needs more workers</h3>
            <p className="text-yellow-700 text-sm mt-1">
              {assignedCount} of {shift.capacity} workers assigned. Need {shift.capacity - assignedCount} more {shift.capacity - assignedCount === 1 ? 'worker' : 'workers'}.
            </p>
          </div>
          <button onClick={() => setShowAssignModal(true)} className="btn-green flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Assign Worker
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Date</div>
                  <div className="font-medium text-gray-900">{formatDate(shift.start_time_utc)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Time</div>
                  <div className="font-medium text-gray-900">
                    {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Duration: {calculateDuration(shift.start_time_utc, shift.end_time_utc)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-4">
              {shift.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="font-medium text-gray-900">{shift.location}</div>
                  </div>
                </div>
              )}
              {shift.pay_rate && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Pay Rate</div>
                    <div className="font-medium text-gray-900">${shift.pay_rate}/hour</div>
                  </div>
                </div>
              )}
              {shift.required_certification && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Required Certification</div>
                    <div className="font-medium text-gray-900">{shift.required_certification.name}</div>
                  </div>
                </div>
              )}
              {shift.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">Notes</div>
                    <div className="text-gray-900 whitespace-pre-wrap">{shift.notes}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <ShiftRoster
              shift={shift}
              onUpdate={() => {
                if (id) loadShift(parseInt(id));
              }}
              onAssignWorker={() => setShowAssignModal(true)}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Workers Needed</div>
                <div className="text-2xl font-bold text-gray-900">{shift.capacity}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Assigned</div>
                <div className="text-2xl font-bold text-blue-600">{assignedCount}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Remaining</div>
                <div className="text-2xl font-bold text-yellow-600">{Math.max(0, shift.capacity - completedAssignments)}</div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-gray-500 mb-2">Staffing Progress</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      isEffectivelyStaffed ? 'bg-green-600' : 
                      effectiveStaffingPercentage >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                    }`} 
                    style={{ width: `${Math.min(effectiveStaffingPercentage, 100)}%` }} 
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {effectiveStaffingPercentage}% staffed
                  {completedAssignments < shift.capacity && (
                    <span className="text-red-600 ml-2">
                      ({shift.capacity - completedAssignments} more needed)
                    </span>
                  )}
                  {assignedCount > completedAssignments && (
                    <div className="text-xs text-orange-600 mt-1">
                      ({assignedCount - completedAssignments} no-show{assignedCount - completedAssignments !== 1 ? 's' : ''})
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Status Workflow</h3>
            <ShiftStatusWorkflow
              shift={shift}
              onSuccess={() => {
                if (id) loadShift(parseInt(id))
              }}
            />
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Shift?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this shift? This action cannot be undone.
              {assignedCount > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: This shift has {assignedCount} assigned {assignedCount === 1 ? 'worker' : 'workers'}.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Delete Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && shift && (
        <AssignWorkerModal
          shift={shift}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false)
            if (id) loadShift(parseInt(id))
          }}
        />
      )}
    </div>
  )
}


