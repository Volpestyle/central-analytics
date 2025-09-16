/**
 * Custom hook for fetching metrics with error handling
 * Provides a unified interface for API data fetching
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchMetrics, fetchMetricsParallel } from '@lib/api-client';
import type { MetricsResponse } from '@/types/api';

interface UseFetchMetricsOptions {
  endpoint: string;
  params?: Record<string, string | number>;
  enabled?: boolean;
  refreshInterval?: number;
}

interface UseFetchMetricsReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFetchMetrics<T>({
  endpoint,
  params,
  enabled = true,
  refreshInterval,
}: UseFetchMetricsOptions): UseFetchMetricsReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchMetrics<T>(endpoint, params);
      setData(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error(`Error fetching ${endpoint}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, params, enabled]);

  useEffect(() => {
    fetchData();

    if (refreshInterval && enabled) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval, enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

interface ParallelRequest {
  key: string;
  endpoint: string;
  params?: Record<string, string | number>;
}

interface UseParallelFetchReturn<T> {
  data: T | null;
  isLoading: boolean;
  errors: Record<string, string>;
  refetchAll: () => Promise<void>;
}

export function useParallelFetch<T extends Record<string, unknown>>(
  requests: ParallelRequest[],
  enabled = true
): UseParallelFetchReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    if (!enabled || requests.length === 0) return;

    setIsLoading(true);
    setErrors({});

    const results: Record<string, unknown> = {};
    const errorMap: Record<string, string> = {};

    const promises = requests.map(async ({ key, endpoint, params }) => {
      try {
        const response = await fetchMetrics(endpoint, params);
        results[key] = response.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch';
        errorMap[key] = errorMessage;
        console.error(`Error fetching ${key} from ${endpoint}:`, err);
      }
    });

    await Promise.all(promises);

    setData(results as T);
    setErrors(errorMap);
    setIsLoading(false);
  }, [requests, enabled]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    data,
    isLoading,
    errors,
    refetchAll: fetchAll,
  };
}