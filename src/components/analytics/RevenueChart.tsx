/**
 * App Store Revenue Visualization Component
 * Simplified using shared utilities and hooks
 */

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ChartContainer } from "@components/charts/ChartContainer";
import type {
  TimeRange,
  RevenueMetrics,
  CreditPackSales,
  AggregatedMetrics,
} from "@/types/analytics";
import { useChartData, useChartViewModes } from "@/hooks/useChartData";
import {
  formatTimestamps,
  formatNumber,
  createLineChartOptions,
  createBarChartOptions,
} from "@/utils/chartUtils";
import { darkTheme, getResponsiveOptions } from "@/utils/chartTheme";

interface RevenueChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  appId,
  timeRange,
  detailed = false,
  metrics,
}) => {
  const { data, isLoading, error } = useChartData({
    appId,
    timeRange,
    endpoint: `/api/apps/${appId}/metrics/appstore/revenue`,
    aggregatedMetrics: metrics,
    transformData: (data) => ({
      revenue: data.data || [],
      creditPacks: metrics?.appStore?.creditPacks || [],
    }),
  });

  const { selectedMode, controls } = useChartViewModes([
    "revenue",
    "arpu",
    "packs",
  ]);

  const chartOptions = useMemo<EChartsOption>(() => {
    if (!data?.revenue?.length) return {};

    const timestamps = formatTimestamps(data.revenue);

    if (selectedMode === "arpu") {
      return createArpuChart(data.revenue, timestamps, window.innerWidth);
    }

    if (selectedMode === "packs" && data.creditPacks?.length > 0) {
      return createCreditPacksChart(
        data.creditPacks,
        window.innerWidth,
      );
    }

    // Default revenue trend chart
    return createRevenueTrendChart(data.revenue, timestamps, window.innerWidth);
  }, [data, selectedMode]);

  const summaryStats = useMemo(() => {
    if (!data?.revenue?.length) return null;

    const revenue = data.revenue;
    const totalRevenue = revenue.reduce((sum, d) => sum + d.totalRevenue, 0);
    const totalTransactions = revenue.reduce(
      (sum, d) => sum + d.transactions,
      0,
    );
    const avgArpu = revenue.reduce((sum, d) => sum + d.arpu, 0) / revenue.length;
    const avgArppu = revenue.reduce((sum, d) => sum + d.arppu, 0) / revenue.length;

    return {
      totalRevenue,
      totalTransactions,
      avgArpu,
      avgArppu,
      avgTransactionValue: totalRevenue / totalTransactions,
    };
  }, [data]);

  return (
    <>
      <ChartContainer
        title="Revenue Analytics"
        loading={isLoading}
        error={error}
        controls={
          !error &&
          data?.revenue?.length > 0 && (
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
                  {control.label === "Packs" ? "Credit Packs" : control.label}
                </button>
              ))}
            </div>
          )
        }
      >
        {!error && data?.revenue?.length > 0 && (
          <ReactECharts
            option={chartOptions}
            style={{ height: "300px" }}
            theme="dark"
          />
        )}
      </ChartContainer>

      {detailed && summaryStats && !error && data?.revenue?.length > 0 && (
        <ChartContainer
          title="Revenue Summary"
          loading={isLoading}
          error={error}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">Total Revenue</p>
              <p className="text-lg font-bold text-text-primary">
                ${summaryStats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">Transactions</p>
              <p className="text-lg font-bold text-text-primary">
                {summaryStats.totalTransactions.toLocaleString()}
              </p>
            </div>
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">Avg Transaction</p>
              <p className="text-lg font-bold text-text-primary">
                ${summaryStats.avgTransactionValue.toFixed(2)}
              </p>
            </div>
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">ARPU</p>
              <p className="text-lg font-bold text-text-primary">
                ${summaryStats.avgArpu.toFixed(2)}
              </p>
            </div>
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">ARPPU</p>
              <p className="text-lg font-bold text-text-primary">
                ${summaryStats.avgArppu.toFixed(2)}
              </p>
            </div>
          </div>

          {data?.creditPacks?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Credit Pack Performance
              </h4>
              <div className="space-y-2">
                {data.creditPacks.map((pack) => (
                  <div
                    key={pack.packId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-secondary">
                          {pack.packName}
                        </span>
                        <span className="text-xs text-text-primary font-medium">
                          ${pack.revenue} ({pack.unitsSold} sold)
                        </span>
                      </div>
                      <div className="w-full bg-surface rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-500"
                          style={{ width: `${pack.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartContainer>
      )}
    </>
  );
};

// Helper functions
function createRevenueTrendChart(
  revenue: RevenueMetrics[],
  timestamps: string[],
  width: number,
): EChartsOption {
  return {
    ...darkTheme,
    ...getResponsiveOptions(width),
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
      formatter: (params: any) => {
        const data = revenue[params[0].dataIndex];
        return `${params[0].axisValue}<br/>
          Total Revenue: $${data.totalRevenue.toFixed(2)}<br/>
          IAP: $${data.inAppPurchases.toFixed(2)}<br/>
          Subscriptions: $${data.subscriptions.toFixed(2)}<br/>
          Transactions: ${data.transactions}`;
      },
    },
    legend: {
      data: ["In-App Purchases", "Subscriptions"],
      textStyle: { color: "#999" },
      bottom: 0,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: timestamps,
      axisLabel: {
        rotate: timestamps.length > 10 ? 45 : 0,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => `$${formatNumber(value)}`,
      },
    },
    series: [
      {
        name: "In-App Purchases",
        type: "line",
        stack: "Total",
        smooth: true,
        lineStyle: { width: 0 },
        showSymbol: false,
        areaStyle: { color: "#FFD60A" },
        emphasis: { focus: "series" },
        data: revenue.map((d) => d.inAppPurchases),
      },
      {
        name: "Subscriptions",
        type: "line",
        stack: "Total",
        smooth: true,
        lineStyle: { width: 0 },
        showSymbol: false,
        areaStyle: { color: "#BF5AF2" },
        emphasis: { focus: "series" },
        data: revenue.map((d) => d.subscriptions),
      },
    ],
  };
}

function createArpuChart(
  revenue: RevenueMetrics[],
  timestamps: string[],
  width: number,
): EChartsOption {
  return {
    ...darkTheme,
    ...getResponsiveOptions(width),
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        return `${params[0].axisValue}<br/>
          ARPU: $${params[0].value.toFixed(2)}<br/>
          ARPPU: $${params[1].value.toFixed(2)}`;
      },
    },
    legend: {
      data: ["ARPU", "ARPPU"],
      textStyle: { color: "#999" },
      bottom: 0,
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
      axisLabel: {
        formatter: (value: number) => `$${value}`,
      },
    },
    series: [
      {
        name: "ARPU",
        type: "line",
        data: revenue.map((d) => d.arpu),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#0A84FF", width: 2 },
        itemStyle: { color: "#0A84FF" },
      },
      {
        name: "ARPPU",
        type: "line",
        data: revenue.map((d) => d.arppu),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#32D74B", width: 2 },
        itemStyle: { color: "#32D74B" },
      },
    ],
  };
}

function createCreditPacksChart(
  creditPacks: CreditPackSales[],
  width: number,
): EChartsOption {
  const xAxisData = creditPacks.map((p) => p.packName);

  return createBarChartOptions({
    data: creditPacks.map((p) => p.unitsSold),
    xAxisData,
    title: "Credit Pack Sales",
    colors: ["#FFD60A"],
    width,
  });
}
