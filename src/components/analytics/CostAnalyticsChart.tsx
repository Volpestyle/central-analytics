/**
 * AWS Cost Analytics Chart Component
 * Refactored to use standardized patterns and utilities
 */

import React, { useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { ChartContainer } from '@components/charts/ChartContainer';
import { Button } from '@components/ui/Button';
import type {
  TimeRange,
  DailyCostData,
  AWSCostBreakdown,
  CostProjection,
  AggregatedMetrics
} from '@/types/analytics';
import { useChartData } from '@/hooks/useChartData';
import { formatNumber, formatPercentage, createLineChartOptions } from '@/utils/chartUtils';
import { darkTheme, getResponsiveOptions } from '@/utils/chartTheme';

interface CostAnalyticsChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

interface CostData {
  dailyCosts: DailyCostData[];
  breakdown: AWSCostBreakdown[];
  projection: CostProjection | null;
}

export const CostAnalyticsChart: React.FC<CostAnalyticsChartProps> = React.memo(({
  appId,
  timeRange,
  detailed = false,
  metrics: aggregatedMetrics
}) => {
  // Fetch cost analytics using standardized hook
  const { data, isLoading, error, refetch } = useChartData<CostData>({
    appId,
    timeRange,
    endpoint: `/api/apps/${appId}/metrics/costs`,
    aggregatedMetrics,
    transformData: (response: any) => ({
      dailyCosts: response.dailyCosts || [],
      breakdown: response.breakdown || [],
      projection: response.projection || null
    })
  });

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data || (!data.dailyCosts?.length && !data.breakdown?.length)) return null;

    // Sort daily costs by date
    const sortedCosts = [...data.dailyCosts].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate totals and trends
    const totalCost = sortedCosts.reduce((sum, day) => sum + day.totalCost, 0);
    const avgDailyCost = totalCost / sortedCosts.length;

    // Calculate trend (last 7 days vs previous 7 days)
    const recentDays = sortedCosts.slice(-7);
    const previousDays = sortedCosts.slice(-14, -7);
    const recentAvg = recentDays.reduce((sum, day) => sum + day.totalCost, 0) / recentDays.length;
    const previousAvg = previousDays.length > 0
      ? previousDays.reduce((sum, day) => sum + day.totalCost, 0) / previousDays.length
      : recentAvg;
    const trend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      sortedCosts,
      totalCost,
      avgDailyCost,
      trend,
      breakdown: data.breakdown.sort((a, b) => b.cost - a.cost),
      projection: data.projection
    };
  }, [data]);

  // Create chart options
  const chartOptions = useMemo<EChartsOption>(() => {
    if (!chartData) return {};

    if (detailed) {
      return createDetailedCostOptions(chartData);
    } else {
      return createSimpleCostOptions(chartData);
    }
  }, [chartData, detailed]);

  // Create breakdown chart options
  const breakdownOptions = useMemo<EChartsOption>(() => {
    if (!chartData?.breakdown?.length) return {};
    return createBreakdownOptions(chartData.breakdown);
  }, [chartData]);

  return (
    <>
      <ChartContainer
        title={detailed ? "AWS Cost Analytics - Detailed" : "AWS Costs"}
        subtitle={chartData ? `Total: $${chartData.totalCost.toFixed(2)} | Trend: ${chartData.trend >= 0 ? '+' : ''}${chartData.trend.toFixed(1)}%` : undefined}
        loading={isLoading}
        error={error}
        onRetry={refetch}
      >
        {chartData && (
          <div className="space-y-4">
            {/* Cost Trend Chart */}
            <ReactECharts
              option={chartOptions}
              style={{ height: '300px' }}
              theme="dark"
            />

            {/* Cost Breakdown Chart */}
            {detailed && chartData.breakdown.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-4">Service Breakdown</h4>
                <ReactECharts
                  option={breakdownOptions}
                  style={{ height: '250px' }}
                  theme="dark"
                />
              </div>
            )}

            {/* Cost Projection */}
            {detailed && chartData.projection && (
              <div className="bg-surface-dark p-4 rounded-lg mt-6">
                <h4 className="text-lg font-semibold text-white mb-3">Monthly Projection</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-text-secondary text-sm">Current Month</span>
                    <p className="text-2xl font-bold text-white">
                      ${chartData.projection.currentMonthEstimate.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary text-sm">Next Month</span>
                    <p className="text-2xl font-bold text-white">
                      ${chartData.projection.nextMonthEstimate.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary text-sm">Confidence</span>
                    <p className="text-2xl font-bold text-blue-400">
                      {(chartData.projection.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Cost Services Table */}
            {detailed && chartData.breakdown.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-3">Top Cost Services</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-light">
                        <th className="text-left py-2 font-medium text-text-secondary">Service</th>
                        <th className="text-right py-2 font-medium text-text-secondary">Cost</th>
                        <th className="text-right py-2 font-medium text-text-secondary">% of Total</th>
                        <th className="text-right py-2 font-medium text-text-secondary">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.breakdown.slice(0, 5).map((service) => (
                        <tr key={service.serviceName} className="border-b border-surface-light/50">
                          <td className="py-2 text-text-primary font-medium">
                            {formatServiceName(service.serviceName)}
                          </td>
                          <td className="text-right py-2 text-text-primary">
                            ${service.cost.toFixed(2)}
                          </td>
                          <td className="text-right py-2 text-text-secondary">
                            {((service.cost / chartData.totalCost) * 100).toFixed(1)}%
                          </td>
                          <td className="text-right py-2">
                            <span className={service.change >= 0 ? 'text-red-400' : 'text-green-400'}>
                              {service.change >= 0 ? '+' : ''}{service.change.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </ChartContainer>
    </>
  );
});

CostAnalyticsChart.displayName = 'CostAnalyticsChart';

// Helper functions
function createDetailedCostOptions(chartData: any): EChartsOption {
  const dates = chartData.sortedCosts.map((d: DailyCostData) =>
    new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const services = ['lambda', 'dynamoDB', 'apiGateway', 's3', 'cloudFront', 'other'] as const;

  return {
    ...darkTheme,
    ...getResponsiveOptions(window.innerWidth),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        const date = params[0].axisValue;
        let html = `${date}<br/>`;
        let total = 0;
        params.forEach((param: any) => {
          html += `${param.marker} ${param.seriesName}: $${param.value.toFixed(2)}<br/>`;
          total += param.value;
        });
        html += `<strong>Total: $${total.toFixed(2)}</strong>`;
        return html;
      }
    },
    legend: {
      data: services.map(formatServiceName),
      textStyle: { color: '#999' },
      bottom: 0
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { rotate: dates.length > 15 ? 45 : 0 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => `$${value}` }
    },
    series: services.map(service => ({
      name: formatServiceName(service),
      type: 'line',
      stack: 'total',
      areaStyle: {},
      emphasis: { focus: 'series' },
      data: chartData.sortedCosts.map((day: any) => day.services?.[service] || 0),
      smooth: true
    }))
  };
}

function createSimpleCostOptions(chartData: any): EChartsOption {
  const dates = chartData.sortedCosts.map((d: DailyCostData) =>
    new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const costs = chartData.sortedCosts.map((d: DailyCostData) => d.totalCost);

  return createLineChartOptions({
    data: costs,
    timestamps: dates,
    title: 'Daily Costs',
    smooth: true,
    colors: ['#FFD60A'],
    width: window.innerWidth,
    yAxisLabel: 'Cost ($)',
    showArea: true
  });
}

function createBreakdownOptions(breakdown: AWSCostBreakdown[]): EChartsOption {
  return {
    ...darkTheme,
    ...getResponsiveOptions(window.innerWidth),
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}: $${params.value.toFixed(2)} (${params.percent}%)`;
      }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#1a1a1a',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: '16',
          fontWeight: 'bold',
          formatter: (params: any) => `${params.name}\n$${params.value.toFixed(2)}`
        }
      },
      labelLine: { show: false },
      data: breakdown.slice(0, 5).map(service => ({
        value: service.cost,
        name: formatServiceName(service.serviceName),
        itemStyle: { color: getServiceColor(service.serviceName) }
      }))
    }]
  };
}

function formatServiceName(name: string): string {
  const nameMap: Record<string, string> = {
    lambda: 'Lambda',
    dynamoDB: 'DynamoDB',
    apiGateway: 'API Gateway',
    s3: 'S3',
    cloudFront: 'CloudFront',
    other: 'Other Services'
  };
  return nameMap[name] || name;
}

function getServiceColor(service: string): string {
  const colors: Record<string, string> = {
    lambda: '#FF9F0A',
    dynamoDB: '#BF5AF2',
    apiGateway: '#0A84FF',
    s3: '#32D74B',
    cloudFront: '#64D2FF',
    other: '#8E8E93'
  };
  return colors[service] || '#8E8E93';
}