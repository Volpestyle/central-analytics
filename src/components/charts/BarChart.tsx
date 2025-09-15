import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import BaseChart from './BaseChart';
import { getBaseChartOptions, colorPalette } from '../../utils/chartTheme';
import type { SeriesData, ChartConfig } from '../../types/metrics';

interface BarChartProps {
  data: SeriesData[];
  config?: ChartConfig;
  height?: string | number;
  width?: string | number;
  className?: string;
  loading?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  showDataZoom?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  config,
  height = 400,
  width = '100%',
  className = '',
  loading = false,
  horizontal = false,
  stacked = false,
  showDataZoom = false
}) => {
  const option = useMemo<EChartsOption>(() => {
    const baseOptions = getBaseChartOptions();

    // Extract unique x-axis values
    const categoryData = Array.from(
      new Set(data.flatMap(series => series.data.map(point => point.x)))
    );

    const series = data.map((seriesItem, index) => ({
      name: seriesItem.name,
      type: 'bar',
      stack: stacked ? 'total' : undefined,
      barMaxWidth: 40,
      itemStyle: {
        color: seriesItem.color || colorPalette.primary[index % colorPalette.primary.length],
        borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      data: seriesItem.data.map(point => point.y),
      animationDelay: (idx: number) => idx * 10
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
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        }
      } : { show: false },
      xAxis: horizontal ? {
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
      } : {
        type: 'category',
        data: categoryData,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          interval: 0,
          rotate: categoryData.length > 10 ? 45 : 0
        },
        splitLine: {
          show: false
        }
      },
      yAxis: horizontal ? {
        type: 'category',
        data: categoryData,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        splitLine: {
          show: false
        }
      } : {
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
          end: 100,
          orient: horizontal ? 'vertical' : 'horizontal'
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 40,
          orient: horizontal ? 'vertical' : 'horizontal',
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
      animationEasing: 'elasticOut'
    };

    return chartOption;
  }, [data, config, horizontal, stacked, showDataZoom]);

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

export default BarChart;