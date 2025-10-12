import { Modal } from '../ui/Modal'
import type { Worker } from '../../hooks/useWorkers'

interface WorkerDetailModalProps {
  worker: Worker | null
  isOpen: boolean
  onClose: () => void
  onEdit: (worker: Worker) => void
  onDelete: (worker: Worker) => void
}

export function WorkerDetailModal({ worker, isOpen, onClose, onEdit, onDelete }: WorkerDetailModalProps) {
  if (!worker) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    
    if (status === 'active') {
      return `${baseClasses} bg-green-100 text-green-800`
    } else {
      return `${baseClasses} bg-red-100 text-red-800`
    }
  }

  const isCertificationExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Worker Details" size="lg">
      <div className="space-y-6">
        {/* Header with Avatar and Basic Info */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-xl font-medium text-gray-700">
                {worker.first_name.charAt(0)}{worker.last_name.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-2xl font-bold text-gray-900">
              {worker.first_name} {worker.last_name}
            </h4>
            <div className="mt-2 flex items-center space-x-4">
              <span className={getStatusBadge(worker.active ? "Active" : "Inactive")}>
                {worker.active ? "Active" : "Inactive"}
              </span>
              <span className="text-sm text-gray-500">
                Added {formatDate(worker.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h5 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h5>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-900">{worker.email}</span>
            </div>
            <div className="flex items-center">
              <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-gray-900">{worker.phone}</span>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <h5 className="text-lg font-medium text-gray-900 mb-3">Skills</h5>
          <div className="bg-gray-50 rounded-lg p-4">
            {worker.skills_json && worker.skills_json.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {worker.skills_json.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No skills listed</p>
            )}
          </div>
        </div>

        {/* Certifications */}
        <div>
          <h5 className="text-lg font-medium text-gray-900 mb-3">Certifications</h5>
          <div className="bg-gray-50 rounded-lg p-4">
            {worker.certifications && worker.certifications.length > 0 ? (
              <div className="space-y-3">
                {worker.certifications.map((cert) => {
                  // Find the corresponding worker_certification for expiration date
                  const workerCert = worker.worker_certifications?.find(wc => wc.certification_id === cert.id);
                  
                  return (
                    <div key={cert.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-900 font-medium">{cert.name}</span>
                      </div>
                      <div className="text-right">
                        {workerCert?.expires_at_utc ? (
                          <div className={`text-sm ${isCertificationExpired(workerCert.expires_at_utc) ? 'text-red-600' : 'text-gray-500'}`}>
                            {isCertificationExpired(workerCert.expires_at_utc) ? 'Expired' : 'Expires'} {formatDate(workerCert.expires_at_utc)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No expiration</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 italic">No certifications</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
          <button
            onClick={() => onEdit(worker)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Worker
          </button>
          <button
            onClick={() => onDelete(worker)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Worker
          </button>
        </div>
      </div>
    </Modal>
  )
}
