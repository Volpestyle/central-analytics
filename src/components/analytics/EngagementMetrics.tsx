/**
 * User Engagement Metrics Chart Component
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { darkTheme, getResponsiveOptions } from '@/utils/chartTheme';
import { ChartContainer } from '@components/charts/ChartContainer';
import type { TimeRange, UserEngagement, AggregatedMetrics } from '@/types/analytics';
import { useMetricsStore } from '@/stores/metricsStore';

interface EngagementMetricsProps {
  appId: string;
  timeRange: TimeRange;
  detailed?: boolean;
  metrics?: AggregatedMetrics | null;
}

export const EngagementMetrics: React.FC<EngagementMetricsProps> = React.memo(({ appId, timeRange, detailed = false, metrics: aggregatedMetrics }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [engagement, setEngagement] = useState<UserEngagement[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // Use Zustand store for data fetching
  const {
    chartData: storeChartData,
    isLoading: loadingState,
    errors,
    fetchChartData
  } = useMetricsStore();

  const cacheKey = `${appId}-engagement-${timeRange}`;
  const isLoading = loadingState[cacheKey] || false;
  const error = errors[cacheKey] || apiError;

  // Fetch engagement metrics
  const fetchMetrics = async () => {
    try {
      const response = await fetchChartData(
        cacheKey,
        `/api/apps/${appId}/metrics/appstore/engagement`,
        { timeRange }
      );

      // Check if the API returned an error in metadata
      if (response?.metadata?.error) {
        // Set empty data and store the error message
        setEngagement([]);
        setApiError(response.metadata.error);
      } else {
        setEngagement(response?.data || []);
        setApiError(null);
      }
    } catch (err) {
      // Error is handled by the store
      setEngagement([]);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [appId, timeRange]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!engagement.length) return null;

    // Sort by date
    const sorted = [...engagement].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate averages and trends
    const latestMetrics = sorted[sorted.length - 1];
    const avgActiveDevices = sorted.reduce((sum, e) => sum + e.activeDevices, 0) / sorted.length;
    const avgSessions = sorted.reduce((sum, e) => sum + e.sessions, 0) / sorted.length;
    const avgCrashRate = sorted.reduce((sum, e) => sum + e.crashRate, 0) / sorted.length;

    // Calculate retention curve (if we have retention data)
    const retentionCurve = latestMetrics ? [
      { day: 'Day 0', value: 100 },
      { day: 'Day 1', value: latestMetrics.retentionDay1 || 0 },
      { day: 'Day 7', value: latestMetrics.retentionDay7 || 0 },
      { day: 'Day 30', value: latestMetrics.retentionDay30 || 0 }
    ] : [];

    return {
      sorted,
      latestMetrics,
      avgActiveDevices,
      avgSessions,
      avgCrashRate,
      retentionCurve
    };
  }, [engagement]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || !chartData) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, darkTheme);
    }

    const chart = chartInstance.current;
    const { width } = chartRef.current.getBoundingClientRect();

    if (detailed) {
      // Detailed view with multiple metrics
      const option: echarts.EChartsOption = {
        ...getResponsiveOptions(width),
        title: {
          text: 'User Engagement Analytics',
          textStyle: {
            fontSize: 16,
            fontWeight: 'medium'
          }
        },
        grid: [
          {
            left: '3%',
            right: '3%',
            top: '12%',
            height: '30%',
            containLabel: true
          },
          {
            left: '3%',
            right: '50%',
            top: '50%',
            height: '35%',
            containLabel: true
          },
          {
            left: '52%',
            right: '3%',
            top: '50%',
            height: '35%',
            containLabel: true
          }
        ],
        xAxis: [
          {
            type: 'category',
            data: chartData.sorted.map(e => new Date(e.date).toLocaleDateString()),
            gridIndex: 0,
            axisLabel: {
              rotate: width < 768 ? 45 : 0
            }
          },
          {
            type: 'category',
            data: chartData.sorted.map(e => new Date(e.date).toLocaleDateString()),
            gridIndex: 1,
            axisLabel: {
              show: false
            }
          },
          {
            type: 'category',
            data: chartData.retentionCurve.map(r => r.day),
            gridIndex: 2
          }
        ],
        yAxis: [
          {
            type: 'value',
            name: 'Active Devices',
            gridIndex: 0,
            axisLabel: {
              formatter: (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
            }
          },
          {
            type: 'value',
            name: 'Sessions',
            gridIndex: 1,
            axisLabel: {
              formatter: (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
            }
          },
          {
            type: 'value',
            name: 'Retention %',
            gridIndex: 2,
            max: 100,
            axisLabel: {
              formatter: '{value}%'
            }
          }
        ],
        series: [
          // Active Devices
          {
            name: 'Active Devices',
            type: 'line',
            data: chartData.sorted.map(e => e.activeDevices),
            smooth: true,
            xAxisIndex: 0,
            yAxisIndex: 0,
            showSymbol: false,
            lineStyle: {
              width: 2
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(191, 90, 242, 0.3)' },
                { offset: 1, color: 'rgba(191, 90, 242, 0.05)' }
              ])
            },
            markLine: {
              silent: true,
              data: [{
                type: 'average',
                label: {
                  position: 'end',
                  formatter: 'Avg: {c}'
                }
              }]
            }
          },
          // Sessions
          {
            name: 'Sessions',
            type: 'bar',
            data: chartData.sorted.map(e => e.sessions),
            xAxisIndex: 1,
            yAxisIndex: 1,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#64D2FF' },
                { offset: 1, color: '#0A84FF' }
              ])
            }
          },
          // Session Duration (as line on sessions chart)
          {
            name: 'Avg Session (min)',
            type: 'line',
            data: chartData.sorted.map(e => e.averageSessionDuration / 60),
            xAxisIndex: 1,
            yAxisIndex: 1,
            smooth: true,
            showSymbol: false,
            lineStyle: {
              color: '#FFD60A',
              width: 2,
              type: 'dashed'
            }
          },
          // Retention Funnel
          {
            name: 'User Retention',
            type: 'bar',
            data: chartData.retentionCurve.map(r => r.value),
            xAxisIndex: 2,
            yAxisIndex: 2,
            barWidth: '60%',
            itemStyle: {
              color: (params: { dataIndex: number }) => {
                const colors = ['#32D74B', '#FFD60A', '#FF9F0A', '#FF453A'];
                return colors[params.dataIndex] || colors[colors.length - 1];
              }
            },
            label: {
              show: true,
              position: 'top',
              formatter: '{c}%'
            }
          }
        ],
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: ['Active Devices', 'Sessions', 'Avg Session (min)', 'User Retention'],
          top: 'top'
        }
      };

      chart.setOption(option);
    } else {
      // Simple gauge view for crash rate and key metrics
      const option: echarts.EChartsOption = {
        ...getResponsiveOptions(width),
        title: {
          text: 'Engagement & Stability',
          subtext: `${(chartData.latestMetrics?.activeDevices || 0).toLocaleString()} active devices`,
          textStyle: {
            fontSize: 14,
            fontWeight: 'medium'
          },
          subtextStyle: {
            fontSize: 11
          }
        },
        series: [
          // Crash Rate Gauge
          {
            name: 'Crash Rate',
            type: 'gauge',
            center: ['25%', '55%'],
            radius: '60%',
            min: 0,
            max: 5,
            splitNumber: 5,
            startAngle: 210,
            endAngle: -30,
            axisLine: {
              lineStyle: {
                width: 20,
                color: [
                  [0.2, '#32D74B'],
                  [0.4, '#FFD60A'],
                  [0.6, '#FF9F0A'],
                  [1, '#FF453A']
                ]
              }
            },
            pointer: {
              itemStyle: {
                color: 'auto'
              }
            },
            axisTick: {
              distance: -30,
              length: 8,
              lineStyle: {
                color: '#fff',
                width: 2
              }
            },
            splitLine: {
              distance: -35,
              length: 20,
              lineStyle: {
                color: '#fff',
                width: 3
              }
            },
            axisLabel: {
              color: 'inherit',
              distance: 40,
              fontSize: 10,
              formatter: '{value}%'
            },
            detail: {
              valueAnimation: true,
              formatter: '{value}%',
              color: 'inherit',
              fontSize: 20,
              offsetCenter: [0, '70%']
            },
            title: {
              offsetCenter: [0, '90%'],
              fontSize: 12,
              color: '#999'
            },
            data: [{
              value: chartData.latestMetrics?.crashRate || 0,
              name: 'Crash Rate'
            }]
          },
          // Sessions Radar
          {
            name: 'Engagement Metrics',
            type: 'radar',
            center: ['75%', '55%'],
            radius: '55%',
            indicator: [
              { name: 'Active Users', max: Math.max(chartData.avgActiveDevices * 1.5, 1000) },
              { name: 'Daily Sessions', max: Math.max(chartData.avgSessions * 1.5, 1000) },
              { name: 'Day 1 Retention', max: 100 },
              { name: 'Day 7 Retention', max: 100 },
              { name: 'Day 30 Retention', max: 100 }
            ],
            data: [{
              value: [
                chartData.latestMetrics?.activeDevices || 0,
                chartData.latestMetrics?.sessions || 0,
                chartData.latestMetrics?.retentionDay1 || 0,
                chartData.latestMetrics?.retentionDay7 || 0,
                chartData.latestMetrics?.retentionDay30 || 0
              ],
              name: 'Current',
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
                  { offset: 0, color: 'rgba(191, 90, 242, 0.4)' },
                  { offset: 1, color: 'rgba(191, 90, 242, 0.1)' }
                ])
              },
              lineStyle: {
                color: '#BF5AF2',
                width: 2
              }
            }]
          }
        ],
        tooltip: {
          trigger: 'item'
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
  }, [chartData, detailed]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <ChartContainer title="Engagement Metrics" error={error} onRetry={fetchMetrics}>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title={detailed ? "User Engagement Analytics" : "Engagement"}
      loading={isLoading}
      onRetry={fetchMetrics}
    >
      <div ref={chartRef} className="w-full h-80" />

      {/* Metrics Summary Cards */}
      {chartData && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-light/30 rounded-lg p-3">
            <p className="text-text-secondary text-xs mb-1">Active Devices</p>
            <p className="text-xl font-bold text-text-primary">
              {(chartData.latestMetrics?.activeDevices || 0).toLocaleString()}
            </p>
            <p className="text-xs text-green-400 mt-1">
              ▲ {(((chartData.latestMetrics?.activeDevices || 0) / chartData.avgActiveDevices - 1) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-surface-light/30 rounded-lg p-3">
            <p className="text-text-secondary text-xs mb-1">Daily Sessions</p>
            <p className="text-xl font-bold text-text-primary">
              {(chartData.latestMetrics?.sessions || 0).toLocaleString()}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {((chartData.latestMetrics?.averageSessionDuration || 0) / 60).toFixed(1)} min avg
            </p>
          </div>
          <div className="bg-surface-light/30 rounded-lg p-3">
            <p className="text-text-secondary text-xs mb-1">Crash Rate</p>
            <p className={`text-xl font-bold ${(chartData.latestMetrics?.crashRate || 0) < 1 ? 'text-green-400' : (chartData.latestMetrics?.crashRate || 0) < 2 ? 'text-yellow-400' : 'text-red-400'}`}>
              {(chartData.latestMetrics?.crashRate || 0).toFixed(2)}%
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {(chartData.latestMetrics?.crashRate || 0) < 1 ? 'Excellent' : (chartData.latestMetrics?.crashRate || 0) < 2 ? 'Good' : 'Needs Attention'}
            </p>
          </div>
          <div className="bg-surface-light/30 rounded-lg p-3">
            <p className="text-text-secondary text-xs mb-1">Day 7 Retention</p>
            <p className="text-xl font-bold text-primary">
              {(chartData.latestMetrics?.retentionDay7 || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-text-secondary mt-1">
              D30: {(chartData.latestMetrics?.retentionDay30 || 0).toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Detailed Retention Table */}
      {detailed && chartData && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-text-primary mb-3">Retention Cohort Analysis</h4>
          <div className="bg-surface-light/20 rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="text-text-secondary mb-2">Day 0</p>
                <p className="text-2xl font-bold text-green-400">100%</p>
                <p className="text-xs text-text-secondary mt-1">Install</p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary mb-2">Day 1</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {(chartData.latestMetrics?.retentionDay1 || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-text-secondary mt-1">Next Day</p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary mb-2">Day 7</p>
                <p className="text-2xl font-bold text-orange-400">
                  {(chartData.latestMetrics?.retentionDay7 || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-text-secondary mt-1">Week</p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary mb-2">Day 30</p>
                <p className="text-2xl font-bold text-red-400">
                  {(chartData.latestMetrics?.retentionDay30 || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-text-secondary mt-1">Month</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
});

EngagementMetrics.displayName = 'EngagementMetrics';
