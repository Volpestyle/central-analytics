/**
 * Utility functions for common chart operations and data transformations
 * Shared across all analytics components to reduce duplication
 */

import * as echarts from "echarts";
import { darkTheme, getResponsiveOptions, chartAnimations } from "./chartTheme";
import type { TimeRange } from "@/types/analytics";

/**
 * Check if data is empty or invalid
 */
export function isEmptyData(data: any): boolean {
  if (!data) return true;
  if (Array.isArray(data) && data.length === 0) return true;
  if (typeof data === 'object' && Object.keys(data).length === 0) return true;
  return false;
}

/**
 * Validate and sanitize chart data
 */
export function validateChartData(data: any[]): any[] {
  if (!Array.isArray(data)) return [];
  return data.filter(item => item !== null && item !== undefined);
}

/**
 * Format timestamps based on time range for chart axes
 */
export function formatTimestamps(data: any[], timeRange?: TimeRange): string[] {
  if (!data || !Array.isArray(data)) return [];

  return data.map((d) => {
    const timestamp = d.timestamp || d.date || d;
    if (!timestamp) return '';

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    // Format based on time range
    if (timeRange === "24h") {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } else if (timeRange === "7d") {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  });
}

/**
 * Format numbers for display in tooltips and labels
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) return '0';

  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  if (Math.abs(value) < 1 && value !== 0) {
    return value.toFixed(2);
  }
  return value.toFixed(0);
}

/**
 * Format currency values
 */
export function formatCurrency(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 2 : 0,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format percentages with consistent precision
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
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
  return (params: any) => {
    if (!params) return '';

    const param = Array.isArray(params) ? params[0] : params;
    if (!param) return '';

    const value = formatter ? formatter(param.value) : formatNumber(param.value);
    const timestamp = param.axisValue || param.name || '';

    return `
      <div style="font-size: 12px; line-height: 1.5;">
        <div style="color: rgba(255,255,255,0.5); margin-bottom: 4px;">${timestamp}</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${param.marker || ''}
          <span style="color: #fff;">${metricName}: <strong>${value}${unit}</strong></span>
        </div>
      </div>
    `;
  };
}

/**
 * Create empty state options for charts
 */
export function createEmptyStateOptions(message: string = "No data available"): echarts.EChartsOption {
  return {
    ...darkTheme,
    backgroundColor: '#0A0A0A',
    graphic: {
      type: 'group',
      left: 'center',
      top: 'center',
      children: [
        {
          type: 'text',
          z: 100,
          left: 'center',
          top: 'center',
          style: {
            fill: 'rgba(255, 255, 255, 0.3)',
            text: message,
            font: '14px Geist, -apple-system, sans-serif'
          }
        },
        {
          type: 'circle',
          z: 99,
          left: 'center',
          top: 'center',
          shape: {
            cx: 0,
            cy: -40,
            r: 30
          },
          style: {
            fill: 'rgba(255, 255, 255, 0.05)',
            stroke: 'rgba(255, 255, 255, 0.1)',
            lineWidth: 1
          }
        }
      ]
    }
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
  yAxisLabel,
  showAnimation = true
}: {
  data: any[];
  xAxisData: string[];
  title?: string;
  colors?: string[];
  width?: number;
  yAxisLabel?: string;
  showAnimation?: boolean;
}): echarts.EChartsOption {
  if (isEmptyData(data) || isEmptyData(xAxisData)) {
    return createEmptyStateOptions("No data to display");
  }

  const validData = validateChartData(data);

  return {
    ...darkTheme,
    ...getResponsiveOptions(width || window.innerWidth),
    ...(showAnimation ? chartAnimations.initialAnimation : {}),
    backgroundColor: 'transparent',
    title: title ? {
      text: title,
      textStyle: {
        fontSize: 14,
        fontWeight: 500,
        color: '#FFFFFF'
      }
    } : undefined,
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
        shadowStyle: {
          color: 'rgba(10, 132, 255, 0.1)'
        }
      },
      formatter: createTooltipFormatter(title || "Value", "")
    },
    xAxis: {
      type: "category",
      data: xAxisData,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      axisLabel: {
        rotate: xAxisData.length > 10 ? 45 : 0,
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11
      }
    },
    yAxis: {
      type: "value",
      name: yAxisLabel,
      nameTextStyle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12
      },
      axisLabel: {
        formatter: (value: number) => formatNumber(value),
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        type: "bar",
        data: validData,
        itemStyle: {
          color: colors?.[0] || "#0A84FF",
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: colors?.[0] ? adjustBrightness(colors[0], 20) : "#3CA0FF"
          }
        },
        label: {
          show: validData.length <= 10,
          position: "top",
          formatter: (params: any) => formatNumber(params.value),
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 10
        },
        animationDelay: showAnimation ? (idx: number) => idx * 30 : 0
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
  showArea = false,
  showAnimation = true
}: {
  data: number[] | Array<{name: string; data: number[]}>;
  timestamps: string[];
  title?: string;
  smooth?: boolean;
  colors?: string[];
  width?: number;
  yAxisLabel?: string;
  showArea?: boolean;
  showAnimation?: boolean;
}): echarts.EChartsOption {
  const isEmpty = Array.isArray(data) && data.length === 0;

  if (isEmpty || isEmptyData(timestamps)) {
    return createEmptyStateOptions("No time series data available");
  }

  const isMultiSeries = data.length > 0 && typeof data[0] === 'object' && 'name' in data[0];

  return {
    ...darkTheme,
    ...getResponsiveOptions(width || window.innerWidth),
    ...(showAnimation ? chartAnimations.initialAnimation : {}),
    backgroundColor: 'transparent',
    title: title ? {
      text: title,
      textStyle: {
        fontSize: 14,
        fontWeight: 500,
        color: '#FFFFFF'
      }
    } : undefined,
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
        crossStyle: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      }
    },
    legend: isMultiSeries ? {
      data: (data as Array<{name: string}>).map(d => d.name),
      textStyle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11
      }
    } : undefined,
    xAxis: {
      type: "category",
      data: timestamps,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      axisLabel: {
        rotate: timestamps.length > 20 ? 45 : 0,
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11
      }
    },
    yAxis: {
      type: "value",
      name: yAxisLabel,
      nameTextStyle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12
      },
      axisLabel: {
        formatter: (value: number) => formatNumber(value),
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
          type: 'dashed'
        }
      }
    },
    series: isMultiSeries
      ? (data as Array<{name: string; data: number[]}>).map((series, index) => ({
          name: series.name,
          type: "line" as const,
          data: validateChartData(series.data),
          smooth,
          lineStyle: {
            width: 2.5,
            color: colors?.[index] || darkTheme.color[index % darkTheme.color.length]
          },
          itemStyle: {
            color: colors?.[index] || darkTheme.color[index % darkTheme.color.length]
          },
          areaStyle: showArea ? {
            color: {
              type: "linear" as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: (colors?.[index] || darkTheme.color[index % darkTheme.color.length]) + "30" },
                { offset: 1, color: (colors?.[index] || darkTheme.color[index % darkTheme.color.length]) + "05" },
              ],
            },
          } : undefined,
          animationDelay: showAnimation ? (idx: number) => idx * 30 : 0
        }))
      : [
          {
            type: "line" as const,
            data: validateChartData(data as number[]),
            smooth,
            lineStyle: {
              width: 2.5,
              color: colors?.[0] || "#0A84FF"
            },
            itemStyle: {
              color: colors?.[0] || "#0A84FF"
            },
            areaStyle: showArea ? {
              color: {
                type: "linear" as const,
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: (colors?.[0] || "#0A84FF") + "30" },
                  { offset: 1, color: (colors?.[0] || "#0A84FF") + "05" },
                ],
              },
            } : undefined,
            animationDelay: showAnimation ? (idx: number) => idx * 30 : 0
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
  showAnimation = true
}: {
  data: { name: string; value: number }[];
  title?: string;
  colors?: string[];
  width?: number;
  showAnimation?: boolean;
}): echarts.EChartsOption {
  if (isEmptyData(data)) {
    return createEmptyStateOptions("No distribution data available");
  }

  const validData = data.filter(item => item && item.value > 0);

  if (validData.length === 0) {
    return createEmptyStateOptions("No data to display");
  }

  return {
    ...darkTheme,
    ...getResponsiveOptions(width || window.innerWidth),
    backgroundColor: 'transparent',
    title: title ? {
      text: title,
      textStyle: {
        fontSize: 14,
        fontWeight: 500,
        color: '#FFFFFF'
      }
    } : undefined,
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        return `
          <div style="font-size: 12px; line-height: 1.5;">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${params.marker}
              <span style="color: #fff;">${params.name}: <strong>${formatNumber(params.value)} (${params.percent}%)</strong></span>
            </div>
          </div>
        `;
      }
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#000000",
          borderWidth: 2,
        },
        label: {
          show: width && width > 768,
          formatter: "{b}\n{d}%",
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.7)'
        },
        labelLine: {
          show: width && width > 768,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 20,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        data: validData.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color: colors?.[index] || darkTheme.color[index % darkTheme.color.length],
          },
        })),
        animationType: showAnimation ? 'scale' : 'expansion',
        animationEasing: 'elasticOut',
        animationDelay: showAnimation ? (idx: number) => Math.random() * 200 : 0
      },
    ],
  };
}

/**
 * Helper function to adjust color brightness
 */
function adjustBrightness(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, ((num >> 16) & 255) + amount);
  const g = Math.min(255, ((num >> 8) & 255) + amount);
  const b = Math.min(255, (num & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
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
  if (isEmptyData(data)) {
    return { timestamps: [], series: [] };
  }

  const timestamps = formatTimestamps(data.map(d => d[timestampKey]));
  const series = keys.map((key) => ({
    name: String(key),
    data: data.map((d) => d[key] || 0),
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
  trend: number;
} {
  if (!data || data.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, trend: 0 };
  }

  const validData = data.filter(v => !isNaN(v));
  if (validData.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, trend: 0 };
  }

  const sum = validData.reduce((a, b) => a + b, 0);
  const avg = sum / validData.length;
  const min = Math.min(...validData);
  const max = Math.max(...validData);

  // Calculate trend (percentage change from first to last)
  const trend = validData.length > 1
    ? ((validData[validData.length - 1] - validData[0]) / validData[0]) * 100
    : 0;

  return { min, max, avg, sum, trend };
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
    "#64D2FF", // Cyan
    "#FF9F0A", // Orange
    "#5E5CE6", // Indigo
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Generate additional colors if needed
  const colors = [...baseColors];
  while (colors.length < count) {
    const baseColor = baseColors[colors.length % baseColors.length];
    colors.push(adjustBrightness(baseColor, (colors.length / baseColors.length) * 20));
  }

  return colors;
}

/**
 * Create a heatmap chart configuration
 */
export function createHeatmapOptions({
  data,
  xAxis,
  yAxis,
  title,
  min,
  max
}: {
  data: number[][];
  xAxis: string[];
  yAxis: string[];
  title?: string;
  min?: number;
  max?: number;
}): echarts.EChartsOption {
  if (isEmptyData(data)) {
    return createEmptyStateOptions("No heatmap data available");
  }

  const flatData: any[] = [];
  data.forEach((row, i) => {
    row.forEach((value, j) => {
      flatData.push([j, i, value || 0]);
    });
  });

  return {
    ...darkTheme,
    backgroundColor: 'transparent',
    title: title ? {
      text: title,
      textStyle: {
        fontSize: 14,
        fontWeight: 500,
        color: '#FFFFFF'
      }
    } : undefined,
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        return `${xAxis[params.value[0]]}, ${yAxis[params.value[1]]}: ${formatNumber(params.value[2])}`;
      }
    },
    grid: {
      height: '60%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxis,
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.02)']
        }
      }
    },
    yAxis: {
      type: 'category',
      data: yAxis,
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.02)']
        }
      }
    },
    visualMap: {
      min: min ?? 0,
      max: max ?? Math.max(...flatData.map(d => d[2])),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#0A84FF', '#32D74B', '#FFD60A', '#FF453A']
      },
      textStyle: {
        color: 'rgba(255, 255, 255, 0.7)'
      }
    },
    series: [{
      type: 'heatmap',
      data: flatData,
      label: {
        show: false
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      animation: true,
      animationDurationUpdate: 1000
    }]
  };
}