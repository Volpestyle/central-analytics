/**
 * AWS Cost Breakdown Visualization Component
 * Simplified using shared utilities and hooks
 */

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ChartContainer } from "@components/charts/ChartContainer";
import { ErrorBoundary } from "@components/ErrorBoundary";
import type {
  TimeRange,
  AWSCostBreakdown,
  DailyCostData,
  CostProjection,
  AggregatedMetrics,
} from "@/types/analytics";
import { useChartData, useChartViewModes } from "@/hooks/useChartData";
import {
  formatTimestamps,
  createPieChartOptions,
  createBarChartOptions,
  formatNumber,
} from "@/utils/chartUtils";
import { getResponsiveOptions } from "@/utils/chartTheme";

interface CostBreakdownChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

export const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({
  appId,
  timeRange,
  detailed = false,
  metrics,
}) => {
  const { data, isLoading, error } = useChartData({
    appId,
    timeRange,
    endpoint: `/api/apps/${appId}/metrics/aws/cost/breakdown`,
    aggregatedMetrics: metrics,
    transformData: (data) => ({
      breakdown: metrics?.aws?.cost?.topServices || data.data || [],
      projection: metrics?.aws?.cost ? {
        currentMonthToDate: metrics.aws.cost.currentPeriod,
        projectedMonthEnd: metrics.aws.cost.projectedMonth,
        lastMonthTotal: metrics.aws.cost.projectedMonth * 0.85,
        percentageChange: ((metrics.aws.cost.projectedMonth - (metrics.aws.cost.projectedMonth * 0.85)) / (metrics.aws.cost.projectedMonth * 0.85)) * 100,
      } : null,
    }),
  });

  const { selectedMode, controls } = useChartViewModes([
    "pie",
    "projection",
  ]);

  const chartOptions = useMemo<EChartsOption>(() => {
    if (!data?.breakdown?.length) {
      return {
        title: {
          text: 'No data available',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#666',
            fontSize: 14
          }
        }
      };
    }

    if (selectedMode === "projection" && data.projection) {
      return createProjectionChart(data.projection, window.innerWidth);
    }

    // Ensure we have valid data for the pie chart
    const validData = data.breakdown
      .filter(item => item && (item.cost > 0))
      .map(item => ({
        name: item.serviceName || item.service || 'Unknown',
        value: item.cost || 0,
      }));

    if (validData.length === 0) {
      return {
        title: {
          text: 'No cost data available',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#666',
            fontSize: 14
          }
        }
      };
    }

    return createPieChartOptions({
      data: validData,
      title: "Cost Breakdown by Service",
      colors: getServiceColors(data.breakdown),
      width: window.innerWidth,
    });
  }, [data, selectedMode]);

  return (
    <>
      <ChartContainer
        title="AWS Cost Analysis"
        loading={isLoading}
        error={error}
        controls={
          !error && data?.breakdown?.length > 0 && (
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
                  {control.label === "Pie" ? "Breakdown" : control.label}
                </button>
              ))}
            </div>
          )
        }
      >
        {!error && chartOptions && Object.keys(chartOptions).length > 0 && (
          <ErrorBoundary>
            <ReactECharts
              option={chartOptions}
              style={{ height: "300px" }}
              theme="dark"
              opts={{ renderer: 'svg' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </ErrorBoundary>
        )}

        {selectedMode === "projection" && data?.projection && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">Daily Average</p>
              <p className="text-lg font-bold text-text-primary">
                ${formatNumber(data.projection.currentMonthToDate / new Date().getDate())}
              </p>
            </div>
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">vs Last Month</p>
              <p className={`text-lg font-bold ${data.projection.percentageChange > 0 ? "text-red-400" : "text-green-400"}`}>
                {data.projection.percentageChange > 0 ? "+" : ""}
                {data.projection.percentageChange.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </ChartContainer>

      {detailed && !error && data?.breakdown?.length > 0 && (
        <ChartContainer title="Service Cost Details" loading={isLoading} error={error}>
          <div className="space-y-3">
            {data.breakdown.map((service) => (
              <div key={service.serviceName || service.service} className="bg-surface-light rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-text-primary">
                    {service.serviceName || service.service}
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-primary font-bold">
                      ${service.cost.toFixed(2)}
                    </span>
                    <span className={`text-xs ${service.trend > 0 ? "text-red-400" : "text-green-400"}`}>
                      {service.trend > 0 ? "↑" : "↓"} {Math.abs(service.trend).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-surface rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {service.percentage.toFixed(1)}% of total
                </p>
              </div>
            ))}
          </div>
        </ChartContainer>
      )}
    </>
  );
};

// Helper functions
function getServiceColors(services: AWSCostBreakdown[]): string[] {
  const colorMap = {
    Lambda: "#0A84FF",
    DynamoDB: "#32D74B",
    "API Gateway": "#FFD60A",
    S3: "#FF453A",
    CloudFront: "#BF5AF2",
    CloudWatch: "#64D2FF",
    Other: "#5E5CE6",
  };

  return services.map(service => {
    const key = service.serviceName || service.service;
    return colorMap[key as keyof typeof colorMap] || "#999";
  });
}

function createProjectionChart(
  projection: CostProjection,
  width: number,
): EChartsOption {
  const data = [
    { name: "Last Month", value: projection.lastMonthTotal, color: "#5E5CE6" },
    { name: "Current MTD", value: projection.currentMonthToDate, color: "#0A84FF" },
    {
      name: "Projected End",
      value: projection.projectedMonthEnd,
      color: projection.percentageChange > 0 ? "#FF453A" : "#32D74B",
    },
  ];

  return createBarChartOptions({
    data: data.map(d => d.value),
    xAxisData: data.map(d => d.name),
    title: "Cost Projection",
    colors: data.map(d => d.color),
    width,
  });
}