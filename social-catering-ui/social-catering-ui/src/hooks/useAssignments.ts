import { useState, useEffect, useMemo } from 'react';
import { getAssignments, updateAssignmentStatus as updateAssignmentStatusApi, deleteAssignment as deleteAssignmentApi } from '../services/assignmentsApi';
import type { Assignment } from '../services/assignmentsApi';
import type { AssignmentFilterParams } from '../types';

interface UseAssignmentsParams {
  worker_id?: number;
  shift_id?: number;
  status?: string;
  timeframe?: 'past' | 'today' | 'upcoming';
  start_date?: string;
  end_date?: string;
}

interface UseAssignmentsReturn {
  assignments: Assignment[];
  loading: boolean;
  error: string | null;
  filters: AssignmentFilterParams;
  setFilters: (filters: AssignmentFilterParams) => void;
  refetch: () => void;
  updateAssignmentStatus: (id: number, status: string) => Promise<void>;
  deleteAssignment: (id: number) => Promise<void>;
}

export function useAssignments(params?: UseAssignmentsParams): UseAssignmentsReturn {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssignmentFilterParams>({});

  // Memoize the merged params to prevent unnecessary re-renders
  const mergedParams = useMemo(() => ({ ...filters, ...params }), [filters, params]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAssignments(mergedParams);
      
      if (response.status === 'success' && response.data?.assignments) {
        setAssignments(response.data.assignments);
      } else {
        setError('Failed to fetch assignments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateAssignmentStatus = async (id: number, status: string) => {
    try {
      const response = await updateAssignmentStatusApi(id, status as any);
      
      if (response.status === 'success') {
        // Update local state
        setAssignments(prev => 
          prev.map(assignment => 
            assignment.id === id 
              ? { ...assignment, status: status as any }
              : assignment
          )
        );
      } else {
        setError('Failed to update assignment status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment status');
    }
  };

  const deleteAssignment = async (id: number) => {
    try {
      await deleteAssignmentApi(id);
      
      // Remove from local state
      setAssignments(prev => prev.filter(assignment => assignment.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment');
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [mergedParams]);

  return {
    assignments,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchAssignments,
    updateAssignmentStatus,
    deleteAssignment,
  };
}
