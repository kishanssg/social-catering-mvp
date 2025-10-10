import { useState } from 'react'
import { ConfirmModal } from '../ui/ConfirmModal'
import { api } from '../../lib/api'
import type { Worker } from '../../hooks/useWorkers'

interface DeleteConfirmationProps {
  worker: Worker | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DeleteConfirmation({ worker, isOpen, onClose, onSuccess }: DeleteConfirmationProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!worker) return

    setIsDeleting(true)

    try {
      await api.deleteWorker(worker.id)
      onSuccess()
      onClose()
    } catch (err: any) {
      // Error handling could be improved with a toast notification
      console.error('Failed to delete worker:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!worker) return null

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      title="Delete Worker"
      message={`Are you sure you want to delete ${worker.first_name} ${worker.last_name}? This action cannot be undone.`}
      confirmText="Delete Worker"
      cancelText="Cancel"
      isLoading={isDeleting}
    />
  )
}
