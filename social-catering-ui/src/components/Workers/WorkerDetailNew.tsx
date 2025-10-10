import type { Worker } from '../../hooks/useWorkers'
import { format, parseISO } from 'date-fns'

interface WorkerDetailProps {
  worker: Worker
}

export function WorkerDetail({ worker }: WorkerDetailProps) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
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
            <dd className="mt-1 text-sm text-gray-900">{worker.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm text-gray-900">{worker.phone}</dd>
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
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Skills</h4>
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
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Certifications</h4>
        {worker.certifications && worker.certifications.length > 0 ? (
          <div className="space-y-2">
            {worker.certifications.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900">{cert.name}</span>
                {cert.expires_at && (
                  <span className="text-sm text-gray-500">
                    Expires: {format(parseISO(cert.expires_at), 'MMM d, yyyy')}
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
  )
}
