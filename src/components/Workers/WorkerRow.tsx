import type { Worker } from '../../hooks/useWorkers'

interface WorkerRowProps {
  worker: Worker
  onEdit: () => void
  onDelete: () => void
  onView: () => void
}

export function WorkerRow({ worker, onEdit, onDelete, onView }: WorkerRowProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    if (status === 'active') {
      return `${baseClasses} bg-green-100 text-green-800`
    } else {
      return `${baseClasses} bg-red-100 text-red-800`
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      {/* Worker Name */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {worker.first_name.charAt(0)}{worker.last_name.charAt(0)}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {worker.first_name} {worker.last_name}
            </div>
            <div className="text-sm text-gray-500">
              Added {formatDate(worker.created_at)}
            </div>
          </div>
        </div>
      </td>

      {/* Contact Info */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{worker.email}</div>
        <div className="text-sm text-gray-500">{worker.phone}</div>
      </td>

      {/* Skills */}
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {worker.skills_json && worker.skills_json.length > 0 ? (
            worker.skills_json.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400">No skills</span>
          )}
          {worker.skills_json && worker.skills_json.length > 3 && (
            <span className="text-xs text-gray-500">
              +{worker.skills_json.length - 3} more
            </span>
          )}
        </div>
      </td>

      {/* Certifications */}
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {worker.certifications && worker.certifications.length > 0 ? (
            worker.certifications.slice(0, 2).map((cert) => (
              <span
                key={cert.id}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800"
              >
                {cert.name}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400">No certifications</span>
          )}
          {worker.certifications && worker.certifications.length > 2 && (
            <span className="text-xs text-gray-500">
              +{worker.certifications.length - 2} more
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getStatusBadge(worker.status)}>
          {worker.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={onView}
            className="text-blue-600 hover:text-blue-900"
            title="View details"
          >
            View
          </button>
          <button
            onClick={onEdit}
            className="text-indigo-600 hover:text-indigo-900"
            title="Edit worker"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-900"
            title="Delete worker"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}
