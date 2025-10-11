import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShifts } from '../hooks/useShifts'
import AssignWorkerModal from '../components/AssignWorkerModal'
import BulkAssignModal from '../components/BulkAssignModal'
import type { Shift } from '../services/shiftsApi'
import ShiftStatusBadge from '../components/ShiftStatusBadge'
import { format, parseISO } from 'date-fns'
import {
  CalendarDaysIcon as Calendar,
  ClockIcon as Clock,
  UsersIcon as Users,
  MapPinIcon as MapPin,
  CurrencyDollarIcon as DollarSign,
  PlusIcon as Plus,
  MagnifyingGlassIcon as Search,
} from '@heroicons/react/24/outline'

export default function ShiftsList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [quickAssignShift, setQuickAssignShift] = useState<Shift | null>(null)
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)

  const { shifts, loading, error, refetch } = useShifts({
    status: statusFilter || undefined,
    role: roleFilter || undefined,
    start_date: dateFilter || undefined,
  })

  const filteredShifts = shifts.filter((shift) =>
    shift.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shift.role_needed.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const uniqueRoles = Array.from(new Set(shifts.map((s) => s.role_needed)))

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy')
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

  const getAssignmentStatus = (shift: any) => {
    const assigned = shift.assignments?.length || 0
    const capacity = shift.capacity

    if (assigned === 0) return { text: 'No workers', color: 'text-red-600' }
    if (assigned < capacity) return { text: `${assigned}/${capacity} assigned`, color: 'text-yellow-600' }
    return { text: 'Fully staffed', color: 'text-green-600' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading shifts...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
          <p className="text-gray-500 mt-1">Manage and schedule your shifts</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bulk Assign Button */}
          <button
            onClick={() => setShowBulkAssignModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Bulk Assign
          </button>
          
          <Link
            to="/shifts/new"
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Shift
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search shifts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full input-field"
              aria-label="Search shifts by client name or role"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="filled">Filled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Roles</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input-field"
            aria-label="Filter shifts by date"
          />
        </div>

        {(searchTerm || statusFilter || roleFilter || dateFilter) && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-gray-500">Active filters:</span>
            {searchTerm && <span className="bg-gray-100 px-2 py-1 rounded">Search: "{searchTerm}"</span>}
            {statusFilter && <span className="bg-gray-100 px-2 py-1 rounded">Status: {statusFilter}</span>}
            {roleFilter && <span className="bg-gray-100 px-2 py-1 rounded">Role: {roleFilter}</span>}
            {dateFilter && (
              <span className="bg-gray-100 px-2 py-1 rounded">Date: {formatDate(dateFilter)}</span>
            )}
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setRoleFilter('')
                setDateFilter('')
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {filteredShifts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shifts found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter || roleFilter || dateFilter
              ? 'Try adjusting your filters'
              : 'Get started by creating your first shift'}
          </p>
          {!searchTerm && !statusFilter && !roleFilter && !dateFilter && (
            <Link
              to="/shifts/new"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create First Shift
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredShifts.map((shift) => {
              const assignmentStatus = getAssignmentStatus(shift)
              const assignedCount = shift.assignments?.length || 0

              return (
                <Link
                  key={shift.id}
                  to={`/shifts/${shift.id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{shift.client_name}</h3>
                          <ShiftStatusBadge status={shift.status} />
                        </div>

                        <div className="flex items-center gap-2 text-gray-600 mb-3">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{shift.role_needed}</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(shift.start_time_utc)}</span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatTime(shift.start_time_utc)} - {formatTime(shift.end_time_utc)}
                            </span>
                          </div>

                          {shift.location && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>{shift.location}</span>
                            </div>
                          )}

                          {shift.pay_rate && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <DollarSign className="h-4 w-4" />
                              <span>${shift.pay_rate}/hr</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-6 text-right flex flex-col items-end gap-2">
                        <div className={`text-sm font-medium ${assignmentStatus.color}`}>
                          {assignmentStatus.text}
                        </div>
                        <div className="text-xs text-gray-500">
                          {shift.capacity} {shift.capacity === 1 ? 'worker' : 'workers'} needed
                        </div>
                        {shift.status === 'published' && assignedCount < shift.capacity && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              setQuickAssignShift(shift)
                            }}
                            className="text-xs btn-primary px-3 py-1"
                          >
                            Assign Worker
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500 text-center">
        Showing {filteredShifts.length} of {shifts.length} shifts
      </div>

      {quickAssignShift && (
        <AssignWorkerModal
          shift={quickAssignShift}
          onClose={() => setQuickAssignShift(null)}
          onSuccess={() => {
            setQuickAssignShift(null)
            refetch()
          }}
        />
      )}
      
      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <BulkAssignModal
          onClose={() => setShowBulkAssignModal(false)}
          onSuccess={() => {
            refetch();
            setShowBulkAssignModal(false);
          }}
        />
      )}
    </div>
  )
}


