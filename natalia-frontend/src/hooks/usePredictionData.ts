import { useState, useCallback } from 'react';

interface UsePredictionDataReturn<T> {
  data: T | null;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  clearError: () => void;
}

/**
 * Custom hook for managing prediction data state.
 * Provides common state management for loading, saving, and error handling.
 *
 * @param initialData - Initial data value (default: null)
 * @returns Object with data, loading, saving, error states and their setters
 *
 * @example
 * const { data, setData, loading, setLoading, saving, setSaving, error, setError } = usePredictionData<GroupPredictions>();
 */
export function usePredictionData<T>(initialData: T | null = null): UsePredictionDataReturn<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    setData,
    loading,
    setLoading,
    saving,
    setSaving,
    error,
    setError,
    clearError,
  };
}

export default usePredictionData;
