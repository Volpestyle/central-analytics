import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import BaseChart from './BaseChart';
import { getBaseChartOptions, colorPalette } from '../../utils/chartTheme';
import type { SeriesData, ChartConfig } from '../../types/metrics';

interface LineChartProps {
  data: SeriesData[];
  config?: ChartConfig;
  height?: string | number;
  width?: string | number;
  className?: string;
  loading?: boolean;
  showArea?: boolean;
  smooth?: boolean;
  showDataZoom?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  config,
  height = 400,
  width = '100%',
  className = '',
  loading = false,
  showArea = false,
  smooth = true,
  showDataZoom = false
}) => {
  const option = useMemo<EChartsOption>(() => {
    const baseOptions = getBaseChartOptions();

    // Extract unique x-axis values
    const xAxisData = Array.from(
      new Set(data.flatMap(series => series.data.map(point => point.x)))
    );

    const series = data.map((seriesItem, index) => ({
      name: seriesItem.name,
      type: 'line',
      smooth: smooth,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: {
        width: 2,
        color: seriesItem.color || colorPalette.primary[index % colorPalette.primary.length]
      },
      itemStyle: {
        color: seriesItem.color || colorPalette.primary[index % colorPalette.primary.length]
      },
      areaStyle: showArea ? {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: `${seriesItem.color || colorPalette.primary[index % colorPalette.primary.length]}33`
            },
            {
              offset: 1,
              color: `${seriesItem.color || colorPalette.primary[index % colorPalette.primary.length]}05`
            }
          ]
        }
      } : undefined,
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderColor: '#FFFFFF',
          borderWidth: 2
        }
      },
      data: seriesItem.data.map(point => [point.x, point.y])
    }));

    const chartOption: EChartsOption = {
      ...baseOptions,
      title: config?.title ? {
        text: config.title,
        subtext: config.subtitle,
        left: 'left',
        textStyle: {
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: 600
        },
        subtextStyle: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 14
        }
      } : undefined,
      legend: config?.showLegend !== false ? {
        show: true,
        bottom: 0,
        textStyle: {
          color: 'rgba(255, 255, 255, 0.9)'
        }
      } : { show: false },
      tooltip: config?.showTooltip !== false ? {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        textStyle: {
          color: '#FFFFFF'
        },
        axisPointer: {
          type: 'cross',
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.2)'
          }
        }
      } : { show: false },
      xAxis: {
        type: 'category',
        data: xAxisData,
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          formatter: (value: any) => {
            if (value instanceof Date) {
              return value.toLocaleDateString();
            }
            return value;
          }
        },
        splitLine: {
          show: config?.showGrid !== false,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
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
          color: 'rgba(255, 255, 255, 0.7)'
        },
        splitLine: {
          show: config?.showGrid !== false,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        }
      },
      series: series,
      dataZoom: showDataZoom ? [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 40,
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
      ] : undefined,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    };

    return chartOption;
  }, [data, config, showArea, smooth, showDataZoom]);

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

export default LineChart;