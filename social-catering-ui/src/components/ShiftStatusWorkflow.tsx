import { useState } from 'react'
import { updateShift, type Shift } from '../services/shiftsApi'
import ShiftStatusBadge from './ShiftStatusBadge'
import { CheckIcon as Check, ArrowRightIcon as ArrowRight, ExclamationCircleIcon as AlertCircle } from '@heroicons/react/24/outline'

interface ShiftStatusWorkflowProps {
  shift: Shift
  onSuccess: () => void
}

export default function ShiftStatusWorkflow({ shift, onSuccess }: ShiftStatusWorkflowProps) {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  const statusFlow: Record<string, { next: string | null; label: string; canProgress: boolean }> = {
    draft: { next: 'published', label: 'Publish Shift', canProgress: true },
    published: { next: 'filled', label: 'Mark as Filled', canProgress: false },
    filled: { next: 'completed', label: 'Mark as Completed', canProgress: true },
    completed: { next: null, label: 'Completed', canProgress: false },
    cancelled: { next: null, label: 'Cancelled', canProgress: false },
  }

  const currentFlow = statusFlow[shift.status]
  const assignedCount = shift.assignments?.length || 0
  const isFullyStaffed = assignedCount >= shift.capacity

  const canTransitionToFilled = shift.status === 'published' && isFullyStaffed
  const nextStatus = canTransitionToFilled ? 'filled' : currentFlow?.next
  const nextLabel = canTransitionToFilled ? 'Mark as Filled' : currentFlow?.label

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true)
    setError('')
    try {
      await updateShift(shift.id, { status: newStatus as any })
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update status')
      // eslint-disable-next-line no-console
      console.error('Error updating status:', err)
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = async () => {
    // eslint-disable-next-line no-alert
    if (!confirm('Are you sure you want to cancel this shift?')) return
    setUpdating(true)
    setError('')
    try {
      await updateShift(shift.id, { status: 'cancelled' })
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to cancel shift')
      // eslint-disable-next-line no-console
      console.error('Error cancelling shift:', err)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-500 mb-2">Current Status</div>
        <ShiftStatusBadge status={shift.status} />
      </div>

      <div className="space-y-2">
        {(['draft', 'published', 'filled', 'completed'] as const).map((status, index) => {
          const order = ['draft', 'published', 'filled', 'completed']
          const isActive = shift.status === status
          const isPast = order.indexOf(shift.status) > index
          const isCancelled = shift.status === 'cancelled'

          return (
            <div key={status} className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isPast || isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                } ${isCancelled ? 'bg-gray-300' : ''}`}
              >
                {isPast ? <Check className="h-5 w-5" /> : <span className="text-sm font-medium">{index + 1}</span>}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
                {isActive && status === 'published' && !isFullyStaffed && (
                  <div className="text-xs text-yellow-600 mt-1">
                    Need {shift.capacity - assignedCount} more {shift.capacity - assignedCount === 1 ? 'worker' : 'workers'} to mark as filled
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {shift.status !== 'completed' && shift.status !== 'cancelled' && (
        <div className="space-y-2">
          {nextStatus && (
            <button
              onClick={() => handleStatusChange(nextStatus)}
              disabled={
                updating || (shift.status === 'published' && !isFullyStaffed && !canTransitionToFilled)
              }
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {updating ? (
                'Updating...'
              ) : (
                <>
                  {nextLabel}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCancel}
            disabled={updating}
            className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel Shift
          </button>
        </div>
      )}

      {(shift.status === 'completed' || shift.status === 'cancelled') && (
        <div className="text-sm text-gray-500 text-center py-4">This shift is {shift.status}</div>
      )}
    </div>
  )
}



