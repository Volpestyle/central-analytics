/**
 * Lambda Metrics Visualization Component
 * Rebuilt with proper data handling and professional styling
 */

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ChartContainer } from "@components/charts/ChartContainer";
import type {
  TimeRange,
  LambdaTimeSeriesData,
  LambdaMetrics,
  AggregatedMetrics,
} from "@/types/analytics";
import { useChartData } from "@/hooks/useChartData";
import {
  formatTimestamps,
  formatNumber,
  formatCurrency,
  createLineChartOptions,
  createBarChartOptions,
  createEmptyStateOptions,
  isEmptyData,
  validateChartData
} from "@/utils/chartUtils";
import { darkTheme, getResponsiveOptions } from "@/utils/chartTheme";

interface LambdaMetricsChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

type ViewMode = 'invocations' | 'errors' | 'duration' | 'cost';

export const LambdaMetricsChart: React.FC<LambdaMetricsChartProps> = ({
  appId,
  timeRange,
  detailed = false,
  metrics,
}) => {
  const [selectedMode, setSelectedMode] = useState<ViewMode>('invocations');

  const { data, isLoading, error, refetch } = useChartData({
    appId,
    timeRange,
    endpoint: `/api/apps/${appId}/metrics/aws/lambda/timeseries`,
    aggregatedMetrics: metrics,
    transformData: (response) => {
      if (!response) {
        return { timeSeries: [], functionMetrics: [] };
      }

      // Handle the actual API response structure
      // API returns { data: [], metadata: {...} }
      let timeSeries = [];

      // Check if response has data array
      if (response.data && Array.isArray(response.data)) {
        // If data is empty array, that's valid - just no data yet
        timeSeries = response.data;
      }

      // Get function metrics from aggregated metrics if available
      const functionMetrics = metrics?.aws?.lambda?.functionMetrics || [];

      return {
        timeSeries,
        functionMetrics,
        metadata: response.metadata || {}
      };
    },
  });

  // Create view mode controls
  const viewModes: { mode: ViewMode; label: string; color: string }[] = [
    { mode: 'invocations', label: 'Invocations', color: '#0A84FF' },
    { mode: 'errors', label: 'Errors', color: '#FF453A' },
    { mode: 'duration', label: 'Duration', color: '#32D74B' },
    { mode: 'cost', label: 'Cost', color: '#FFD60A' },
  ];

  // Create chart options based on data and view mode
  const chartOptions = useMemo<EChartsOption>(() => {
    // Check if we have any data
    if (isEmptyData(data?.timeSeries)) {
      return createEmptyStateOptions("No Lambda metrics available for this time period");
    }

    const timeSeries = data.timeSeries;

    // For detailed view with function breakdown
    if (detailed && data.functionMetrics && data.functionMetrics.length > 0) {
      return createDetailedFunctionChart(data.functionMetrics, window.innerWidth);
    }

    // Format timestamps
    const timestamps = formatTimestamps(timeSeries, timeRange);

    // Extract data based on selected mode
    let chartData: number[] = [];
    let yAxisLabel = '';
    let formatter = formatNumber;

    switch (selectedMode) {
      case 'invocations':
        chartData = timeSeries.map((d: any) => d.invocations || d.value || 0);
        yAxisLabel = 'Invocations';
        break;
      case 'errors':
        chartData = timeSeries.map((d: any) => d.errors || 0);
        yAxisLabel = 'Errors';
        break;
      case 'duration':
        chartData = timeSeries.map((d: any) => d.duration || d.averageDuration || 0);
        yAxisLabel = 'Duration (ms)';
        break;
      case 'cost':
        chartData = timeSeries.map((d: any) => d.cost || d.estimatedCost || 0);
        yAxisLabel = 'Cost ($)';
        formatter = formatCurrency;
        break;
    }

    // Use the utility function to create proper line chart
    return createLineChartOptions({
      data: chartData,
      timestamps,
      title: undefined, // Title is handled by ChartContainer
      smooth: true,
      colors: [viewModes.find(m => m.mode === selectedMode)?.color || '#0A84FF'],
      width: window.innerWidth,
      yAxisLabel,
      showArea: true,
      showAnimation: true
    });
  }, [data, selectedMode, detailed, timeRange]);

  return (
    <>
      <ChartContainer
        title="Lambda Functions"
        subtitle={data?.metadata?.period || undefined}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        controls={
          !isEmptyData(data?.timeSeries) && (
            <div className="flex gap-1 p-1 bg-[rgba(255,255,255,0.05)] rounded-lg">
              {viewModes.map(({ mode, label, color }) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${
                    selectedMode === mode
                      ? `text-white shadow-lg`
                      : "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
                  }`}
                  style={{
                    backgroundColor: selectedMode === mode ? color : 'transparent'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )
        }
      >
        {!isEmptyData(data?.timeSeries) && (
          <ReactECharts
            option={chartOptions}
            style={{ height: "300px" }}
            theme="dark"
            notMerge={true}
            lazyUpdate={true}
          />
        )}
      </ChartContainer>

      {/* Function breakdown table for detailed view */}
      {detailed && data?.functionMetrics && data.functionMetrics.length > 0 && (
        <ChartContainer
          title="Function Breakdown"
          loading={isLoading}
          error={error}
          className="mt-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[rgba(255,255,255,0.1)]">
                  <th className="pb-3 text-[rgba(255,255,255,0.5)] font-medium text-xs">
                    Function
                  </th>
                  <th className="pb-3 text-[rgba(255,255,255,0.5)] font-medium text-xs text-right">
                    Invocations
                  </th>
                  <th className="pb-3 text-[rgba(255,255,255,0.5)] font-medium text-xs text-right">
                    Error Rate
                  </th>
                  <th className="pb-3 text-[rgba(255,255,255,0.5)] font-medium text-xs text-right">
                    Avg Duration
                  </th>
                  <th className="pb-3 text-[rgba(255,255,255,0.5)] font-medium text-xs text-right">
                    Cold Starts
                  </th>
                  <th className="pb-3 text-[rgba(255,255,255,0.5)] font-medium text-xs text-right">
                    Est. Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.functionMetrics.map((fn: LambdaMetrics) => (
                  <tr
                    key={fn.functionName}
                    className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <td className="py-3 text-white font-mono text-xs">
                      {fn.functionName
                        .replace("ilikeyacut-", "")
                        .replace("-dev", "")}
                    </td>
                    <td className="py-3 text-white text-right font-mono text-xs">
                      {fn.invocations.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`font-mono text-xs ${
                          fn.errorRate > 1 ? "text-[#FF453A]" : "text-[#32D74B]"
                        }`}
                      >
                        {fn.errorRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 text-white text-right font-mono text-xs">
                      {fn.averageDuration.toFixed(0)}ms
                    </td>
                    <td className="py-3 text-white text-right font-mono text-xs">
                      {fn.coldStarts}
                    </td>
                    <td className="py-3 text-[#FFD60A] text-right font-mono text-xs">
                      ${fn.estimatedCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[rgba(255,255,255,0.1)]">
                  <td className="pt-3 text-[rgba(255,255,255,0.7)] font-medium text-xs">
                    Total
                  </td>
                  <td className="pt-3 text-white text-right font-mono text-xs font-medium">
                    {data.functionMetrics.reduce((sum: number, fn: LambdaMetrics) => sum + fn.invocations, 0).toLocaleString()}
                  </td>
                  <td className="pt-3 text-right">
                    <span className="font-mono text-xs font-medium text-[rgba(255,255,255,0.7)]">
                      {(data.functionMetrics.reduce((sum: number, fn: LambdaMetrics) => sum + fn.errorRate, 0) / data.functionMetrics.length).toFixed(2)}%
                    </span>
                  </td>
                  <td className="pt-3 text-white text-right font-mono text-xs font-medium">
                    {(data.functionMetrics.reduce((sum: number, fn: LambdaMetrics) => sum + fn.averageDuration, 0) / data.functionMetrics.length).toFixed(0)}ms
                  </td>
                  <td className="pt-3 text-white text-right font-mono text-xs font-medium">
                    {data.functionMetrics.reduce((sum: number, fn: LambdaMetrics) => sum + fn.coldStarts, 0)}
                  </td>
                  <td className="pt-3 text-[#FFD60A] text-right font-mono text-xs font-medium">
                    ${data.functionMetrics.reduce((sum: number, fn: LambdaMetrics) => sum + fn.estimatedCost, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </ChartContainer>
      )}
    </>
  );
};

// Helper function to create detailed function breakdown chart
function createDetailedFunctionChart(
  functionMetrics: LambdaMetrics[],
  width: number,
): EChartsOption {
  const functions = functionMetrics.map((f) =>
    f.functionName.replace("ilikeyacut-", "").replace("-dev", ""),
  );

  return {
    ...darkTheme,
    ...getResponsiveOptions(width),
    backgroundColor: 'transparent',
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
        shadowStyle: {
          color: 'rgba(10, 132, 255, 0.1)'
        }
      },
      formatter: (params: any) => {
        const fn = functionMetrics[params[0].dataIndex];
        return `
          <div style="font-size: 12px; line-height: 1.5;">
            <div style="color: rgba(255,255,255,0.5); margin-bottom: 8px; font-weight: 500;">
              ${params[0].axisValue}
            </div>
            <div style="display: grid; grid-template-columns: auto auto; gap: 4px 12px;">
              <span style="color: rgba(255,255,255,0.7);">Invocations:</span>
              <span style="color: #fff; text-align: right;">${fn.invocations.toLocaleString()}</span>
              <span style="color: rgba(255,255,255,0.7);">Error Rate:</span>
              <span style="color: ${fn.errorRate > 1 ? '#FF453A' : '#32D74B'}; text-align: right;">${fn.errorRate.toFixed(2)}%</span>
              <span style="color: rgba(255,255,255,0.7);">Avg Duration:</span>
              <span style="color: #fff; text-align: right;">${fn.averageDuration.toFixed(0)}ms</span>
              <span style="color: rgba(255,255,255,0.7);">Cold Starts:</span>
              <span style="color: #fff; text-align: right;">${fn.coldStarts}</span>
              <span style="color: rgba(255,255,255,0.7);">Est. Cost:</span>
              <span style="color: #FFD60A; text-align: right;">$${fn.estimatedCost.toFixed(2)}</span>
            </div>
          </div>
        `;
      },
    },
    legend: {
      show: false
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '15%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: functions,
      axisLine: {
        lineStyle: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        rotate: functions.length > 5 ? 45 : 0,
        interval: 0
      }
    },
    yAxis: {
      type: "value",
      name: 'Invocations',
      nameTextStyle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12
      },
      axisLine: { show: false },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        formatter: (value: number) => formatNumber(value)
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
        name: "Invocations",
        type: "bar",
        data: functionMetrics.map((f) => f.invocations),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#0A84FF" },
              { offset: 1, color: "rgba(10, 132, 255, 0.3)" },
            ],
          },
        },
        emphasis: {
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#3CA0FF" },
                { offset: 1, color: "rgba(60, 160, 255, 0.4)" },
              ],
            },
          }
        },
        label: {
          show: functionMetrics.length <= 10,
          position: "top",
          formatter: (params: any) => formatNumber(params.value),
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 10
        },
        animationDuration: 1000,
        animationEasing: 'elasticOut',
        animationDelay: (idx: number) => idx * 100
      },
    ],
  };
}