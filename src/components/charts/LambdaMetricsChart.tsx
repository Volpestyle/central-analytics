import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import BaseChart from './BaseChart';
import { getBaseChartOptions, colorPalette, formatters } from '../../utils/chartTheme';
import type { LambdaMetrics } from '../../types/metrics';

interface LambdaMetricsChartProps {
  data: LambdaMetrics[];
  metricType: 'invocations' | 'errors' | 'duration' | 'cost' | 'throttles' | 'concurrent';
  height?: string | number;
  width?: string | number;
  className?: string;
  loading?: boolean;
  showTrend?: boolean;
}

export const LambdaMetricsChart: React.FC<LambdaMetricsChartProps> = ({
  data,
  metricType,
  height = 400,
  width = '100%',
  className = '',
  loading = false,
  showTrend = true
}) => {
  const option = useMemo<EChartsOption>(() => {
    const baseOptions = getBaseChartOptions();

    const timestamps = data.map(d => d.timestamp);

    const getMetricData = () => {
      switch (metricType) {
        case 'invocations':
          return {
            title: 'Lambda Invocations',
            data: data.map(d => d.invocations),
            color: colorPalette.primary[0],
            formatter: formatters.number
          };
        case 'errors':
          return {
            title: 'Lambda Errors',
            data: data.map(d => d.errors),
            color: colorPalette.primary[3],
            formatter: formatters.number
          };
        case 'duration':
          return {
            title: 'Lambda Duration',
            data: data.map(d => d.duration),
            color: colorPalette.primary[1],
            formatter: formatters.duration
          };
        case 'cost':
          return {
            title: 'Lambda Cost',
            data: data.map(d => d.cost),
            color: colorPalette.primary[2],
            formatter: formatters.currency
          };
        case 'throttles':
          return {
            title: 'Lambda Throttles',
            data: data.map(d => d.throttles),
            color: colorPalette.primary[5],
            formatter: formatters.number
          };
        case 'concurrent':
          return {
            title: 'Concurrent Executions',
            data: data.map(d => d.concurrentExecutions),
            color: colorPalette.primary[4],
            formatter: formatters.number
          };
      }
    };

    const metric = getMetricData();

    const chartOption: EChartsOption = {
      ...baseOptions,
      title: {
        text: metric.title,
        left: 'left',
        textStyle: {
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: 600
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        textStyle: {
          color: '#FFFFFF'
        },
        formatter: (params: any) => {
          const date = new Date(params[0].axisValue);
          const dateStr = date.toLocaleString();
          let content = `<div style="font-weight: 600; margin-bottom: 8px;">${dateStr}</div>`;

          params.forEach((item: any) => {
            const value = metric.formatter(item.value);
            content += `<div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${item.color}; border-radius: 50%;"></span>
              <span>${item.seriesName}: ${value}</span>
            </div>`;
          });

          return content;
        }
      },
      xAxis: {
        type: 'category',
        data: timestamps.map(t => t.toISOString()),
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          formatter: (value: string) => {
            const date = new Date(value);
            return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
          }
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          formatter: (value: number) => metric.formatter(value)
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        }
      },
      series: [
        {
          name: metric.title,
          type: 'line',
          data: metric.data,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            width: 2,
            color: metric.color
          },
          itemStyle: {
            color: metric.color
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${metric.color}40` },
                { offset: 1, color: `${metric.color}05` }
              ]
            }
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              borderColor: '#FFFFFF',
              borderWidth: 2
            }
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          fillerColor: 'rgba(10, 132, 255, 0.2)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          handleStyle: {
            color: '#0A84FF'
          },
          textStyle: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      ],
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    };

    // Add trend line if requested
    if (showTrend && metric.data.length > 1) {
      // Simple linear regression for trend
      const n = metric.data.length;
      const sumX = metric.data.reduce((acc, _, i) => acc + i, 0);
      const sumY = metric.data.reduce((acc, val) => acc + val, 0);
      const sumXY = metric.data.reduce((acc, val, i) => acc + i * val, 0);
      const sumX2 = metric.data.reduce((acc, _, i) => acc + i * i, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const trendData = metric.data.map((_, i) => slope * i + intercept);

      (chartOption.series as any[]).push({
        name: 'Trend',
        type: 'line',
        data: trendData,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 1,
          type: 'dashed',
          color: 'rgba(255, 255, 255, 0.3)'
        },
        silent: true,
        animation: false
      });
    }

    return chartOption;
  }, [data, metricType, showTrend]);

  return (
    <BaseChart
      option={option}
      height={height}
      width={width}
      className={className}
      loading={loading}
      theme="dark"
    />
  );
};

export default LambdaMetricsChart;