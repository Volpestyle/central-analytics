/**
 * Chart Types
 * Type definitions for chart data and configurations
 */

import type { EChartsOption } from 'echarts';

export interface ChartDataPoint {
  timestamp: string | Date;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'area' | 'scatter' | 'pie';
  color?: string;
  unit?: string;
}

export interface ChartConfiguration {
  title?: string;
  subtitle?: string;
  series: ChartSeries[];
  showLegend?: boolean;
  showGrid?: boolean;
  responsive?: boolean;
}

export interface ChartTransformFunction<TInput, TOutput> {
  (data: TInput): TOutput;
}

export interface UseChartDataOptions<TData, TTransformed = TData> {
  appId: string;
  timeRange: string;
  endpoint: string;
  aggregatedMetrics?: TData | null;
  transformData?: ChartTransformFunction<TData, TTransformed>;
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseChartDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface ChartViewMode {
  mode: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export interface ChartTooltipParams {
  componentType: string;
  seriesType?: string;
  seriesIndex?: number;
  seriesName?: string;
  name?: string;
  dataIndex?: number;
  data?: unknown;
  value?: unknown;
  color?: string;
  percent?: number;
}