import { useState, useEffect } from 'react'
import { getShifts, type Shift } from '../services/shiftsApi'

export const useShifts = (filters?: {
  status?: string
  start_date?: string
  end_date?: string
  role?: string
}) => {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchShifts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getShifts(filters)
      // Backend returns { status: 'success', data: { shifts: [...] } }
      const shiftsData = response.data as any
      setShifts(shiftsData?.shifts || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load shifts')
      console.error('Error fetching shifts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShifts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  return { shifts, loading, error, refetch: fetchShifts }
}


