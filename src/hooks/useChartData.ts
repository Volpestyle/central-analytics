/**
 * Custom hook for managing chart data fetching and state
 * Consolidates common patterns across analytics components
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { darkTheme } from "@/utils/chartTheme";
import type { TimeRange, AggregatedMetrics } from "@/types/analytics";
import type { EChartsOption } from "echarts";
import { useMetricsStore } from "@/stores/metricsStore";

interface UseChartDataOptions<TData, TTransformed = TData> {
  appId: string;
  timeRange: TimeRange;
  endpoint: string;
  aggregatedMetrics?: AggregatedMetrics | null;
  transformData?: (data: TData) => TTransformed;
  enabled?: boolean;
}

interface UseChartDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useChartData<TData = unknown, TTransformed = TData>({
  appId,
  timeRange,
  endpoint,
  aggregatedMetrics,
  transformData,
  enabled = true,
}: UseChartDataOptions<TData, TTransformed>): UseChartDataReturn<TTransformed> {
  const [localData, setLocalData] = useState<TTransformed | null>(null);

  const {
    chartData,
    isLoading: loadingState,
    errors,
    fetchChartData
  } = useMetricsStore();

  const cacheKey = `${appId}-${endpoint}-${timeRange}`;
  const isLoading = loadingState[cacheKey] || false;
  const error = errors[cacheKey];
  const cachedData = chartData[cacheKey];

  useEffect(() => {
    if (!enabled) return;

    const loadData = async () => {
      try {
        const data = await fetchChartData(cacheKey, endpoint, { appId, timeRange });
        if (data && transformData) {
          setLocalData(transformData(data));
        } else {
          setLocalData(data);
        }
      } catch (err) {
        // Error is already handled by the store
      }
    };

    loadData();
  }, [appId, timeRange, endpoint, enabled]);

  const refetch = useCallback(async () => {
    if (!enabled) return;

    try {
      const data = await fetchChartData(cacheKey, endpoint, { appId, timeRange });
      if (data && transformData) {
        setLocalData(transformData(data));
      } else {
        setLocalData(data);
      }
    } catch (err) {
      // Error is already handled by the store
    }
  }, [cacheKey, endpoint, appId, timeRange, transformData, enabled]);

  return {
    data: localData,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Custom hook for managing chart instances with resize observers
 */
export function useChartInstance() {
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(
    null,
  );
  const chartRef = useRef<HTMLDivElement>(null);

  const initializeChart = useCallback(() => {
    if (!chartRef.current) return null;

    const instance = echarts.init(chartRef.current, darkTheme);
    setChartInstance(instance);
    return instance;
  }, []);

  const setOption = useCallback(
    (option: EChartsOption) => {
      if (chartInstance) {
        chartInstance.setOption(option);
      }
    },
    [chartInstance],
  );

  // Handle resize
  useEffect(() => {
    if (!chartRef.current || !chartInstance) return;

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [chartInstance]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (chartInstance) {
        chartInstance.dispose();
      }
    };
  }, [chartInstance]);

  return {
    chartRef,
    chartInstance: chartInstance || initializeChart(),
    setOption,
  };
}

/**
 * Custom hook for managing chart view modes
 */
export function useChartViewModes<T extends string>(modes: T[]) {
  const [selectedMode, setSelectedMode] = useState<T>(modes[0]);

  const controls = useMemo(
    () =>
      modes.map((mode) => ({
        mode,
        label: mode.charAt(0).toUpperCase() + mode.slice(1),
        isActive: selectedMode === mode,
        onClick: () => setSelectedMode(mode),
      })),
    [modes, selectedMode],
  );

  return {
    selectedMode,
    controls,
  };
}

/**
 * Custom hook for formatting chart data
 */
export function useFormattedChartData<T extends { timestamp?: string | Date; date?: string | Date }>(data: T[], timeRange: TimeRange) {
  const timestamps = useMemo(
    () =>
      data.map((d) => {
        const date = new Date(d.timestamp || d.date);
        if (timeRange === "24h") {
          return date.toLocaleTimeString("en-US", { hour: "2-digit" });
        }
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }),
    [data, timeRange],
  );

  const formatNumber = useCallback((value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }, []);

  const formatPercentage = useCallback(
    (value: number) => `${value.toFixed(1)}%`,
    [],
  );

  return {
    timestamps,
    formatNumber,
    formatPercentage,
  };
}
