/**
 * Utility functions for common chart operations and data transformations
 * Shared across all analytics components to reduce duplication
 */

import * as echarts from "echarts";
import { darkTheme, getResponsiveOptions } from "./chartTheme";
import type { TimeRange } from "@/types/analytics";

/**
 * Format timestamps based on time range for chart axes
 */
export function formatTimestamps(data: any[], timeRange: TimeRange): string[] {
  return data.map((d) => {
    const date = new Date(d.timestamp || d.date);
    if (timeRange === "24h") {
      return date.toLocaleTimeString("en-US", { hour: "2-digit" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
}

/**
 * Format numbers for display in tooltips and labels
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format percentages with consistent precision
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Create common ECharts tooltip formatter
 */
export function createTooltipFormatter(
  metricName: string,
  unit: string = "",
  formatter?: (value: any) => string,
) {
  return (
    params: any,
  ) => {
    const param = Array.isArray(params) ? params[0] : params;
    const value = formatter ? formatter(param.value) : param.value;
    return `${param.axisValue || param.name}<br/>${metricName}: ${value}${unit}`;
  };
}

/**
 * Create standardized bar chart options
 */
export function createBarChartOptions({
  data,
  xAxisData,
  title,
  colors,
  width,
}: {
  data: any[];
  xAxisData: string[];
  title?: string;
  colors?: string[];
  width?: number;
}): echarts.EChartsOption {
  return {
    ...darkTheme,
    ...getResponsiveOptions(width || window.innerWidth),
    title: {
      text: title,
      show: !!title,
      textStyle: {
        fontSize: 16,
        fontWeight: 500,
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
    },
    xAxis: {
      type: "category",
      data: xAxisData,
      axisLabel: {
        rotate: xAxisData.length > 10 ? 45 : 0,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => formatNumber(value),
      },
    },
    series: [
      {
        type: "bar",
        data: data,
        itemStyle: {
          color: colors?.[0] || "#0A84FF",
        },
        label: {
          show: data.length <= 10,
          position: "top",
          formatter: (params: any) => formatNumber(params.value),
        },
      },
    ],
  };
}

/**
 * Create standardized line chart options
 */
export function createLineChartOptions({
  data,
  timestamps,
  title,
  smooth = true,
  colors,
  width,
  yAxisLabel,
}: {
  data: number[];
  timestamps: string[];
  title?: string;
  smooth?: boolean;
  colors?: string[];
  width?: number;
  yAxisLabel?: string;
}): echarts.EChartsOption {
  return {
    ...darkTheme,
    ...getResponsiveOptions(width || window.innerWidth),
    title: {
      text: title,
      show: !!title,
      textStyle: {
        fontSize: 14,
        fontWeight: 500,
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
      formatter: createTooltipFormatter("Value", ""),
    },
    xAxis: {
      type: "category",
      data: timestamps,
      axisLabel: {
        rotate: timestamps.length > 10 ? 45 : 0,
      },
    },
    yAxis: {
      type: "value",
      name: yAxisLabel,
      axisLabel: {
        formatter: (value: number) => formatNumber(value),
      },
    },
    series: [
      {
        type: "line",
        data: data,
        smooth,
        itemStyle: {
          color: colors?.[0] || "#0A84FF",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: (colors?.[0] || "#0A84FF") + "40" },
              { offset: 1, color: (colors?.[0] || "#0A84FF") + "10" },
            ],
          },
        },
      },
    ],
  };
}

/**
 * Create pie chart options
 */
export function createPieChartOptions({
  data,
  title,
  colors,
  width,
}: {
  data: { name: string; value: number }[];
  title?: string;
  colors?: string[];
  width?: number;
}): echarts.EChartsOption {
  return {
    ...darkTheme,
    ...getResponsiveOptions(width || window.innerWidth),
    title: {
      text: title,
      show: !!title,
    },
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      show: false,
    },
    geo: undefined,
    series: [
      {
        name: "Data",
        type: "pie",
        radius: ["35%", "70%"],
        center: ["50%", "55%"],
        avoidLabelOverlap: true,
        data: data.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color: colors?.[index] || undefined,
            borderRadius: 5,
            borderColor: "#000",
            borderWidth: 2,
          },
        })),
        label: {
          show: width && width > 768,
          formatter: "{b}\n{d}%",
          fontSize: 11,
        },
        labelLine: {
          show: width && width > 768,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };
}

/**
 * Transform data for stacked charts
 */
export function transformStackedData<T extends Record<string, any>>(
  data: T[],
  keys: (keyof T)[],
  timestampKey: keyof T = "timestamp",
): {
  timestamps: string[];
  series: {
    name: string;
    data: any[];
    type: "line" | "bar";
    stack?: string;
  }[];
} {
  const timestamps = data.map((d) => String(d[timestampKey]));
  const series = keys.map((key) => ({
    name: String(key),
    data: data.map((d) => d[key]),
    type: "line" as const,
    stack: keys.length > 1 ? "total" : undefined,
  }));

  return { timestamps, series };
}

/**
 * Calculate basic statistics for chart data
 */
export function calculateStats(data: number[]): {
  min: number;
  max: number;
  avg: number;
  sum: number;
} {
  if (data.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0 };
  }

  const sum = data.reduce((a, b) => a + b, 0);
  const avg = sum / data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);

  return { min, max, avg, sum };
}

/**
 * Generate color palette based on theme
 */
export function getChartColors(count: number = 8): string[] {
  const baseColors = [
    "#0A84FF", // Blue
    "#32D74B", // Green
    "#FFD60A", // Yellow
    "#FF453A", // Red
    "#BF5AF2", // Purple
    "#64D2FF", // Light Blue
    "#FF9F0A", // Orange
    "#5E5CE6", // Indigo
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Generate additional colors if needed
  const colors = [...baseColors];
  while (colors.length < count) {
    colors.push(baseColors[colors.length % baseColors.length]);
  }

  return colors;
}
