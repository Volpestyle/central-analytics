/**
 * API Gateway Metrics Chart Component
 * Simplified using shared utilities and hooks
 */

import React, { useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ChartContainer } from "@components/charts/ChartContainer";
import { ErrorState } from "@components/ui/ErrorState";
import { LoadingState } from "@components/ui/LoadingState";
import type {
  TimeRange,
  ApiGatewayMetrics as ApiGatewayMetricsType,
  ApiEndpointSummary,
  AggregatedMetrics,
} from "@/types/analytics";
import { useChartData } from "@/hooks/useChartData";
import {
  formatTimestamps,
  formatNumber,
  createBarChartOptions,
  createEmptyStateOptions,
  isEmptyData,
} from "@/utils/chartUtils";
import { darkTheme, getResponsiveOptions } from "@/utils/chartTheme";

interface ApiGatewayChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

export const ApiGatewayChart: React.FC<ApiGatewayChartProps> = React.memo(
  ({ appId, timeRange, detailed = false, metrics: aggregatedMetrics }) => {
    const { data, isLoading, error, refetch } = useChartData({
      appId,
      timeRange,
      endpoint: `/api/apps/${appId}/metrics/apigateway`,
      aggregatedMetrics,
      transformData: (data) => ({
        timeSeries: data.data?.timeSeries || [],
        endpoints: data.data?.endpoints || [],
      }),
    });

    // Build chart options using shared utilities
    const chartOptions = useMemo<EChartsOption>(() => {
      if (!data?.timeSeries?.length && !data?.endpoints?.length) {
        return createEmptyStateOptions("No API Gateway data available for this time period");
      }

      if (detailed && data.timeSeries?.length > 0) {
        // Detailed view - use raw ECharts for complex charts
        return createDetailedOptions(data.timeSeries, data.endpoints);
      } else if (data.endpoints?.length > 0) {
        // Simple overview - use utilities
        return createSimpleOptions(data.endpoints, window.innerWidth);
      }

      return createEmptyStateOptions("No API Gateway metrics available");
    }, [data, detailed]);

    return (
      <ChartContainer
        title={detailed ? "API Gateway Detailed Metrics" : "API Gateway"}
        loading={isLoading}
        error={error}
        onRetry={refetch}
      >
        {!error && data?.timeSeries?.length > 0 && (
          <ReactECharts
            option={chartOptions}
            style={{ height: "300px" }}
            theme="dark"
          />
        )}

        {/* Endpoint Summary Table for Detailed View */}
        {detailed && !error && data?.endpoints?.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-light">
                  <th className="text-left py-2 px-3 font-medium text-text-secondary">
                    Endpoint
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-text-secondary">
                    Requests
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-text-secondary">
                    Error Rate
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-text-secondary">
                    Avg Latency
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.endpoints.map((endpoint: ApiEndpointSummary, index: number) => (
                  <tr
                    key={index}
                    className="border-b border-surface-light/50 hover:bg-surface-light/30 transition-colors"
                  >
                    <td className="py-2 px-3 text-text-primary font-mono text-xs">
                      {endpoint.endpoint}
                    </td>
                    <td className="text-right py-2 px-3 text-text-primary">
                      {endpoint.totalRequests.toLocaleString()}
                    </td>
                    <td className="text-right py-2 px-3">
                      <span
                        className={`font-medium ${
                          endpoint.errorRate > 0.05
                            ? "text-red-400"
                            : endpoint.errorRate > 0.01
                              ? "text-yellow-400"
                              : "text-green-400"
                        }`}
                      >
                        {(endpoint.errorRate * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right py-2 px-3 text-text-primary">
                      {endpoint.avgLatency.toFixed(0)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartContainer>
    );
  },
);

ApiGatewayChart.displayName = "ApiGatewayChart";

// Also export as ApiGatewayMetrics for compatibility
export const ApiGatewayMetrics = ApiGatewayChart;

// Helper functions for chart options
function createDetailedOptions(
  timeSeries: ApiGatewayMetricsType[],
  endpoints: ApiEndpointSummary[],
): EChartsOption {
  const timestamps = formatTimestamps(timeSeries);

  return {
    ...darkTheme,
    ...getResponsiveOptions(window.innerWidth),
    title: {
      text: "API Gateway Detailed Metrics",
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
    legend: {
      data: ["Requests", "Errors"],
      top: "top",
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: timestamps,
      axisLabel: {
        rotate: timestamps.length > 10 ? 45 : 0,
      },
    },
    yAxis: [
      {
        type: "value",
        name: "Requests",
        position: "left",
      },
      {
        type: "value",
        name: "Errors",
        position: "right",
      },
    ],
    series: [
      {
        name: "Requests",
        type: "line",
        data: timeSeries.map((d) => d.requestCount),
        smooth: true,
        areaStyle: {
          opacity: 0.1,
        },
      },
      {
        name: "Errors",
        type: "line",
        yAxisIndex: 1,
        data: timeSeries.map((d) => d.errorCount4xx + d.errorCount5xx),
        smooth: true,
        lineStyle: {
          color: "#FF453A",
        },
        itemStyle: {
          color: "#FF453A",
        },
      },
    ],
  };
}

function createSimpleOptions(endpoints: ApiEndpointSummary[], width: number): EChartsOption {
  const xAxisData = endpoints.map(
    (e) => e.endpoint.split("/").pop() || e.endpoint,
  );

  return createBarChartOptions({
    data: endpoints.map((e) => e.totalRequests),
    xAxisData,
    title: "API Gateway Requests Overview",
    colors: ["#0A84FF"],
    width,
  });
}
