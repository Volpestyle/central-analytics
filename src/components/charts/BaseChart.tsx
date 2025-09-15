import React, { useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';
import { darkTheme } from '../../utils/chartTheme';

interface BaseChartProps {
  option: EChartsOption;
  height?: string | number;
  width?: string | number;
  className?: string;
  loading?: boolean;
  onChartReady?: (chart: ECharts) => void;
  onClick?: (params: any) => void;
  theme?: 'dark' | 'light';
}

export const BaseChart: React.FC<BaseChartProps> = ({
  option,
  height = 400,
  width = '100%',
  className = '',
  loading = false,
  onChartReady,
  onClick,
  theme = 'dark'
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return;

    // Register dark theme
    echarts.registerTheme('dark', darkTheme);

    // Initialize chart instance
    chartInstance.current = echarts.init(chartRef.current, theme, {
      renderer: 'canvas',
      useDirtyRect: true
    });

    // Set up event handlers
    if (onClick) {
      chartInstance.current.on('click', onClick);
    }

    // Notify parent component
    if (onChartReady) {
      onChartReady(chartInstance.current);
    }

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    // Observe container size changes
    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chartInstance.current?.dispose();
    };
  }, [theme, onClick, onChartReady]);

  // Update chart options
  useEffect(() => {
    if (!chartInstance.current) return;

    chartInstance.current.setOption(option, {
      notMerge: false,
      lazyUpdate: true,
      silent: false
    });
  }, [option]);

  // Handle loading state
  useEffect(() => {
    if (!chartInstance.current) return;

    if (loading) {
      chartInstance.current.showLoading('default', {
        text: 'Loading...',
        color: '#0A84FF',
        textColor: 'rgba(255, 255, 255, 0.9)',
        maskColor: 'rgba(0, 0, 0, 0.4)',
        zlevel: 0
      });
    } else {
      chartInstance.current.hideLoading();
    }
  }, [loading]);

  const containerStyle = useMemo(() => ({
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    minHeight: '200px'
  }), [height, width]);

  return (
    <div
      ref={chartRef}
      className={`chart-container ${className}`}
      style={containerStyle}
    />
  );
};

export default BaseChart;