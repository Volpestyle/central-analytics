import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import BaseChart from './BaseChart';
import { getBaseChartOptions, colorPalette, formatters } from '../../utils/chartTheme';
import type { AppStoreMetrics, UserEngagementMetrics } from '../../types/metrics';

interface AppStoreChartProps {
  data: AppStoreMetrics[] | UserEngagementMetrics[];
  chartType: 'downloads' | 'revenue' | 'engagement' | 'retention' | 'rating';
  height?: string | number;
  width?: string | number;
  className?: string;
  loading?: boolean;
  compareData?: AppStoreMetrics[] | UserEngagementMetrics[];
}

export const AppStoreChart: React.FC<AppStoreChartProps> = ({
  data,
  chartType,
  height = 400,
  width = '100%',
  className = '',
  loading = false,
  compareData
}) => {
  const option = useMemo<EChartsOption>(() => {
    const baseOptions = getBaseChartOptions();

    switch (chartType) {
      case 'downloads': {
        const appData = data as AppStoreMetrics[];
        const dates = appData.map(d => d.date.toISOString().split('T')[0]);

        const series: any[] = [
          {
            name: 'Downloads',
            type: 'bar',
            data: appData.map(d => d.downloads),
            itemStyle: {
              color: colorPalette.gradient.blue,
              borderRadius: [4, 4, 0, 0]
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          },
          {
            name: 'Updates',
            type: 'line',
            data: appData.map(d => d.updates),
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: {
              width: 2,
              color: colorPalette.primary[1]
            },
            itemStyle: {
              color: colorPalette.primary[1]
            }
          }
        ];

        if (compareData) {
          const compareAppData = compareData as AppStoreMetrics[];
          series.push({
            name: 'Previous Period',
            type: 'line',
            data: compareAppData.map(d => d.downloads),
            smooth: true,
            symbol: 'none',
            lineStyle: {
              width: 2,
              type: 'dashed',
              color: 'rgba(255, 255, 255, 0.3)'
            }
          });
        }

        return {
          ...baseOptions,
          title: {
            text: 'App Store Downloads & Updates',
            left: 'left',
            textStyle: {
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 600
            }
          },
          legend: {
            show: true,
            bottom: 0,
            textStyle: {
              color: 'rgba(255, 255, 255, 0.9)'
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
                content += `<div>${item.seriesName}: ${formatters.number(item.value)}</div>`;
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
              formatter: (value: number) => formatters.number(value)
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

      case 'revenue': {
        const appData = data as AppStoreMetrics[];
        const dates = appData.map(d => d.date.toISOString().split('T')[0]);

        return {
          ...baseOptions,
          title: {
            text: 'App Revenue Breakdown',
            left: 'left',
            textStyle: {
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 600
            }
          },
          legend: {
            show: true,
            bottom: 0,
            textStyle: {
              color: 'rgba(255, 255, 255, 0.9)'
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
          series: [
            {
              name: 'Total Revenue',
              type: 'line',
              stack: 'total',
              smooth: true,
              areaStyle: {
                color: colorPalette.gradient.green
              },
              lineStyle: {
                width: 0
              },
              emphasis: {
                focus: 'series'
              },
              data: appData.map(d => d.revenue)
            },
            {
              name: 'In-App Purchases',
              type: 'line',
              stack: 'breakdown',
              smooth: true,
              areaStyle: {
                color: colorPalette.gradient.blue
              },
              lineStyle: {
                width: 0
              },
              emphasis: {
                focus: 'series'
              },
              data: appData.map(d => d.inAppPurchases)
            },
            {
              name: 'Subscriptions',
              type: 'line',
              stack: 'breakdown',
              smooth: true,
              areaStyle: {
                color: colorPalette.gradient.purple
              },
              lineStyle: {
                width: 0
              },
              emphasis: {
                focus: 'series'
              },
              data: appData.map(d => d.subscriptions)
            }
          ]
        };
      }

      case 'engagement': {
        const engagementData = data as UserEngagementMetrics[];
        const dates = engagementData.map(d => d.date.toISOString().split('T')[0]);

        return {
          ...baseOptions,
          title: {
            text: 'User Engagement Metrics',
            left: 'left',
            textStyle: {
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 600
            }
          },
          legend: {
            show: true,
            bottom: 0,
            textStyle: {
              color: 'rgba(255, 255, 255, 0.9)'
            }
          },
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            textStyle: {
              color: '#FFFFFF'
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
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          yAxis: [
            {
              type: 'value',
              name: 'Users',
              position: 'left',
              axisLine: {
                lineStyle: {
                  color: 'rgba(255, 255, 255, 0.1)'
                }
              },
              axisLabel: {
                color: 'rgba(255, 255, 255, 0.7)',
                formatter: (value: number) => formatters.number(value)
              },
              splitLine: {
                lineStyle: {
                  color: 'rgba(255, 255, 255, 0.05)'
                }
              }
            },
            {
              type: 'value',
              name: 'Duration (min)',
              position: 'right',
              axisLine: {
                lineStyle: {
                  color: 'rgba(255, 255, 255, 0.1)'
                }
              },
              axisLabel: {
                color: 'rgba(255, 255, 255, 0.7)',
                formatter: (value: number) => `${(value / 60).toFixed(0)}m`
              }
            }
          ],
          series: [
            {
              name: 'Daily Active Users',
              type: 'bar',
              data: engagementData.map(d => d.dailyActiveUsers),
              itemStyle: {
                color: colorPalette.gradient.blue,
                borderRadius: [4, 4, 0, 0]
              }
            },
            {
              name: 'Session Duration',
              type: 'line',
              yAxisIndex: 1,
              smooth: true,
              data: engagementData.map(d => d.sessionDuration),
              lineStyle: {
                width: 2,
                color: colorPalette.primary[2]
              },
              itemStyle: {
                color: colorPalette.primary[2]
              }
            }
          ]
        };
      }

      case 'retention': {
        const engagementData = data as UserEngagementMetrics[];
        const dates = engagementData.map(d => d.date.toISOString().split('T')[0]);

        return {
          ...baseOptions,
          title: {
            text: 'User Retention & Churn',
            left: 'left',
            textStyle: {
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 600
            }
          },
          legend: {
            show: true,
            bottom: 0,
            textStyle: {
              color: 'rgba(255, 255, 255, 0.9)'
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
                content += `<div>${item.seriesName}: ${item.value.toFixed(1)}%</div>`;
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
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          yAxis: {
            type: 'value',
            name: 'Percentage (%)',
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)',
              formatter: '{value}%'
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.05)'
              }
            }
          },
          series: [
            {
              name: 'Retention Rate',
              type: 'line',
              smooth: true,
              data: engagementData.map(d => d.retentionRate),
              areaStyle: {
                color: colorPalette.gradient.green
              },
              lineStyle: {
                width: 2,
                color: colorPalette.primary[1]
              },
              itemStyle: {
                color: colorPalette.primary[1]
              }
            },
            {
              name: 'Churn Rate',
              type: 'line',
              smooth: true,
              data: engagementData.map(d => d.churnRate),
              lineStyle: {
                width: 2,
                color: colorPalette.primary[3]
              },
              itemStyle: {
                color: colorPalette.primary[3]
              }
            }
          ]
        };
      }

      case 'rating': {
        const appData = data as AppStoreMetrics[];

        // Create rating distribution
        const ratingDistribution = {
          '5 Stars': 0,
          '4 Stars': 0,
          '3 Stars': 0,
          '2 Stars': 0,
          '1 Star': 0
        };

        // Simulate rating distribution based on average rating
        appData.forEach(d => {
          const totalReviews = d.reviews;
          const avgRating = d.rating;

          // Simple distribution based on average
          if (avgRating >= 4.5) {
            ratingDistribution['5 Stars'] += totalReviews * 0.7;
            ratingDistribution['4 Stars'] += totalReviews * 0.2;
            ratingDistribution['3 Stars'] += totalReviews * 0.05;
            ratingDistribution['2 Stars'] += totalReviews * 0.03;
            ratingDistribution['1 Star'] += totalReviews * 0.02;
          } else if (avgRating >= 4) {
            ratingDistribution['5 Stars'] += totalReviews * 0.4;
            ratingDistribution['4 Stars'] += totalReviews * 0.4;
            ratingDistribution['3 Stars'] += totalReviews * 0.1;
            ratingDistribution['2 Stars'] += totalReviews * 0.07;
            ratingDistribution['1 Star'] += totalReviews * 0.03;
          } else {
            ratingDistribution['5 Stars'] += totalReviews * 0.2;
            ratingDistribution['4 Stars'] += totalReviews * 0.3;
            ratingDistribution['3 Stars'] += totalReviews * 0.3;
            ratingDistribution['2 Stars'] += totalReviews * 0.15;
            ratingDistribution['1 Star'] += totalReviews * 0.05;
          }
        });

        return {
          ...baseOptions,
          title: {
            text: 'App Store Ratings Distribution',
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
              const total = Object.values(ratingDistribution).reduce((a: number, b: number) => a + b, 0);
              const percent = ((params[0].value / total) * 100).toFixed(1);
              return `${params[0].name}<br/>Reviews: ${Math.round(params[0].value)}<br/>Percentage: ${percent}%`;
            }
          },
          xAxis: {
            type: 'category',
            data: Object.keys(ratingDistribution),
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
              formatter: (value: number) => formatters.number(value)
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.05)'
              }
            }
          },
          series: [{
            type: 'bar',
            data: Object.values(ratingDistribution).map((value, index) => ({
              value,
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: index === 0 ? colorPalette.primary[1] : index === 4 ? colorPalette.primary[3] : colorPalette.primary[2] },
                    { offset: 1, color: `${index === 0 ? colorPalette.primary[1] : index === 4 ? colorPalette.primary[3] : colorPalette.primary[2]}80` }
                  ]
                },
                borderRadius: [4, 4, 0, 0]
              }
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        };
      }

      default:
        return baseOptions;
    }
  }, [data, chartType, compareData]);

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

export default AppStoreChart;