/**
 * Lambda Metrics Visualization Component
 * Simplified using shared utilities and hooks
 */

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ChartContainer } from "@components/charts/ChartContainer";
import type {
  TimeRange,
  LambdaTimeSeriesData,
  LambdaMetrics,
  AggregatedMetrics,
} from "@/types/analytics";
import { useChartData, useChartViewModes } from "@/hooks/useChartData";
import {
  formatTimestamps,
  formatNumber,
  createLineChartOptions,
} from "@/utils/chartUtils";
import { getResponsiveOptions } from "@/utils/chartTheme";

interface LambdaMetricsChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

export const LambdaMetricsChart: React.FC<LambdaMetricsChartProps> = ({
  appId,
  timeRange,
  detailed = false,
  metrics,
}) => {
  const { data, isLoading, error } = useChartData({
    appId,
    timeRange,
    endpoint: `/api/apps/${appId}/metrics/aws/lambda/timeseries`,
    aggregatedMetrics: metrics,
    transformData: (data) => ({
      timeSeries: data.data || [],
      functionMetrics: metrics?.aws?.lambda?.functionMetrics || [],
    }),
  });

  const { selectedMode, controls } = useChartViewModes([
    "invocations",
    "errors",
    "duration",
    "cost",
  ]);

  const chartOptions = useMemo<EChartsOption>(() => {
    if (!data?.timeSeries?.length) return {};

    const timestamps = formatTimestamps(data.timeSeries);

    if (detailed && data.functionMetrics?.length > 0) {
      return createDetailedOptions(data.functionMetrics, window.innerWidth);
    }

    const dataKey = selectedMode as keyof LambdaTimeSeriesData;
    const chartData = data.timeSeries.map((d) => d[dataKey] as number);

    return createLineChartOptions({
      data: chartData,
      timestamps,
      title: `Lambda ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}`,
      smooth: true,
      colors: [getModeColor(selectedMode)],
      width: window.innerWidth,
      yAxisLabel:
        selectedMode === "cost"
          ? "Cost ($)"
          : selectedMode === "duration"
            ? "Duration (ms)"
            : selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1),
    });
  }, [data, selectedMode, detailed]);

  return (
    <>
      <ChartContainer
        title="Lambda Functions"
        loading={isLoading}
        error={error}
        controls={
          !error &&
          data?.timeSeries?.length > 0 && (
            <div className="flex gap-2">
              {controls.map((control) => (
                <button
                  key={control.mode}
                  onClick={control.onClick}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    control.isActive
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {control.label}
                </button>
              ))}
            </div>
          )
        }
      >
        {!error && data?.timeSeries?.length > 0 && (
          <ReactECharts
            option={chartOptions}
            style={{ height: "300px" }}
            theme="dark"
          />
        )}
      </ChartContainer>

      {detailed && !error && data?.functionMetrics?.length > 0 && (
        <ChartContainer
          title="Function Breakdown"
          loading={isLoading}
          error={error}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-surface-light">
                  <th className="pb-2 text-text-secondary font-medium">
                    Function
                  </th>
                  <th className="pb-2 text-text-secondary font-medium text-right">
                    Invocations
                  </th>
                  <th className="pb-2 text-text-secondary font-medium text-right">
                    Error Rate
                  </th>
                  <th className="pb-2 text-text-secondary font-medium text-right">
                    Avg Duration
                  </th>
                  <th className="pb-2 text-text-secondary font-medium text-right">
                    Cold Starts
                  </th>
                  <th className="pb-2 text-text-secondary font-medium text-right">
                    Est. Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.functionMetrics.map((fn) => (
                  <tr
                    key={fn.functionName}
                    className="border-b border-surface-light/50"
                  >
                    <td className="py-2 text-text-primary font-mono text-xs">
                      {fn.functionName
                        .replace("ilikeyacut-", "")
                        .replace("-dev", "")}
                    </td>
                    <td className="py-2 text-text-primary text-right">
                      {fn.invocations.toLocaleString()}
                    </td>
                    <td
                      className={`py-2 text-right ${fn.errorRate > 1 ? "text-red-400" : "text-green-400"}`}
                    >
                      {fn.errorRate.toFixed(2)}%
                    </td>
                    <td className="py-2 text-text-primary text-right">
                      {fn.averageDuration}ms
                    </td>
                    <td className="py-2 text-text-primary text-right">
                      {fn.coldStarts}
                    </td>
                    <td className="py-2 text-text-primary text-right">
                      ${fn.estimatedCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      )}
    </>
  );
};

// Helper functions
function getModeColor(mode: string): string {
  const colors = {
    invocations: "#0A84FF",
    errors: "#FF453A",
    duration: "#32D74B",
    cost: "#FFD60A",
  };
  return colors[mode as keyof typeof colors] || "#0A84FF";
}

function createDetailedOptions(
  functionMetrics: LambdaMetrics[],
  width: number,
): EChartsOption {
  const functions = functionMetrics.map((f) =>
    f.functionName.replace("ilikeyacut-", "").replace("-dev", ""),
  );

  return {
    ...getResponsiveOptions(width),
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: (params: any) => {
        const fn = functionMetrics[params[0].dataIndex];
        return `${params[0].axisValue}<br/>
          Invocations: ${fn.invocations.toLocaleString()}<br/>
          Errors: ${fn.errorRate.toFixed(2)}%<br/>
          Duration: ${fn.averageDuration}ms<br/>
          Cold Starts: ${fn.coldStarts}`;
      },
    },
    legend: {
      data: ["Invocations"],
      textStyle: { color: "#999" },
      bottom: 0,
    },
    xAxis: {
      type: "category",
      data: functions,
      axisLine: { lineStyle: { color: "#333" } },
      axisLabel: { color: "#999", rotate: 45 },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisLabel: { color: "#999" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
    },
    series: [
      {
        name: "Invocations",
        type: "bar",
        data: functionMetrics.map((f) => f.invocations),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#0A84FF" },
              { offset: 1, color: "#64D2FF" },
            ],
          },
        },
        label: {
          show: width > 768 && functionMetrics.length <= 10,
          position: "top",
          formatter: (params: any) => formatNumber(params.value),
        },
      },
    ],
  };
}
