import { useState, useEffect } from 'react';
import { getLocations } from '../services/publicApi';
import type { Location } from '../types/index';

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await getLocations();
        setLocations(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
        setError('Failed to load locations');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  return { locations, loading, error };
};
