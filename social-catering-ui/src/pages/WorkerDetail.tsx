import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, Edit2, Trash2, Mail, Phone, User, Award, Briefcase
} from 'lucide-react'
import { getWorker } from '../services/workersApi'
import type { Worker } from '../services/workersApi'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { format, parseISO } from 'date-fns'

const WorkerDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadWorker(parseInt(id))
    }
  }, [id])

  const loadWorker = async (workerId: number) => {
    try {
      setLoading(true)
      setError('')
      const response = await getWorker(workerId)
      setWorker(response.data)
    } catch (err: any) {
      setError('Failed to load worker details')
      console.error('Error loading worker:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!worker) return
    
    setIsDeleting(true)
    try {
      // TODO: Implement delete worker API call
      console.log('Delete worker:', worker.id)
      navigate('/workers')
    } catch (err) {
      console.error('Error deleting worker:', err)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !worker) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <ErrorMessage message={error || 'Worker not found'} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/workers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Workers
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {worker.first_name} {worker.last_name}
            </h1>
            <p className="text-gray-500 mt-1">{worker.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/workers/${worker.id}/edit`}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Link>
            
            <Link
              to={`/workers/${worker.id}/schedule`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              View Schedule
            </Link>
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {worker.first_name} {worker.last_name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      worker.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {worker.active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${worker.email}`} className="hover:text-blue-600">
                    {worker.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {worker.phone ? (
                    <a href={`tel:${worker.phone}`} className="hover:text-blue-600">
                      {worker.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400">No phone number</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Added</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(parseISO(worker.created_at), 'MMM d, yyyy')}
                </dd>
              </div>
            </dl>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {worker.skills_json && worker.skills_json.length > 0 ? (
                worker.skills_json.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No skills added</p>
              )}
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </h3>
            {worker.certifications && worker.certifications.length > 0 ? (
              <div className="space-y-3">
                {worker.certifications.map((cert, index) => (
                  <div
                    key={cert.certification_id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900">{cert.name}</span>
                    {cert.expires_at_utc && (
                      <span className="text-sm text-gray-500">
                        Expires: {format(parseISO(cert.expires_at_utc), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No certifications</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to={`/workers/${worker.id}/schedule`}
                className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                View Schedule
              </Link>
              <Link
                to={`/workers/${worker.id}/edit`}
                className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit2 className="h-4 w-4" />
                Edit Worker
              </Link>
            </div>
          </div>

          {/* Worker Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Worker Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className={`text-lg font-semibold ${
                  worker.active ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {worker.active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Skills Count</div>
                <div className="text-lg font-semibold text-gray-900">
                  {worker.skills_json?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Certifications</div>
                <div className="text-lg font-semibold text-gray-900">
                  {worker.certifications?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Worker"
        message={`Are you sure you want to delete ${worker.first_name} ${worker.last_name}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}

export default WorkerDetail
