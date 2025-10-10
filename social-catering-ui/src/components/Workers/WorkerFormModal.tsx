import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { WorkerForm as WorkerFormNew } from './WorkerFormNew'
import { api } from '../../lib/api'
import type { Worker } from '../../hooks/useWorkers'

interface WorkerFormModalProps {
  worker?: Worker | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
}

export function WorkerFormModal({ worker, isOpen, onClose, onSuccess, title }: WorkerFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (worker) {
        await api.updateWorker(worker.id, data)
      } else {
        await api.createWorker(data)
      }
      
      onSuccess()
      onClose()
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to save worker'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={title} size="md">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <WorkerFormNew
          worker={worker}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </Modal>
  )
}
