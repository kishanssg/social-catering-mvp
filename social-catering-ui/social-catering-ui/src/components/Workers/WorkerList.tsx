import { useState } from 'react'
import { useWorkers, type Worker } from '../../hooks/useWorkers'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'
import { EmptyState } from '../Dashboard/EmptyState'
import { WorkerRow } from './WorkerRow'
import { WorkerFilters } from './WorkerFilters'

interface WorkerListProps {
  onEditWorker: (worker: Worker) => void
  onDeleteWorker: (worker: Worker) => void
  onViewWorker: (worker: Worker) => void
  onAddWorker: () => void
}

export function WorkerList({ onEditWorker, onDeleteWorker, onViewWorker, onAddWorker }: WorkerListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  
  const { workers, isLoading, error, refetch } = useWorkers({
    search: search.trim() || undefined,
    status: statusFilter,
  })

  const handleSearch = (query: string) => {
    setSearch(query)
  }

  const handleStatusFilter = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8">
        <ErrorMessage message={error} onRetry={refetch} />
      </div>
    )
  }

  if (workers.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          title="No workers found"
          description={
            search || statusFilter !== 'all'
              ? "No workers match your current search or filter criteria."
              : "Get started by adding your first worker to the system."
          }
          actionLabel={search || statusFilter !== 'all' ? "Clear filters" : "Add Worker"}
          onAction={() => {
            if (search || statusFilter !== 'all') {
              setSearch('')
              setStatusFilter('all')
            } else {
              // This will be handled by parent component
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <WorkerFilters
        search={search}
        status={statusFilter}
        onSearchChange={handleSearch}
        onStatusChange={handleStatusFilter}
        onAddClick={onAddWorker}
      />

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {workers.length} worker{workers.length !== 1 ? 's' : ''} found
          {search && ` for "${search}"`}
          {statusFilter !== 'all' && ` (${statusFilter})`}
        </span>
        <button
          onClick={refetch}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Workers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certifications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workers.map((worker) => (
                <WorkerRow
                  key={worker.id}
                  worker={worker}
                  onEdit={() => onEditWorker(worker)}
                  onDelete={() => onDeleteWorker(worker)}
                  onView={() => onViewWorker(worker)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
