/**
 * AWS Cost Analytics Chart Component
 * Rebuilt with proper data handling and dark theme styling
 */

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { ChartContainer } from '@components/charts/ChartContainer';
import type {
  TimeRange,
  DailyCostData,
  AWSCostBreakdown,
  CostProjection,
  AggregatedMetrics
} from '@/types/analytics';
import { useChartData } from '@/hooks/useChartData';
import {
  formatNumber,
  formatCurrency,
  formatPercentage,
  createLineChartOptions,
  createEmptyStateOptions,
  isEmptyData,
  formatTimestamps
} from '@/utils/chartUtils';
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
    transformData: (response: any) => {
      if (!response) {
        return { dailyCosts: [], breakdown: [], projection: null };
      }

      // Handle actual API response structure
      let dailyCosts: DailyCostData[] = [];

      if (response.data && Array.isArray(response.data)) {
        dailyCosts = response.data.map((item: any) => ({
          date: item.timestamp || item.date,
          totalCost: item.value || item.totalCost || 0,
          services: item.services || {}
        }));
      }

      // Extract breakdown - could be in metadata or separate field
      let breakdown: AWSCostBreakdown[] = [];
      if (response.metadata?.services) {
        breakdown = response.metadata.services;
      } else if (response.breakdown) {
        breakdown = response.breakdown;
      } else if (aggregatedMetrics?.aws?.cost?.breakdown) {
        breakdown = aggregatedMetrics.aws.cost.breakdown;
      }

      // Extract projection data
      const projection: CostProjection | null = response.metadata?.projectedMonthly ? {
        currentMonthEstimate: response.metadata.totalCost || 0,
        nextMonthEstimate: response.metadata.projectedMonthly || 0,
        confidence: response.metadata.confidence || 0.8
      } : null;

      return {
        dailyCosts,
        breakdown,
        projection
      };
    }
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
    if (!chartData || isEmptyData(chartData.sortedCosts)) {
      return createEmptyStateOptions("No cost data available for this time period");
    }

    if (detailed) {
      return createDetailedCostOptions(chartData, window.innerWidth);
    } else {
      return createSimpleCostOptions(chartData, window.innerWidth);
    }
  }, [chartData, detailed]);

  // Create breakdown chart options
  const breakdownOptions = useMemo<EChartsOption>(() => {
    if (!chartData?.breakdown?.length) {
      return createEmptyStateOptions("No service breakdown data available");
    }
    return createBreakdownOptions(chartData.breakdown, window.innerWidth);
  }, [chartData]);

  return (
    <>
      <ChartContainer
        title={detailed ? "AWS Cost Analytics - Detailed" : "AWS Costs"}
        subtitle={chartData ? `Total: ${formatCurrency(chartData.totalCost)} | Trend: ${chartData.trend >= 0 ? '+' : ''}${chartData.trend.toFixed(1)}%` : undefined}
        loading={isLoading}
        error={error}
        onRetry={refetch}
      >
        {!isEmptyData(chartData?.sortedCosts) && (
          <ReactECharts
            option={chartOptions}
            style={{ height: '300px' }}
            theme="dark"
            notMerge={true}
            lazyUpdate={true}
          />
        )}

      {/* Cost Breakdown Chart */}
      {detailed && chartData?.breakdown && chartData.breakdown.length > 0 && (
        <ChartContainer
          title="Service Breakdown"
          loading={isLoading}
          error={error}
          className="mt-6"
        >
          <ReactECharts
            option={breakdownOptions}
            style={{ height: '250px' }}
            theme="dark"
            notMerge={true}
            lazyUpdate={true}
          />
        </ChartContainer>
      )}

      {/* Cost Projection */}
      {detailed && chartData?.projection && (
        <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.05)] p-6 rounded-xl mt-6">
          <h4 className="text-lg font-semibold text-white mb-4">Monthly Projection</h4>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <span className="text-[rgba(255,255,255,0.5)] text-xs uppercase tracking-wider">Current Month</span>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(chartData.projection.currentMonthEstimate)}
              </p>
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.5)] text-xs uppercase tracking-wider">Projected</span>
              <p className="text-2xl font-bold text-[#FFD60A] mt-1">
                {formatCurrency(chartData.projection.nextMonthEstimate)}
              </p>
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.5)] text-xs uppercase tracking-wider">Confidence</span>
              <p className="text-2xl font-bold text-[#0A84FF] mt-1">
                {(chartData.projection.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Cost Services Table */}
      {detailed && chartData?.breakdown && chartData.breakdown.length > 0 && (
        <ChartContainer
          title="Top Cost Services"
          loading={isLoading}
          error={error}
          className="mt-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left py-3 font-medium text-[rgba(255,255,255,0.5)] text-xs">Service</th>
                  <th className="text-right py-3 font-medium text-[rgba(255,255,255,0.5)] text-xs">Cost</th>
                  <th className="text-right py-3 font-medium text-[rgba(255,255,255,0.5)] text-xs">% of Total</th>
                  <th className="text-right py-3 font-medium text-[rgba(255,255,255,0.5)] text-xs">Change</th>
                      </tr>
              </thead>
              <tbody>
                {chartData.breakdown.slice(0, 5).map((service) => (
                  <tr key={service.serviceName} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="py-3 text-white font-medium text-xs">
                      {formatServiceName(service.serviceName)}
                    </td>
                    <td className="text-right py-3 text-[#FFD60A] font-mono text-xs">
                      {formatCurrency(service.cost)}
                    </td>
                    <td className="text-right py-3 text-[rgba(255,255,255,0.7)] font-mono text-xs">
                      {((service.cost / chartData.totalCost) * 100).toFixed(1)}%
                    </td>
                    <td className="text-right py-3">
                      {service.change !== undefined ? (
                        <span className={`font-mono text-xs ${service.change >= 0 ? 'text-[#FF453A]' : 'text-[#32D74B]'}`}>
                          {service.change >= 0 ? '+' : ''}{service.change.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[rgba(255,255,255,0.3)] text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      )}
      </ChartContainer>
    </>
  );
});

CostAnalyticsChart.displayName = 'CostAnalyticsChart';

// Helper functions
function createDetailedCostOptions(chartData: any, width: number): EChartsOption {
  const dates = formatTimestamps(chartData.sortedCosts);
  const services = ['lambda', 'dynamoDB', 'apiGateway', 's3', 'cloudFront', 'other'] as const;

  return {
    ...darkTheme,
    ...getResponsiveOptions(width),
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      },
      formatter: (params: any) => {
        const date = params[0].axisValue;
        let html = `<div style="font-size: 12px; line-height: 1.5;">`;
        html += `<div style="color: rgba(255,255,255,0.5); margin-bottom: 8px; font-weight: 500;">${date}</div>`;
        let total = 0;
        params.forEach((param: any) => {
          html += `<div style="display: flex; align-items: center; gap: 8px;">`;
          html += `${param.marker} <span style="color: rgba(255,255,255,0.7);">${param.seriesName}:</span>`;
          html += `<span style="color: #FFD60A; margin-left: auto;">${formatCurrency(param.value)}</span></div>`;
          total += param.value;
        });
        html += `<div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 8px; padding-top: 8px;">`;
        html += `<strong style="color: #fff;">Total: ${formatCurrency(total)}</strong></div></div>`;
        return html;
      }
    },
    legend: {
      data: services.map(formatServiceName),
      textStyle: { color: 'rgba(255, 255, 255, 0.7)' },
      icon: 'roundRect',
      bottom: 0
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        rotate: dates.length > 15 ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      name: 'Cost ($)',
      nameTextStyle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        formatter: (value: number) => formatCurrency(value)
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
          type: 'dashed'
        }
      }
    },
    series: services.map((service, index) => ({
      name: formatServiceName(service),
      type: 'line',
      stack: 'total',
      areaStyle: {
        opacity: 0.1
      },
      emphasis: { focus: 'series' },
      data: chartData.sortedCosts.map((day: any) => day.services?.[service] || 0),
      smooth: true,
      lineStyle: {
        width: 2
      },
      itemStyle: {
        color: getServiceColor(service)
      }
    }))
  };
}

function createSimpleCostOptions(chartData: any, width: number): EChartsOption {
  const dates = formatTimestamps(chartData.sortedCosts);
  const costs = chartData.sortedCosts.map((d: DailyCostData) => d.totalCost);

  return createLineChartOptions({
    data: costs,
    timestamps: dates,
    smooth: true,
    colors: ['#FFD60A'],
    width,
    yAxisLabel: 'Cost ($)',
    showArea: true,
    showAnimation: true
  });
}

function createBreakdownOptions(breakdown: AWSCostBreakdown[], width: number): EChartsOption {
  return {
    ...darkTheme,
    ...getResponsiveOptions(width),
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `
          <div style="font-size: 12px; line-height: 1.5;">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${params.marker}
              <span style="color: #fff;">${params.name}: <strong style="color: #FFD60A;">${formatCurrency(params.value)}</strong> (${params.percent}%)</span>
            </div>
          </div>
        `;
      }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#000000',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: '14',
          fontWeight: 'bold',
          color: '#FFFFFF',
          formatter: (params: any) => `${params.name}\n${formatCurrency(params.value)}`
        },
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      labelLine: { show: false },
      data: breakdown.slice(0, 5).map(service => ({
        value: service.cost,
        name: formatServiceName(service.serviceName),
        itemStyle: { color: getServiceColor(service.serviceName) }
      })),
      animationType: 'scale',
      animationEasing: 'elasticOut',
      animationDuration: 1000
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