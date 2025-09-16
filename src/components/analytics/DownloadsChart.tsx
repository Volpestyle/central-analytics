/**
 * App Store Downloads Visualization Component
 * Simplified using shared utilities and hooks
 */

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ChartContainer } from "@components/charts/ChartContainer";
import type {
  TimeRange,
  AppStoreDownloads,
  GeographicDistribution,
  AggregatedMetrics,
} from "@/types/analytics";
import { useChartData, useChartViewModes } from "@/hooks/useChartData";
import {
  formatTimestamps,
  formatNumber,
  createLineChartOptions,
  createPieChartOptions,
  createBarChartOptions,
} from "@/utils/chartUtils";
import { getResponsiveOptions } from "@/utils/chartTheme";

interface DownloadsChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

export const DownloadsChart: React.FC<DownloadsChartProps> = ({
  appId,
  timeRange,
  detailed = false,
  metrics,
}) => {
  const { data, isLoading, error, refetch } = useChartData({
    appId,
    timeRange,
    endpoint: `/api/apps/${appId}/metrics/appstore/downloads`,
    aggregatedMetrics: metrics,
    transformData: (data) => ({
      downloads: data.data || [],
      geo: metrics?.appStore?.countries || [],
      summary: metrics?.appStore,
    }),
  });

  const { selectedMode, controls } = useChartViewModes([
    "downloads",
    "geographic",
    "breakdown",
  ]);

  const chartOptions = useMemo<EChartsOption>(() => {
    if (!data?.downloads?.length) return {};

    const timestamps = formatTimestamps(data.downloads);

    if (selectedMode === "geographic" && data.geo?.length > 0) {
      return createPieChartOptions({
        data: data.geo.map((item) => ({
          name: item.country,
          value: item.downloads,
        })),
        title: "Geographic Distribution",
        colors: getCountryColors(data.geo),
        width: window.innerWidth,
      });
    }

    if (selectedMode === "breakdown") {
      return createBreakdownChart(
        data.downloads,
        timestamps,
        window.innerWidth,
      );
    }

    // Default downloads trend chart
    return createDownloadsTrendChart(
      data.downloads,
      timestamps,
      window.innerWidth,
    );
  }, [data, selectedMode]);

  const summaryStats = useMemo(() => {
    if (!data?.downloads?.length) return null;

    const downloads = data.downloads;
    const totalDownloads = downloads.reduce((sum, d) => sum + d.downloads, 0);
    const totalRedownloads = downloads.reduce(
      (sum, d) => sum + d.redownloads,
      0,
    );
    const totalUpdates = downloads.reduce((sum, d) => sum + d.updates, 0);
    const totalInstalls = downloads.reduce(
      (sum, d) => sum + d.totalInstalls,
      0,
    );

    return {
      totalDownloads,
      totalRedownloads,
      totalUpdates,
      totalInstalls,
      conversionRate: ((totalDownloads / totalInstalls) * 100).toFixed(1),
      avgDaily: Math.floor(totalDownloads / downloads.length),
    };
  }, [data]);

  return (
    <>
      <ChartContainer
        title="Download Analytics"
        loading={isLoading}
        error={error}
        onRetry={refetch}
        controls={
          !error &&
          data?.downloads?.length > 0 && (
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
                  {control.mode === "geographic" ? "Geographic" : control.label}
                </button>
              ))}
            </div>
          )
        }
      >
        {!error && data?.downloads?.length > 0 && (
          <ReactECharts
            option={chartOptions}
            style={{ height: "300px" }}
            theme="dark"
          />
        )}
      </ChartContainer>

      {detailed && summaryStats && !error && data?.downloads?.length > 0 && (
        <>
          <ChartContainer
            title="Download Summary"
            loading={isLoading}
            error={error}
            onRetry={refetch}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">
                  New Downloads
                </p>
                <p className="text-lg font-bold text-text-primary">
                  {summaryStats.totalDownloads.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">Redownloads</p>
                <p className="text-lg font-bold text-text-primary">
                  {summaryStats.totalRedownloads.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">Updates</p>
                <p className="text-lg font-bold text-text-primary">
                  {summaryStats.totalUpdates.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">
                  Total Installs
                </p>
                <p className="text-lg font-bold text-text-primary">
                  {summaryStats.totalInstalls.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">Conversion</p>
                <p className="text-lg font-bold text-text-primary">
                  {summaryStats.conversionRate}%
                </p>
              </div>
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">Daily Avg</p>
                <p className="text-lg font-bold text-text-primary">
                  {summaryStats.avgDaily.toLocaleString()}
                </p>
              </div>
            </div>
          </ChartContainer>

          {data?.geo?.length > 0 && (
            <ChartContainer
              title="Top Countries"
              loading={isLoading}
              error={error}
              onRetry={refetch}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-surface-light">
                      <th className="pb-2 text-text-secondary font-medium">
                        Country
                      </th>
                      <th className="pb-2 text-text-secondary font-medium text-right">
                        Downloads
                      </th>
                      <th className="pb-2 text-text-secondary font-medium text-right">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.geo.slice(0, 7).map((country) => (
                      <tr
                        key={country.countryCode}
                        className="border-b border-surface-light/50"
                      >
                        <td className="py-2 text-text-primary flex items-center gap-2">
                          <span className="text-lg">
                            {getCountryFlag(country.countryCode)}
                          </span>
                          {country.country}
                        </td>
                        <td className="py-2 text-text-primary text-right">
                          {country.downloads.toLocaleString()}
                        </td>
                        <td className="py-2 text-text-primary text-right">
                          {country.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartContainer>
          )}
        </>
      )}
    </>
  );
};

// Helper functions
function createDownloadsTrendChart(
  downloads: AppStoreDownloads[],
  timestamps: string[],
  width: number,
): EChartsOption {
  return {
    ...getResponsiveOptions(width),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      formatter: (params: any) => {
        const data = downloads[params[0].dataIndex];
        return `${params[0].axisValue}<br/>
          New Downloads: ${data.downloads}<br/>
          Redownloads: ${data.redownloads}<br/>
          Updates: ${data.updates}<br/>
          Total Installs: ${data.totalInstalls}`;
      },
    },
    legend: {
      data: ["New Downloads", "Redownloads", "Updates"],
      textStyle: { color: "#999" },
      bottom: 0,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: timestamps,
      axisLabel: { rotate: timestamps.length > 10 ? 45 : 0 },
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "New Downloads",
        type: "line",
        data: downloads.map((d) => d.downloads),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#0A84FF", width: 2 },
        itemStyle: { color: "#0A84FF" },
      },
      {
        name: "Redownloads",
        type: "line",
        data: downloads.map((d) => d.redownloads),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#32D74B", width: 2 },
        itemStyle: { color: "#32D74B" },
      },
      {
        name: "Updates",
        type: "line",
        data: downloads.map((d) => d.updates),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#FFD60A", width: 2 },
        itemStyle: { color: "#FFD60A" },
      },
    ],
  };
}

function createBreakdownChart(
  downloads: AppStoreDownloads[],
  timestamps: string[],
  width: number,
): EChartsOption {
  return {
    ...getResponsiveOptions(width),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    legend: {
      data: ["New Downloads", "Redownloads", "Updates"],
      textStyle: { color: "#999" },
      bottom: 0,
    },
    xAxis: {
      type: "category",
      data: timestamps,
      axisLabel: { rotate: timestamps.length > 10 ? 45 : 0 },
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "New Downloads",
        type: "bar",
        stack: "total",
        data: downloads.map((d) => d.downloads),
        itemStyle: { color: "#0A84FF" },
      },
      {
        name: "Redownloads",
        type: "bar",
        stack: "total",
        data: downloads.map((d) => d.redownloads),
        itemStyle: { color: "#32D74B" },
      },
      {
        name: "Updates",
        type: "bar",
        stack: "total",
        data: downloads.map((d) => d.updates),
        itemStyle: { color: "#FFD60A" },
      },
    ],
  };
}

function getCountryColors(countries: GeographicDistribution[]): string[] {
  const colorMap: Record<string, string> = {
    "United States": "#0A84FF",
    "United Kingdom": "#32D74B",
    Canada: "#FFD60A",
    Australia: "#FF453A",
    Germany: "#BF5AF2",
    France: "#64D2FF",
    Japan: "#FF9F0A",
    Others: "#5E5CE6",
  };

  return countries.map((country) => colorMap[country.country] || "#999");
}

function getCountryFlag(countryCode: string): string {
  const flagMap: Record<string, string> = {
    US: "🇺🇸",
    GB: "🇬🇧",
    CA: "🇨🇦",
    AU: "🇦🇺",
    DE: "🇩🇪",
    FR: "🇫🇷",
    JP: "🇯🇵",
  };
  return flagMap[countryCode] || "🌍";
}
