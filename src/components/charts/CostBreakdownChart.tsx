import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import BaseChart from './BaseChart';
import { getBaseChartOptions, colorPalette, formatters } from '../../utils/chartTheme';
import type { CostMetrics } from '../../types/metrics';

interface CostBreakdownChartProps {
  data: CostMetrics[];
  viewType: 'daily' | 'service' | 'treemap' | 'stacked';
  height?: string | number;
  width?: string | number;
  className?: string;
  loading?: boolean;
  showProjection?: boolean;
}

export const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({
  data,
  viewType,
  height = 400,
  width = '100%',
  className = '',
  loading = false,
  showProjection = false
}) => {
  const option = useMemo<EChartsOption>(() => {
    const baseOptions = getBaseChartOptions();

    switch (viewType) {
      case 'daily': {
        // Group by date
        const dailyData = data.reduce((acc, item) => {
          const dateKey = item.date.toISOString().split('T')[0];
          if (!acc[dateKey]) {
            acc[dateKey] = 0;
          }
          acc[dateKey] += item.cost;
          return acc;
        }, {} as Record<string, number>);

        const dates = Object.keys(dailyData).sort();
        const costs = dates.map(date => dailyData[date]);

        const series: any[] = [{
          name: 'Daily Cost',
          type: 'bar',
          data: costs,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: colorPalette.primary[0] },
                { offset: 1, color: `${colorPalette.primary[0]}80` }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }];

        // Add projection if requested
        if (showProjection && costs.length > 7) {
          const recentCosts = costs.slice(-7);
          const avgDailyCost = recentCosts.reduce((a, b) => a + b, 0) / recentCosts.length;
          const projectionDays = 30;
          const projectionData = Array(projectionDays).fill(avgDailyCost);

          series.push({
            name: 'Projection',
            type: 'line',
            data: [...Array(costs.length).fill(null), ...projectionData],
            lineStyle: {
              type: 'dashed',
              color: colorPalette.primary[2],
              width: 2
            },
            symbol: 'none',
            smooth: true
          });
        }

        return {
          ...baseOptions,
          title: {
            text: 'Daily AWS Costs',
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
              let content = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`;
              params.forEach((item: any) => {
                if (item.value !== null) {
                  content += `<div>${item.seriesName}: ${formatters.currency(item.value)}</div>`;
                }
              });
              return content;
            }
          },
          xAxis: {
            type: 'category',
            data: dates,
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)',
              rotate: 45
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
              formatter: (value: number) => formatters.currency(value)
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.05)'
              }
            }
          },
          series
        };
      }

      case 'service': {
        // Group by service
        const serviceData = data.reduce((acc, item) => {
          if (!acc[item.service]) {
            acc[item.service] = 0;
          }
          acc[item.service] += item.cost;
          return acc;
        }, {} as Record<string, number>);

        const sortedServices = Object.entries(serviceData)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10); // Top 10 services

        return {
          ...baseOptions,
          title: {
            text: 'Cost by Service',
            left: 'center',
            top: 'center',
            textStyle: {
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 600
            }
          },
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            textStyle: {
              color: '#FFFFFF'
            },
            formatter: (params: any) => {
              const total = sortedServices.reduce((sum, [, cost]) => sum + cost, 0);
              const percent = ((params.value / total) * 100).toFixed(1);
              return `${params.name}<br/>${formatters.currency(params.value)} (${percent}%)`;
            }
          },
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            data: sortedServices.map(([service, cost], index) => ({
              name: service,
              value: cost,
              itemStyle: {
                color: colorPalette.primary[index % colorPalette.primary.length],
                borderRadius: 8,
                borderColor: '#000000',
                borderWidth: 2
              }
            })),
            label: {
              show: true,
              position: 'outside',
              formatter: '{b}\n{d}%',
              color: 'rgba(255, 255, 255, 0.9)'
            },
            labelLine: {
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
              scaleSize: 5
            }
          }]
        };
      }

      case 'treemap': {
        // Group by service for treemap
        const serviceData = data.reduce((acc, item) => {
          if (!acc[item.service]) {
            acc[item.service] = 0;
          }
          acc[item.service] += item.cost;
          return acc;
        }, {} as Record<string, number>);

        const treeData = Object.entries(serviceData).map(([service, cost], index) => ({
          name: service,
          value: cost,
          itemStyle: {
            color: colorPalette.primary[index % colorPalette.primary.length]
          }
        }));

        return {
          ...baseOptions,
          title: {
            text: 'Cost Distribution',
            left: 'left',
            textStyle: {
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 600
            }
          },
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            textStyle: {
              color: '#FFFFFF'
            },
            formatter: (params: any) => {
              return `${params.name}<br/>${formatters.currency(params.value)}`;
            }
          },
          series: [{
            type: 'treemap',
            data: treeData,
            leafDepth: 1,
            roam: false,
            itemStyle: {
              borderColor: '#000000',
              borderWidth: 2,
              gapWidth: 2
            },
            label: {
              show: true,
              position: 'insideTopLeft',
              formatter: (params: any) => {
                const total = treeData.reduce((sum, item) => sum + item.value, 0);
                const percent = ((params.value / total) * 100).toFixed(1);
                return `${params.name}\n${formatters.currency(params.value)}\n${percent}%`;
              },
              color: '#FFFFFF',
              fontSize: 12
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            breadcrumb: {
              show: false
            }
          }]
        };
      }

      case 'stacked': {
        // Group by date and service for stacked area chart
        const dateServiceData: Record<string, Record<string, number>> = {};
        const services = new Set<string>();

        data.forEach(item => {
          const dateKey = item.date.toISOString().split('T')[0];
          if (!dateServiceData[dateKey]) {
            dateServiceData[dateKey] = {};
          }
          dateServiceData[dateKey][item.service] =
            (dateServiceData[dateKey][item.service] || 0) + item.cost;
          services.add(item.service);
        });

        const dates = Object.keys(dateServiceData).sort();
        const serviceList = Array.from(services);

        return {
          ...baseOptions,
          title: {
            text: 'Cost Trend by Service',
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
              let content = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`;
              let total = 0;
              params.forEach((item: any) => {
                content += `<div>${item.seriesName}: ${formatters.currency(item.value)}</div>`;
                total += item.value;
              });
              content += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">Total: ${formatters.currency(total)}</div>`;
              return content;
            }
          },
          legend: {
            show: true,
            bottom: 0,
            textStyle: {
              color: 'rgba(255, 255, 255, 0.9)'
            }
          },
          xAxis: {
            type: 'category',
            data: dates,
            boundaryGap: false,
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)'
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
              formatter: (value: number) => formatters.currency(value)
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.05)'
              }
            }
          },
          series: serviceList.map((service, index) => ({
            name: service,
            type: 'line',
            stack: 'total',
            smooth: true,
            symbol: 'none',
            areaStyle: {
              color: colorPalette.primary[index % colorPalette.primary.length]
            },
            lineStyle: {
              width: 0
            },
            emphasis: {
              focus: 'series'
            },
            data: dates.map(date => dateServiceData[date][service] || 0)
          }))
        };
      }

      default:
        return baseOptions;
    }
  }, [data, viewType, showProjection]);

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

export default CostBreakdownChart;