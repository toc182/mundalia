import { useState, useEffect } from 'react';
import { settingsAPI, PredictionStatus } from '@/services/api';

interface UsePredictionStatusResult {
  status: PredictionStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePredictionStatus(): UsePredictionStatusResult {
  const [status, setStatus] = useState<PredictionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsAPI.getPredictionStatus();
      setStatus(response.data);
    } catch (err) {
      console.error('Error fetching prediction status:', err);
      setError('Error al verificar estado de predicciones');
      // Default to open if there's an error
      setStatus({
        isOpen: true,
        deadline: null,
        message: 'Las predicciones estan abiertas'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return {
    status,
    loading,
    error,
    refresh: fetchStatus
  };
}

export default usePredictionStatus;
