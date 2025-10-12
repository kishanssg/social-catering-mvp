import { useState } from 'react'
import { useWorkers, type Worker } from '../hooks/useWorkers'
import { apiService } from '../services/api'
import { WorkerFilters } from '../components/Workers/WorkerFilters'
import { WorkerTable } from '../components/Workers/WorkerTable'
import { WorkerForm as WorkerFormNew } from '../components/Workers/WorkerFormNew'
import { WorkerDetail as WorkerDetailNew } from '../components/Workers/WorkerDetailNew'
import { Modal } from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { EmptyState } from '../components/Dashboard/EmptyState'

export function WorkersPage() {
  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Selected Worker
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)

  // Form States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch Workers
  const { workers, isLoading, error, refetch } = useWorkers({ search, status })

  // Handlers
  const handleAddClick = () => {
    setSelectedWorker(null)
    setFormError(null)
    setIsAddModalOpen(true)
  }

  const handleEditClick = (worker: Worker) => {
    setSelectedWorker(worker)
    setFormError(null)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (worker: Worker) => {
    setSelectedWorker(worker)
    setIsDeleteModalOpen(true)
  }

  const handleAddSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)
      setFormError(null)
      
      await apiService.createWorker(data)
      
      setIsAddModalOpen(false)
      refetch()
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create worker'
      setFormError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (data: any) => {
    if (!selectedWorker) return

    try {
      setIsSubmitting(true)
      setFormError(null)
      
      await apiService.updateWorker(selectedWorker.id, data)
      
      setIsEditModalOpen(false)
      refetch()
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update worker'
      setFormError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedWorker) return

    try {
      setIsDeleting(true)
      
      await apiService.updateWorker(selectedWorker.id, { active: false })
      
      setIsDeleteModalOpen(false)
      setSelectedWorker(null)
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete worker')
    } finally {
      setIsDeleting(false)
    }
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Error State
  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
        <p className="text-gray-600 mt-1">Manage your workforce directory</p>
      </div>

      {/* Filters */}
      <WorkerFilters
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onAddClick={handleAddClick}
      />

      {/* Workers Table */}
      {workers.length > 0 ? (
        <>
          <WorkerTable
            workers={workers}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
          <p className="text-sm text-gray-500">
            Showing {workers.length} worker{workers.length !== 1 ? 's' : ''}
          </p>
        </>
      ) : (
        <EmptyState
          title="No Workers Found"
          description={
            search || status !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first worker'
          }
          icon={
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
      )}

      {/* Add Worker Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Worker"
        size="lg"
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{formError}</p>
          </div>
        )}
        <WorkerFormNew
          onSubmit={handleAddSubmit}
          onCancel={() => setIsAddModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Edit Worker Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Worker"
        size="lg"
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{formError}</p>
          </div>
        )}
        <WorkerFormNew
          worker={selectedWorker}
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Worker Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={
          selectedWorker
            ? `${selectedWorker.first_name} ${selectedWorker.last_name}`
            : 'Worker Details'
        }
        size="lg"
      >
        {selectedWorker && <WorkerDetailNew worker={selectedWorker} />}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Worker"
        message={
          selectedWorker
            ? `Are you sure you want to delete ${selectedWorker.first_name} ${selectedWorker.last_name}? This action cannot be undone.`
            : 'Are you sure you want to delete this worker?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  )
}
