import { useState, useEffect, useMemo } from 'react'
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
  filteredWorkers: Worker[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useWorkers(params: UseWorkersParams = {}): UseWorkersReturn {
  const [allWorkers, setAllWorkers] = useState<Worker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all workers once on mount
  const fetchWorkers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Load all workers without any filters
      const response = await apiService.getWorkers({})
      
      if (response.status === 'success') {
        setAllWorkers(response.data.workers)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load workers'
      setError(errorMessage)
      console.error('Workers fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load workers once on mount
  useEffect(() => {
    fetchWorkers()
  }, [])

  // Client-side filtering
  const filteredWorkers = useMemo(() => {
    let filtered = [...allWorkers]

    // Filter by status
    if (params.status === 'active') {
      filtered = filtered.filter(worker => worker.active)
    } else if (params.status === 'inactive') {
      filtered = filtered.filter(worker => !worker.active)
    }

    // Filter by search term
    if (params.search && params.search.trim()) {
      const searchTerm = params.search.toLowerCase().trim()
      
      filtered = filtered.filter(worker => {
        // Search in name
        const fullName = `${worker.first_name || ''} ${worker.last_name || ''}`.toLowerCase()
        if (fullName.includes(searchTerm)) return true

        // Search in email
        if (worker.email && worker.email.toLowerCase().includes(searchTerm)) return true

        // Search in phone
        if (worker.phone && worker.phone.toLowerCase().includes(searchTerm)) return true

        // Search in skills (handle both array and string)
        if (worker.skills_json) {
          const skills = Array.isArray(worker.skills_json) 
            ? worker.skills_json 
            : typeof worker.skills_json === 'string' 
              ? JSON.parse(worker.skills_json) 
              : []
          
          if (skills.some((skill: string) => 
            skill && skill.toLowerCase().includes(searchTerm)
          )) return true
        }

        // Search in certifications
        if (worker.certifications && Array.isArray(worker.certifications)) {
          if (worker.certifications.some(cert => 
            cert && cert.name && cert.name.toLowerCase().includes(searchTerm)
          )) return true
        }

        return false
      })
    }

    return filtered
  }, [allWorkers, params.search, params.status])

  return {
    workers: allWorkers, // All workers for statistics
    filteredWorkers, // Filtered workers for display
    isLoading,
    error,
    refetch: fetchWorkers,
  }
}
