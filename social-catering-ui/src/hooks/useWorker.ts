import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Worker } from './useWorkers'

interface UseWorkerReturn {
  worker: Worker | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useWorker(id: number): UseWorkerReturn {
  const [worker, setWorker] = useState<Worker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorker = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await api.getWorker(id)
      
      if (response.status === 'success') {
        setWorker(response.data)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load worker'
      setError(errorMessage)
      console.error('Worker fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchWorker()
    }
  }, [id])

  return {
    worker,
    isLoading,
    error,
    refetch: fetchWorker,
  }
}
