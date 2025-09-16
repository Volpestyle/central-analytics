import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  sparklineData?: number[];
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const KPICard: React.FC<KPICardProps> = React.memo(({
  title,
  value,
  change,
  sparklineData = [],
  unit = '',
  icon,
  color = '#0A84FF'
}) => {
  const sparklineOption = useMemo(() => ({
    grid: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    },
    xAxis: {
      type: 'category',
      show: false
    },
    yAxis: {
      type: 'value',
      show: false
    },
    series: [{
      data: sparklineData,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: color,
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0,
            color: color + '40'
          }, {
            offset: 1,
            color: color + '10'
          }]
        }
      }
    }]
  }), [sparklineData, color]);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-gray-400 text-sm">{unit}</span>}
      </div>

      {change !== undefined && (
        <div className={`flex items-center gap-1 mb-3 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <span className="text-sm">
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
          <span className="text-xs text-gray-500">vs last period</span>
        </div>
      )}

      {sparklineData.length > 0 && (
        <div className="h-12">
          <ReactECharts option={sparklineOption} style={{ height: '100%' }} />
        </div>
      )}
    </div>
  );
});