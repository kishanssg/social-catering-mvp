import { useState, useEffect } from 'react'
import { apiService } from '../services/api'

export interface Certification {
  id: number
  name: string
}

export interface Worker {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  active: boolean
  skills_json: string[]
  certifications: Certification[]
  worker_certifications: Array<{
    expires_at_utc: string
    certification_id: number
  }>
  created_at: string
  updated_at: string
}

interface UseWorkersParams {
  search?: string
  status?: 'active' | 'inactive' | 'all'
}

interface UseWorkersReturn {
  workers: Worker[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useWorkers(params: UseWorkersParams = {}): UseWorkersReturn {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiService.getWorkers(params)
      
      if (response.status === 'success') {
        setWorkers(response.data.workers)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load workers'
      setError(errorMessage)
      console.error('Workers fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkers()
  }, [params.search, params.status])

  return {
    workers,
    isLoading,
    error,
    refetch: fetchWorkers,
  }
}
