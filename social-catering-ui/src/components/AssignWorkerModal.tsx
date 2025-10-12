import { useEffect, useState } from 'react'
import { getWorkers, type Worker } from '../services/workersApi'
import { assignWorker, type Shift } from '../services/shiftsApi'
import {
  XMarkIcon as X,
  MagnifyingGlassIcon as Search,
  ExclamationTriangleIcon as AlertTriangle,
  CheckIcon as Check,
  UserIcon as User,
} from '@heroicons/react/24/outline'

interface AssignWorkerModalProps {
  shift: Shift
  onClose: () => void
  onSuccess: () => void
}

export default function AssignWorkerModal({ shift, onClose, onSuccess }: AssignWorkerModalProps) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWorkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    filterWorkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, workers])

  const loadWorkers = async () => {
    try {
      const response = await getWorkers()
      const assignedWorkerIds = shift.assignments?.map((a) => a.worker_id) || []
      const availableWorkers = response.data.filter((w) => w.active && !assignedWorkerIds.includes(w.id))
      setWorkers(availableWorkers)
      setFilteredWorkers(availableWorkers)
    } catch (err) {
      setError('Failed to load workers')
      // eslint-disable-next-line no-console
      console.error('Error loading workers:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterWorkers = () => {
    if (!searchTerm) {
      setFilteredWorkers(workers)
      return
    }
    const term = searchTerm.toLowerCase()
    const filtered = workers.filter(
      (w) =>
        w.first_name.toLowerCase().includes(term) ||
        w.last_name.toLowerCase().includes(term) ||
        w.email.toLowerCase().includes(term) ||
        w.skills_json?.some((skill) => skill.toLowerCase().includes(term)),
    )
    setFilteredWorkers(filtered)
  }

  const hasRequiredSkill = (worker: Worker) => {
    return worker.skills_json?.includes(shift.role_needed) || false
  }

  const hasRequiredCertification = (worker: Worker) => {
    if (!shift.required_certification_id) return true
    const certs = worker.worker_certifications || worker.certifications || []
    return (
      certs.some((cert: any) => {
        const certificationId = cert.certification_id ?? cert.id
        const expiresAt = cert.expires_at_utc
        return (
          certificationId === shift.required_certification_id &&
          expiresAt &&
          new Date(expiresAt) > new Date(shift.end_time_utc)
        )
      }) || false
    )
  }

  const canAssignWorker = (worker: Worker) => {
    return hasRequiredSkill(worker) && hasRequiredCertification(worker)
  }

  const handleAssign = async () => {
    if (!selectedWorker) return
    setAssigning(true)
    setError('')
    try {
      await assignWorker(shift.id, selectedWorker.id)
      onSuccess()
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || 'Failed to assign worker'
      setError(errorMessage)
      // eslint-disable-next-line no-console
      console.error('Error assigning worker:', err)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Assign Worker</h2>
            <p className="text-sm text-gray-500 mt-1">
              {shift.client_name} - {shift.role_needed}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Assignment Failed</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading workers...</div>
          ) : filteredWorkers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">{searchTerm ? 'No workers match your search' : 'No available workers'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWorkers.map((worker) => {
                const canAssign = canAssignWorker(worker)
                const hasSkill = hasRequiredSkill(worker)
                const hasCert = hasRequiredCertification(worker)
                const isSelected = selectedWorker?.id === worker.id

                return (
                  <div
                    key={worker.id}
                    onClick={() => canAssign && setSelectedWorker(worker)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    } ${!canAssign ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-600 font-medium">
                            {worker.first_name[0]}
                            {worker.last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">
                              {worker.first_name} {worker.last_name}
                            </h3>
                            {isSelected && <Check className="h-5 w-5 text-blue-600" />}
                          </div>
                          <p className="text-sm text-gray-500">{worker.email}</p>
                          {worker.skills_json && worker.skills_json.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {worker.skills_json.map((skill) => (
                                <span
                                  key={skill}
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    skill === shift.role_needed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                          {!canAssign && (
                            <div className="mt-2 space-y-1">
                              {!hasSkill && (
                                <div className="flex items-center gap-2 text-xs text-yellow-600">
                                  <AlertTriangle className="h-3 w-3" /> Missing required skill: {shift.role_needed}
                                </div>
                              )}
                              {!hasCert && shift.required_certification && (
                                <div className="flex items-center gap-2 text-xs text-yellow-600">
                                  <AlertTriangle className="h-3 w-3" /> Missing or expired certification: {shift.required_certification.name}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedWorker ? (
              <span>
                Selected: <strong>{selectedWorker.first_name} {selectedWorker.last_name}</strong>
              </span>
            ) : (
              <span>Select a worker to assign</span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white">Cancel</button>
            <button
              onClick={handleAssign}
              disabled={!selectedWorker || assigning}
              className="btn-green disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? 'Assigning...' : 'Assign Worker'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



