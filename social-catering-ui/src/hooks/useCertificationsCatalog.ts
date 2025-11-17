import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/api';

export interface Certification {
  id: number;
  name: string;
  [key: string]: any;
}

interface UseCertificationsCatalogResult {
  certifications: Certification[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * Single source of truth hook for certifications.
 * Fetches the catalog once and lets any consumer (event wizard, worker editor, etc.)
 * reuse the same list. This ensures the UI never drifts from the backend’s list.
 */
export function useCertificationsCatalog(): UseCertificationsCatalogResult {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCertifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/certifications');
      const payload = response.data;
      const list =
        payload?.data?.certifications ??
        payload?.data ??
        payload?.certifications ??
        [];
      if (Array.isArray(list)) {
        setCertifications(list);
      } else {
        setCertifications([]);
      }
    } catch (err) {
      console.error('Failed to load certifications', err);
      setError(err as Error);
      setCertifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCertifications();
  }, [loadCertifications]);

  return {
    certifications,
    loading,
    error,
    reload: loadCertifications,
  };
}


