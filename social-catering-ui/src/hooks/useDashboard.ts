import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface ShiftCounts {
  draft: number
  published: number
  assigned: number
  completed: number
  total: number
}

interface FillStatus {
  unfilled: number
  partial: number
  covered: number
}

interface Worker {
  id: number
  first_name: string
  last_name: string
}

interface Shift {
  id: number
  client_name: string
  role_needed: string
  start_time_utc: string
  end_time_utc: string
  capacity: number
  assigned_count: number
  workers: Worker[]
  status: string
}

interface DashboardData {
  shift_counts: ShiftCounts
  fill_status: FillStatus
  today_shifts: Shift[]
  upcoming_shifts: Shift[]
}

interface UseDashboardReturn {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await api.dashboard()
      
      if (response.status === 'success') {
        setData(response.data)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load dashboard data'
      setError(errorMessage)
      console.error('Dashboard fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
  }
}
