/**
 * DynamoDB Metrics Chart Component
 * Simplified using shared utilities and hooks
 */

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ChartContainer } from "@components/charts/ChartContainer";
import type {
  TimeRange,
  DynamoDBMetrics as DynamoDBMetricsType,
  DynamoDBTimeSeriesData,
  AggregatedMetrics,
} from "@/types/analytics";
import { useChartData } from "@/hooks/useChartData";
import {
  formatTimestamps,
  formatNumber,
  createLineChartOptions,
  createBarChartOptions,
  createPieChartOptions,
  createEmptyStateOptions,
  isEmptyData,
} from "@/utils/chartUtils";
import { darkTheme, getResponsiveOptions } from "@/utils/chartTheme";

interface DynamoDBChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

export const DynamoDBChart: React.FC<DynamoDBChartProps> = React.memo(
  ({ appId, timeRange, detailed = false, metrics: aggregatedMetrics }) => {
    const { data, isLoading, error, refetch } = useChartData({
      appId,
      timeRange,
      endpoint: `/api/apps/${appId}/metrics/dynamodb`,
      aggregatedMetrics,
      transformData: (data) => ({
        tables: data.data?.tables || [],
        timeSeries: data.data?.timeSeries || [],
      }),
    });

    const chartOptions = useMemo<EChartsOption>(() => {
      if (!data?.timeSeries?.length && !data?.tables?.length) {
        return createEmptyStateOptions("No DynamoDB data available for this time period");
      }

      if (detailed && data.timeSeries?.length > 0) {
        return createDetailedTimeSeriesChart(data.timeSeries, window.innerWidth);
      }

      if (data.tables?.length > 0) {
        return createPieChartOptions({
          data: data.tables.map((table) => ({
            name: table.tableName.replace("ilikeyacut-", "").replace("-dev", ""),
            value: table.readCapacityUsed + table.writeCapacityUsed,
          })),
          title: undefined, // Title handled by ChartContainer
          colors: ["#0A84FF", "#32D74B", "#FFD60A", "#FF453A", "#BF5AF2"],
          width: window.innerWidth,
        });
      }

      return createEmptyStateOptions("No DynamoDB metrics available");
    }, [data, detailed]);

    return (
      <ChartContainer
        title={detailed ? "DynamoDB Detailed Metrics" : "DynamoDB"}
        loading={isLoading}
        error={error}
        onRetry={refetch}
      >
        {!error &&
          (data?.timeSeries?.length > 0 || data?.tables?.length > 0) && (
            <ReactECharts
              option={chartOptions}
              style={{ height: "300px" }}
              theme="dark"
            />
          )}

        {/* Table Details for Detailed View */}
        {detailed && !error && data?.tables?.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.tables.map((table, index) => (
              <div key={index} className="bg-surface-light/30 rounded-lg p-4">
                <h4 className="font-medium text-text-primary mb-3 text-sm">
                  {table.tableName.replace("ilikeyacut-", "").replace("-dev", "")}
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Items</span>
                    <span className="text-text-primary font-medium">
                      {table.itemCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Size</span>
                    <span className="text-text-primary font-medium">
                      {(table.tableSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Read Capacity</span>
                    <span className="text-green-400 font-medium">
                      {table.readCapacityUsed.toFixed(2)} RCU
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Write Capacity</span>
                    <span className="text-blue-400 font-medium">
                      {table.writeCapacityUsed.toFixed(2)} WCU
                    </span>
                  </div>
                  {(table.throttledReads > 0 || table.throttledWrites > 0) && (
                    <div className="flex justify-between pt-2 border-t border-surface-light">
                      <span className="text-red-400">Throttles</span>
                      <span className="text-red-400 font-medium">
                        R: {table.throttledReads} | W: {table.throttledWrites}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-surface-light">
                    <span className="text-text-secondary">Est. Cost</span>
                    <span className="text-yellow-400 font-medium">
                      ${table.estimatedCost.toFixed(2)}/mo
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartContainer>
    );
  },
);

DynamoDBChart.displayName = "DynamoDBChart";

// Also export as DynamoDBMetrics for compatibility
export const DynamoDBMetrics = DynamoDBChart;

// Helper functions
function createDetailedTimeSeriesChart(
  timeSeries: DynamoDBTimeSeriesData[],
  width: number,
): EChartsOption {
  return {
    ...darkTheme,
    ...getResponsiveOptions(width),
    title: {
      text: "DynamoDB Capacity & Performance",
      textStyle: {
        fontSize: 16,
        fontWeight: "medium",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
    },
    legend: {
      data: ["Read Capacity", "Write Capacity", "Throttles"],
      textStyle: { color: "#999" },
      bottom: 0,
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
      data: formatTimestamps(timeSeries),
      axisLabel: {
        rotate: width < 768 ? 45 : 0,
      },
    },
    yAxis: [
      {
        type: "value",
        name: "Capacity Units",
        position: "left",
      },
      {
        type: "value",
        name: "Throttles",
        position: "right",
        splitLine: {
          lineStyle: {
            color: "rgba(255, 69, 58, 0.1)",
          },
        },
      },
    ],
    series: [
      {
        name: "Read Capacity",
        type: "line",
        data: timeSeries.map((ts) => ts.readCapacity),
        smooth: true,
        yAxisIndex: 0,
        itemStyle: { color: "#32D74B" },
        lineStyle: { width: 2, color: "#32D74B" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(50, 215, 75, 0.3)" },
              { offset: 1, color: "rgba(50, 215, 75, 0.05)" },
            ],
          },
        },
      },
      {
        name: "Write Capacity",
        type: "line",
        data: timeSeries.map((ts) => ts.writeCapacity),
        smooth: true,
        yAxisIndex: 0,
        itemStyle: { color: "#0A84FF" },
        lineStyle: { width: 2, color: "#0A84FF" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(10, 132, 255, 0.3)" },
              { offset: 1, color: "rgba(10, 132, 255, 0.05)" },
            ],
          },
        },
      },
      {
        name: "Throttles",
        type: "bar",
        data: timeSeries.map((ts) => ts.throttles),
        yAxisIndex: 1,
        itemStyle: { color: "#FF453A" },
        barWidth: width > 768 ? "60%" : "40%",
      },
    ],
  };
}
