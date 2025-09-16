/**
 * AWS Cost Analytics Chart Component
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { darkTheme, getResponsiveOptions } from '@/utils/chartTheme';
import { ChartContainer } from '@components/charts/ChartContainer';
import type { TimeRange, DailyCostData, AWSCostBreakdown, CostProjection, AggregatedMetrics } from '@/types/analytics';
import { fetchMetrics } from '@lib/api-client';

interface CostAnalyticsChartProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

export const CostAnalyticsChart: React.FC<CostAnalyticsChartProps> = React.memo(({ appId, timeRange, detailed = false, metrics: aggregatedMetrics }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyCosts, setDailyCosts] = useState<DailyCostData[]>([]);
  const [breakdown, setBreakdown] = useState<AWSCostBreakdown[]>([]);
  const [projection, setProjection] = useState<CostProjection | null>(null);

  // Fetch cost analytics
  const fetchCosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchMetrics(`/api/apps/${appId}/metrics/costs`, { timeRange });

      if (!response.data || (!response.data.dailyCosts?.length && !response.data.breakdown?.length)) {
        throw new Error('AWS cost analytics not configured or no data available');
      }

      setDailyCosts(response.data.dailyCosts || []);
      setBreakdown(response.data.breakdown || []);
      setProjection(response.data.projection || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [appId, timeRange]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!dailyCosts.length && !breakdown.length) return null;

    // Sort daily costs by date
    const sortedCosts = [...dailyCosts].sort((a, b) =>
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
      breakdown: breakdown.sort((a, b) => b.cost - a.cost)
    };
  }, [dailyCosts, breakdown]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || !chartData) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, darkTheme);
    }

    const chart = chartInstance.current;
    const { width } = chartRef.current.getBoundingClientRect();

    if (detailed) {
      // Detailed view with stacked area chart
      const dates = chartData.sortedCosts.map(d => new Date(d.date).toLocaleDateString());
      const services = ['lambda', 'dynamoDB', 'apiGateway', 's3', 'cloudFront', 'other'] as const;

      const option: echarts.EChartsOption = {
        ...getResponsiveOptions(width),
        title: {
          text: 'AWS Service Costs Over Time',
          subtext: projection ? `Projected Month End: $${projection.projectedMonthEnd.toFixed(2)}` : undefined,
          textStyle: {
            fontSize: 16,
            fontWeight: 'medium'
          }
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: {
            rotate: width < 768 ? 45 : 0,
            interval: width < 768 ? 'auto' : 0
          }
        },
        yAxis: {
          type: 'value',
          name: 'Cost (USD)',
          axisLabel: {
            formatter: '${value}'
          }
        },
        series: services.map(service => ({
          name: service.charAt(0).toUpperCase() + service.slice(1).replace(/([A-Z])/g, ' $1'),
          type: 'line' as const,
          stack: 'total',
          areaStyle: {},
          smooth: true,
          data: chartData.sortedCosts.map(d => d.breakdown[service]),
          emphasis: {
            focus: 'series' as const
          }
        })),
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          formatter: (params: echarts.CallbackDataParams[]) => {
            const date = params[0]?.axisValue;
            const total = params.reduce((sum, p) => sum + (p.value as number || 0), 0);

            let html = `<div style="font-weight: bold;">${date}</div>`;
            html += `<div style="margin-bottom: 4px;">Total: $${total.toFixed(2)}</div>`;

            params.forEach(p => {
              const value = p.value as number;
              if (value > 0) {
                html += `<div>${p.marker} ${p.seriesName}: $${value.toFixed(2)}</div>`;
              }
            });

            return html;
          }
        },
        legend: {
          data: services.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/([A-Z])/g, ' $1')),
          top: 'top'
        },
        dataZoom: width > 768 ? [
          {
            type: 'inside',
            start: 0,
            end: 100
          },
          {
            type: 'slider',
            start: 0,
            end: 100,
            height: 20,
            bottom: 5
          }
        ] : undefined
      };

      chart.setOption(option);
    } else {
      // Simple view with pie chart and trend line
      const option: echarts.EChartsOption = {
        ...getResponsiveOptions(width),
        title: {
          text: 'Cost Breakdown',
          subtext: `Total: $${chartData.totalCost.toFixed(2)} | Trend: ${chartData.trend > 0 ? '+' : ''}${chartData.trend.toFixed(1)}%`,
          textStyle: {
            fontSize: 14,
            fontWeight: 'medium'
          },
          subtextStyle: {
            fontSize: 11
          }
        },
        series: [
          {
            name: 'Service Costs',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '55%'],
            data: chartData.breakdown.map(item => ({
              name: item.service.charAt(0).toUpperCase() + item.service.slice(1),
              value: item.cost,
              itemStyle: {
                borderRadius: 5,
                borderColor: '#000',
                borderWidth: 2
              }
            })),
            label: {
              formatter: (params: { name: string; value: number; percent: number }) => {
                return `${params.name}\n$${params.value.toFixed(2)}\n${params.percent}%`;
              },
              fontSize: 10
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              },
              label: {
                fontSize: 12,
                fontWeight: 'bold'
              }
            }
          }
        ],
        tooltip: {
          trigger: 'item',
          formatter: (params: echarts.CallbackDataParams) => {
            const data = params.data as { name: string; value: number };
            const item = chartData.breakdown.find(b =>
              b.service.charAt(0).toUpperCase() + b.service.slice(1) === data.name
            );

            return `
              <div style="font-weight: bold;">${data.name}</div>
              <div>Cost: $${data.value.toFixed(2)}</div>
              <div>Percentage: ${item?.percentage.toFixed(1)}%</div>
              ${item?.trend ? `<div>Trend: ${item.trend > 0 ? '+' : ''}${item.trend.toFixed(1)}%</div>` : ''}
            `;
          }
        }
      };

      chart.setOption(option);
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [chartData, detailed, projection]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // Early return pattern removed - error will be passed to ChartContainer

  return (
    <ChartContainer
      title={detailed ? "AWS Cost Analytics" : "Cost Analytics"}
      loading={isLoading}
      error={error}
    >
      {!error && (dailyCosts.length > 0 || breakdown.length > 0) && (
        <div ref={chartRef} className="w-full h-80" />
      )}

      {/* Cost Projection Card */}
      {!error && projection && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-light/30 rounded-lg p-4">
            <p className="text-text-secondary text-xs mb-1">Month to Date</p>
            <p className="text-2xl font-bold text-text-primary">${projection.currentMonthToDate.toFixed(2)}</p>
            <p className={`text-xs mt-1 ${projection.percentageChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {projection.percentageChange > 0 ? '▲' : '▼'} {Math.abs(projection.percentageChange).toFixed(1)}% vs last month
            </p>
          </div>
          <div className="bg-surface-light/30 rounded-lg p-4">
            <p className="text-text-secondary text-xs mb-1">Projected Month End</p>
            <p className="text-2xl font-bold text-yellow-400">${projection.projectedMonthEnd.toFixed(2)}</p>
            <p className="text-xs text-text-secondary mt-1">Based on current usage</p>
          </div>
          <div className="bg-surface-light/30 rounded-lg p-4">
            <p className="text-text-secondary text-xs mb-1">Last Month Total</p>
            <p className="text-2xl font-bold text-text-primary">${projection.lastMonthTotal.toFixed(2)}</p>
            <p className="text-xs text-text-secondary mt-1">Complete month</p>
          </div>
        </div>
      )}

      {/* Service Breakdown Table for Detailed View */}
      {detailed && !error && chartData && chartData.breakdown.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-light">
                <th className="text-left py-2 px-3 font-medium text-text-secondary">Service</th>
                <th className="text-right py-2 px-3 font-medium text-text-secondary">Cost</th>
                <th className="text-right py-2 px-3 font-medium text-text-secondary">Percentage</th>
                <th className="text-right py-2 px-3 font-medium text-text-secondary">Trend</th>
              </tr>
            </thead>
            <tbody>
              {chartData.breakdown.map((item, index) => (
                <tr key={index} className="border-b border-surface-light/50 hover:bg-surface-light/30 transition-colors">
                  <td className="py-2 px-3 text-text-primary capitalize">
                    {item.service.replace(/([A-Z])/g, ' $1').trim()}
                  </td>
                  <td className="text-right py-2 px-3 text-text-primary font-medium">
                    ${item.cost.toFixed(2)}
                  </td>
                  <td className="text-right py-2 px-3 text-text-primary">
                    {item.percentage.toFixed(1)}%
                  </td>
                  <td className="text-right py-2 px-3">
                    <span className={`font-medium ${item.trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {item.trend > 0 ? '▲' : '▼'} {Math.abs(item.trend).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-surface-light">
                <td className="py-2 px-3 font-bold text-text-primary">Total</td>
                <td className="text-right py-2 px-3 font-bold text-text-primary">
                  ${chartData.totalCost.toFixed(2)}
                </td>
                <td className="text-right py-2 px-3 font-bold text-text-primary">100%</td>
                <td className="text-right py-2 px-3">
                  <span className={`font-bold ${chartData.trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {chartData.trend > 0 ? '▲' : '▼'} {Math.abs(chartData.trend).toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ChartContainer>
  );
});

CostAnalyticsChart.displayName = 'CostAnalyticsChart';
