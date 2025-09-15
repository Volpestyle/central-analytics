import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import BaseChart from './BaseChart';
import { getBaseChartOptions, colorPalette, formatters } from '../../utils/chartTheme';
import type { ChartConfig } from '../../types/metrics';

interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartData[];
  config?: ChartConfig;
  height?: string | number;
  width?: string | number;
  className?: string;
  loading?: boolean;
  donut?: boolean;
  showLabel?: boolean;
  formatter?: 'number' | 'currency' | 'percentage';
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  config,
  height = 400,
  width = '100%',
  className = '',
  loading = false,
  donut = true,
  showLabel = true,
  formatter = 'number'
}) => {
  const option = useMemo<EChartsOption>(() => {
    const baseOptions = getBaseChartOptions();

    const seriesData = data.map((item, index) => ({
      name: item.name,
      value: item.value,
      itemStyle: {
        color: item.color || colorPalette.primary[index % colorPalette.primary.length]
      }
    }));

    const chartOption: EChartsOption = {
      ...baseOptions,
      title: config?.title ? {
        text: config.title,
        subtext: config.subtitle,
        left: 'center',
        top: donut ? 'center' : 20,
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
        trigger: 'item',
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        textStyle: {
          color: '#FFFFFF'
        },
        formatter: (params: any) => {
          const value = formatter === 'currency'
            ? formatters.currency(params.value)
            : formatter === 'percentage'
            ? formatters.percentage(params.value)
            : formatters.number(params.value);

          const percent = ((params.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
          return `${params.name}<br/>${value} (${percent}%)`;
        }
      } : { show: false },
      series: [
        {
          type: 'pie',
          radius: donut ? ['40%', '70%'] : '70%',
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: donut ? 8 : 0,
            borderColor: '#000000',
            borderWidth: 2
          },
          label: {
            show: showLabel,
            position: donut ? 'outside' : 'outer',
            formatter: (params: any) => {
              const percent = params.percent.toFixed(1);
              return `{name|${params.name}}\n{value|${percent}%}`;
            },
            rich: {
              name: {
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: 12,
                lineHeight: 16
              },
              value: {
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 20
              }
            }
          },
          labelLine: {
            show: showLabel,
            length: 15,
            length2: 10,
            smooth: true,
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.3)'
            }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            },
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            },
            scaleSize: 5
          },
          data: seriesData,
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: (idx: number) => idx * 50
        }
      ],
      animationDuration: 1500,
      animationEasing: 'cubicOut'
    };

    return chartOption;
  }, [data, config, donut, showLabel, formatter]);

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

export default PieChart;