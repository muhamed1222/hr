import { useState, useCallback } from 'react';
import { ApiResponse } from '../types';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseApiState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export function useApi<T>(url: string, options: UseApiOptions<T> = {}) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false
  });

  const fetchData = useCallback(
    async (body?: unknown, method: string = 'GET') => {
      setState(prev => ({ ...prev, isLoading: true }));

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: body ? JSON.stringify(body) : undefined
        });

        const json = (await response.json()) as ApiResponse<T>;

        if (!response.ok) {
          throw new Error(json.message || 'An error occurred');
        }

        setState({ data: json.data, error: null, isLoading: false });
        options.onSuccess?.(json.data);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setState({
          data: null,
          error: new Error(errorMessage),
          isLoading: false
        });
        options.onError?.(new Error(errorMessage));
      }
    },
    [url, options]
  );

  const get = useCallback(() => fetchData(), [fetchData]);
  const post = useCallback(
    (body: unknown) => fetchData(body, 'POST'),
    [fetchData]
  );
  const put = useCallback(
    (body: unknown) => fetchData(body, 'PUT'),
    [fetchData]
  );
  const del = useCallback(() => fetchData(undefined, 'DELETE'), [fetchData]);

  return {
    ...state,
    get,
    post,
    put,
    delete: del
  };
} 