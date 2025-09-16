import { create } from 'zustand';
import { appleAuth } from '@lib/apple-auth';
import type { TimeRange, AggregatedMetrics } from '@/types/analytics';

interface MetricsState {
  // State
  metrics: Record<string, AggregatedMetrics | null>;
  chartData: Record<string, any>;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
  lastFetch: Record<string, number>;

  // Actions
  fetchAggregatedMetrics: (appId: string, timeRange: TimeRange) => Promise<void>;
  fetchChartData: (key: string, endpoint: string, params: any) => Promise<any>;
  setLoading: (key: string, isLoading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearCache: (appId?: string) => void;
}

const CACHE_DURATION = 30000; // 30 seconds cache

export const useMetricsStore = create<MetricsState>((set, get) => ({
  metrics: {},
  chartData: {},
  isLoading: {},
  errors: {},
  lastFetch: {},

  fetchAggregatedMetrics: async (appId: string, timeRange: TimeRange) => {
    const key = `${appId}-${timeRange}`;
    const now = Date.now();
    const lastFetch = get().lastFetch[key];

    // Check cache
    if (lastFetch && now - lastFetch < CACHE_DURATION) {
      return;
    }

    set(state => ({
      isLoading: { ...state.isLoading, [key]: true },
      errors: { ...state.errors, [key]: null }
    }));

    try {
      const token = appleAuth.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/apps/${appId}/metrics/aggregated?timeRange=${timeRange}`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();

      set(state => ({
        metrics: { ...state.metrics, [key]: data },
        lastFetch: { ...state.lastFetch, [key]: now },
        isLoading: { ...state.isLoading, [key]: false }
      }));
    } catch (error) {
      set(state => ({
        errors: { ...state.errors, [key]: error instanceof Error ? error.message : 'An error occurred' },
        isLoading: { ...state.isLoading, [key]: false }
      }));
    }
  },

  fetchChartData: async (key: string, endpoint: string, params: any) => {
    const now = Date.now();
    const lastFetch = get().lastFetch[key];

    // Check cache
    if (lastFetch && now - lastFetch < CACHE_DURATION && get().chartData[key]) {
      return get().chartData[key];
    }

    set(state => ({
      isLoading: { ...state.isLoading, [key]: true },
      errors: { ...state.errors, [key]: null }
    }));

    try {
      const token = appleAuth.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${endpoint}?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();

      set(state => ({
        chartData: { ...state.chartData, [key]: data },
        lastFetch: { ...state.lastFetch, [key]: now },
        isLoading: { ...state.isLoading, [key]: false }
      }));

      return data;
    } catch (error) {
      set(state => ({
        errors: { ...state.errors, [key]: error instanceof Error ? error.message : 'An error occurred' },
        isLoading: { ...state.isLoading, [key]: false }
      }));
      throw error;
    }
  },

  setLoading: (key: string, isLoading: boolean) => {
    set(state => ({
      isLoading: { ...state.isLoading, [key]: isLoading }
    }));
  },

  setError: (key: string, error: string | null) => {
    set(state => ({
      errors: { ...state.errors, [key]: error }
    }));
  },

  clearCache: (appId?: string) => {
    if (appId) {
      set(state => {
        const newMetrics = { ...state.metrics };
        const newChartData = { ...state.chartData };
        const newLastFetch = { ...state.lastFetch };

        Object.keys(newMetrics).forEach(key => {
          if (key.startsWith(appId)) {
            delete newMetrics[key];
            delete newLastFetch[key];
          }
        });

        Object.keys(newChartData).forEach(key => {
          if (key.includes(appId)) {
            delete newChartData[key];
            delete newLastFetch[key];
          }
        });

        return {
          metrics: newMetrics,
          chartData: newChartData,
          lastFetch: newLastFetch
        };
      });
    } else {
      set({
        metrics: {},
        chartData: {},
        lastFetch: {}
      });
    }
  }
}));