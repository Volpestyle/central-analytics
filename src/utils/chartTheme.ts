import type { EChartsOption } from 'echarts';

export const darkTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  },
  title: {
    textStyle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 600
    },
    subtextStyle: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 14
    }
  },
  legend: {
    textStyle: {
      color: 'rgba(255, 255, 255, 0.9)'
    },
    pageTextStyle: {
      color: 'rgba(255, 255, 255, 0.9)'
    }
  },
  tooltip: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    textStyle: {
      color: '#FFFFFF'
    },
    extraCssText: 'backdrop-filter: blur(10px);'
  },
  grid: {
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    },
    axisTick: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    },
    axisLabel: {
      color: 'rgba(255, 255, 255, 0.7)'
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.05)'
      }
    }
  },
  valueAxis: {
    axisLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    },
    axisTick: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    },
    axisLabel: {
      color: 'rgba(255, 255, 255, 0.7)'
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.05)'
      }
    }
  }
};

export const colorPalette = {
  primary: ['#0A84FF', '#32D74B', '#FFD60A', '#FF453A', '#BF5AF2', '#64D2FF', '#FF9F0A', '#5E5CE6'],
  gradient: {
    blue: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: 'rgba(10, 132, 255, 0.8)' },
        { offset: 1, color: 'rgba(10, 132, 255, 0.1)' }
      ]
    },
    green: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: 'rgba(50, 215, 75, 0.8)' },
        { offset: 1, color: 'rgba(50, 215, 75, 0.1)' }
      ]
    },
    red: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: 'rgba(255, 69, 58, 0.8)' },
        { offset: 1, color: 'rgba(255, 69, 58, 0.1)' }
      ]
    },
    purple: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: 'rgba(191, 90, 242, 0.8)' },
        { offset: 1, color: 'rgba(191, 90, 242, 0.1)' }
      ]
    }
  }
};

export const getBaseChartOptions = (overrides: EChartsOption = {}): EChartsOption => ({
  backgroundColor: 'transparent',
  color: colorPalette.primary,
  textStyle: darkTheme.textStyle,
  title: darkTheme.title,
  legend: {
    ...darkTheme.legend,
    bottom: 0,
    type: 'scroll'
  },
  tooltip: {
    ...darkTheme.tooltip,
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.2)'
      },
      crossStyle: {
        color: 'rgba(255, 255, 255, 0.2)'
      }
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '10%',
    top: '15%',
    containLabel: true,
    borderColor: darkTheme.grid.borderColor
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    ...darkTheme.categoryAxis
  },
  yAxis: {
    type: 'value',
    ...darkTheme.valueAxis
  },
  ...overrides
});

export const formatters = {
  number: (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  },
  currency: (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value < 1 ? 2 : 0,
      maximumFractionDigits: 2
    }).format(value);
  },
  percentage: (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  },
  bytes: (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  },
  duration: (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
};