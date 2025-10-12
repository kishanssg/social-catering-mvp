import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, Edit2, Trash2, Mail, Phone, User, Award, Briefcase, Plus, X
} from 'lucide-react'
import { 
  addCertificationToWorker, 
  removeCertificationFromWorker,
  type Worker,
  type AddCertificationRequest
} from '../services/workersApi'
import { apiService } from '../services/api'
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
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Certification management state
  const [availableCertifications, setAvailableCertifications] = useState<any[]>([])
  const [showAddCertification, setShowAddCertification] = useState(false)
  const [selectedCertificationId, setSelectedCertificationId] = useState<number | null>(null)
  const [certificationExpiry, setCertificationExpiry] = useState('')
  const [isAddingCertification, setIsAddingCertification] = useState(false)
  const [certificationError, setCertificationError] = useState('')

  // Skills management state
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [isAddingSkill, setIsAddingSkill] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    active: true
  })

  useEffect(() => {
    if (id) {
      loadWorker(parseInt(id))
      loadAvailableCertifications()
    }
  }, [id])

  const loadWorker = async (workerId: number) => {
    try {
      setLoading(true)
      setError('')
      const response = await apiService.getWorker(workerId)
      setWorker(response.data.worker)
      
      // Populate edit form
      setEditForm({
        first_name: response.data.worker.first_name,
        last_name: response.data.worker.last_name,
        email: response.data.worker.email,
        phone: response.data.worker.phone || '',
        active: response.data.worker.active
      })
    } catch (err: any) {
      setError('Failed to load worker details')
      console.error('Error loading worker:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableCertifications = async () => {
    try {
      const response = await apiService.getCertifications()
      setAvailableCertifications(response.data.certifications || [])
    } catch (err) {
      console.error('Error loading certifications:', err)
    }
  }

  const handleAddCertification = async () => {
    if (!worker || !selectedCertificationId) return

    setIsAddingCertification(true)
    setCertificationError('') // Clear any previous errors
    try {
      const certificationData: AddCertificationRequest = {
        certification_id: selectedCertificationId,
        expires_at_utc: certificationExpiry || undefined
      }

      const response = await addCertificationToWorker(worker.id, certificationData)
      
      // Update worker state locally instead of reloading
      if (response.data?.worker_certification) {
        const newCertification = response.data.worker_certification.certification
        const updatedWorker = {
          ...worker,
          certifications: [...(worker.certifications || []), newCertification],
          worker_certifications: [...(worker.worker_certifications || []), {
            certification_id: newCertification.id,
            expires_at_utc: response.data.worker_certification.expires_at_utc
          }]
        }
        setWorker(updatedWorker)
      } else {
        console.error('No worker_certification in response:', response)
      }
      
      // Reset form
      setSelectedCertificationId(null)
      setCertificationExpiry('')
      setShowAddCertification(false)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to add certification'
      
      // Provide more user-friendly error messages
      if (errorMessage.includes('already has this certification')) {
        setCertificationError('This worker already has this certification. Please select a different one.')
      } else if (errorMessage.includes('not found') || errorMessage.includes('Not Found')) {
        setCertificationError('Certification API endpoint not found. Please refresh the page and try again.')
      } else {
        setCertificationError(errorMessage)
      }
      
      console.error('Error adding certification:', err)
    } finally {
      setIsAddingCertification(false)
    }
  }

  const handleRemoveCertification = async (certificationId: number) => {
    if (!worker) return

    try {
      await removeCertificationFromWorker(worker.id, certificationId)
      
      // Update worker state locally instead of reloading
      const updatedWorker = {
        ...worker,
        certifications: worker.certifications?.filter(cert => cert.id !== certificationId) || [],
        worker_certifications: worker.worker_certifications?.filter(wc => wc.certification_id !== certificationId) || []
      }
      setWorker(updatedWorker)
    } catch (err: any) {
      setCertificationError(err.response?.data?.error || 'Failed to remove certification')
      console.error('Error removing certification:', err)
    }
  }

  const handleAddSkill = async () => {
    if (!worker || !newSkill.trim()) return

    setIsAddingSkill(true)
    try {
      const currentSkills = worker.skills_json || []
      const updatedSkills = [...currentSkills, newSkill.trim()]
      
      await apiService.updateWorker(worker.id, { skills_json: updatedSkills })
      
      // Reload worker data to show updated skills
      await loadWorker(worker.id)
      
      // Reset form
      setNewSkill('')
      setShowAddSkill(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add skill')
      console.error('Error adding skill:', err)
    } finally {
      setIsAddingSkill(false)
    }
  }

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (!worker) return

    try {
      const currentSkills = worker.skills_json || []
      const updatedSkills = currentSkills.filter(skill => skill !== skillToRemove)
      
      await apiService.updateWorker(worker.id, { skills_json: updatedSkills })
      
      // Reload worker data to show updated skills
      await loadWorker(worker.id)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove skill')
      console.error('Error removing skill:', err)
    }
  }

  const handleSaveEdit = async () => {
    if (!worker) return

    try {
      setIsSaving(true)
      setError('')
      
      await apiService.updateWorker(worker.id, editForm)
      
      // Reload worker data
      await loadWorker(worker.id)
      setIsEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update worker')
      console.error('Error updating worker:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (worker) {
      // Reset form to original values
      setEditForm({
        first_name: worker.first_name,
        last_name: worker.last_name,
        email: worker.email,
        phone: worker.phone || '',
        active: worker.active
      })
    }
    setIsEditing(false)
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

  // Type guard to ensure worker is not null
  if (!worker) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <ErrorMessage message="Worker not found" />
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
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                
                <Link
                  to={`/workers/${worker.id}/schedule`}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  View Schedule
                </Link>
              </>
            )}
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
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
              Profile
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">First Name</dt>
                <dd className="mt-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="text-sm text-gray-900">{worker.first_name}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                <dd className="mt-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="text-sm text-gray-900">{worker.last_name}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  {isEditing ? (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.active}
                        onChange={(e) => setEditForm({...editForm, active: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">
                        {editForm.active ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  ) : (
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        worker.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {worker.active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1">
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="text-sm text-gray-900 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${worker.email}`} className="hover:text-blue-600">
                        {worker.email}
                      </a>
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1">
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="text-sm text-gray-900 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {worker.phone ? (
                        <a href={`tel:${worker.phone}`} className="hover:text-blue-600">
                          {worker.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">No phone number</span>
                      )}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Added</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {worker.created_at ? format(parseISO(worker.created_at), 'MMM d, yyyy') : 'Unknown'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Skills
              </h3>
              <button
                onClick={() => setShowAddSkill(true)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Skill
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {worker.skills_json && worker.skills_json.length > 0 ? (
                worker.skills_json.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-2 p-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full"
                      title="Remove skill"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No skills added</p>
              )}
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certifications
              </h3>
              <button
                onClick={() => setShowAddCertification(true)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Certification
              </button>
            </div>
            
            {worker.certifications && worker.certifications.length > 0 ? (
              <div className="space-y-3">
                {worker.certifications.map((cert, index) => {
                  // Find the corresponding worker_certification for expiration date
                  const workerCert = worker.worker_certifications?.find(wc => wc.certification_id === cert.id)
                  
                  return (
                    <div
                      key={cert.id || index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{cert.name}</span>
                        {workerCert?.expires_at_utc && (
                          <span className="text-sm text-gray-500">
                            Expires: {format(parseISO(workerCert.expires_at_utc), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveCertification(cert.id)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Remove certification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No certifications</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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

      {/* Add Certification Modal */}
      {showAddCertification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Certification</h3>
            
            <div className="space-y-4">
              {certificationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="text-red-600 text-sm font-medium">Error:</div>
                    <div className="text-red-700 text-sm">{certificationError}</div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certification
                </label>
                {availableCertifications.filter(cert => !worker.certifications?.some(wc => wc.id === cert.id)).length > 0 ? (
                  <select
                    value={selectedCertificationId || ''}
                    onChange={(e) => setSelectedCertificationId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a certification</option>
                    {availableCertifications
                      .filter(cert => !worker.certifications?.some(wc => wc.id === cert.id))
                      .map((cert) => (
                        <option key={cert.id} value={cert.id}>
                          {cert.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                    This worker already has all available certifications.
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={certificationExpiry}
                  onChange={(e) => setCertificationExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddCertification(false)
                  setSelectedCertificationId(null)
                  setCertificationExpiry('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isAddingCertification}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCertification}
                disabled={!selectedCertificationId || isAddingCertification || availableCertifications.filter(cert => !worker.certifications?.some(wc => wc.id === cert.id)).length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingCertification ? 'Adding...' : 'Add Certification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Skill Modal */}
      {showAddSkill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Skill</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="e.g., Bartender, Server, Chef"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddSkill(false)
                  setNewSkill('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isAddingSkill}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSkill}
                disabled={!newSkill.trim() || isAddingSkill}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingSkill ? 'Adding...' : 'Add Skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkerDetail
