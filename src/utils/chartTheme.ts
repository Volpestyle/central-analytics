/**
 * ECharts Dark Theme Configuration
 * Following Tesla/Apple-inspired design principles with true black backgrounds
 */

export const darkTheme = {
  // Color palette matching design specification
  color: ['#0A84FF', '#32D74B', '#FFD60A', '#FF453A', '#BF5AF2', '#64D2FF', '#FF9F0A', '#5E5CE6'],
  backgroundColor: 'transparent',

  // Text styles with proper hierarchy
  textStyle: {
    color: '#FFFFFF',
    fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },

  title: {
    textStyle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 500
    },
    subtextStyle: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 12
    }
  },

  // Line chart configuration with smooth animations
  line: {
    itemStyle: {
      borderWidth: 2
    },
    lineStyle: {
      width: 2.5
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: true,
    animationDuration: 1000,
    animationEasing: 'cubicInOut'
  },

  // Bar chart configuration
  bar: {
    itemStyle: {
      borderRadius: [4, 4, 0, 0],
      barBorderWidth: 0
    },
    animationDuration: 800,
    animationEasing: 'elasticOut'
  },

  // Pie chart configuration
  pie: {
    itemStyle: {
      borderWidth: 2,
      borderColor: '#000000',
      borderRadius: 8
    },
    animationDuration: 1000,
    animationEasing: 'cubicInOut'
  },

  // Category axis (X-axis)
  categoryAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      show: true,
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: 11,
      fontFamily: "'Geist Mono', 'SF Mono', Monaco, monospace"
    },
    splitLine: {
      show: false
    },
    splitArea: {
      show: false
    }
  },

  // Value axis (Y-axis)
  valueAxis: {
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      show: true,
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: 11,
      fontFamily: "'Geist Mono', 'SF Mono', Monaco, monospace"
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.05)',
        type: 'dashed'
      }
    },
    splitArea: {
      show: false
    },
    nameTextStyle: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 12
    }
  },

  // Time axis configuration
  timeAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      show: true,
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: 11
    },
    splitLine: {
      show: false
    }
  },

  // Legend configuration
  legend: {
    textStyle: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 12
    },
    pageTextStyle: {
      color: 'rgba(255, 255, 255, 0.7)'
    },
    icon: 'roundRect',
    itemWidth: 16,
    itemHeight: 8,
    itemGap: 16
  },

  // Tooltip configuration with glassmorphism effect
  tooltip: {
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 8,
    padding: [12, 16],
    textStyle: {
      color: '#FFFFFF',
      fontSize: 12
    },
    extraCssText: 'backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);',
    axisPointer: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.2)',
        width: 1,
        type: 'dashed'
      },
      crossStyle: {
        color: 'rgba(255, 255, 255, 0.2)',
        width: 1,
        type: 'dashed'
      },
      shadowStyle: {
        color: 'rgba(10, 132, 255, 0.1)'
      }
    }
  },

  // DataZoom configuration
  dataZoom: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    dataBackgroundColor: 'rgba(255, 255, 255, 0.05)',
    fillerColor: 'rgba(10, 132, 255, 0.15)',
    handleColor: '#0A84FF',
    handleSize: '100%',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textStyle: {
      color: 'rgba(255, 255, 255, 0.5)'
    }
  },

  // Visual map configuration
  visualMap: {
    textStyle: {
      color: 'rgba(255, 255, 255, 0.7)'
    },
    inRange: {
      color: ['#0A84FF', '#32D74B', '#FFD60A', '#FF453A']
    }
  },

  // Toolbox configuration
  toolbox: {
    iconStyle: {
      borderColor: 'rgba(255, 255, 255, 0.5)'
    },
    emphasis: {
      iconStyle: {
        borderColor: '#FFFFFF'
      }
    }
  },

  // Mark point and mark line
  markPoint: {
    label: {
      color: '#FFFFFF'
    },
    emphasis: {
      label: {
        color: '#FFFFFF'
      }
    }
  },

  // Grid configuration for better spacing
  grid: {
    borderColor: 'rgba(255, 255, 255, 0.1)'
  }
};

/**
 * Get responsive options based on viewport width
 */
export const getResponsiveOptions = (width: number) => {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  return {
    grid: {
      left: isMobile ? '12%' : isTablet ? '8%' : '5%',
      right: isMobile ? '5%' : '4%',
      bottom: isMobile ? '18%' : isTablet ? '12%' : '10%',
      top: isMobile ? '18%' : isTablet ? '14%' : '12%',
      containLabel: true
    },
    legend: {
      orient: isMobile ? 'horizontal' : 'horizontal',
      bottom: isMobile ? 0 : 'auto',
      top: isMobile ? 'auto' : 5,
      left: isMobile ? 'center' : 'center',
      itemGap: isMobile ? 8 : 16,
      textStyle: {
        fontSize: isMobile ? 10 : 12
      }
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      position: function(point: number[], params: any, dom: any, rect: any, size: any) {
        // Smart positioning for mobile
        if (isMobile) {
          return [10, 10];
        }
        return null; // Default positioning for desktop
      }
    },
    toolbox: {
      show: isDesktop,
      orient: 'horizontal',
      itemSize: 14,
      itemGap: 10,
      right: 20,
      top: 20,
      feature: {
        saveAsImage: {
          show: true,
          title: 'Save',
          pixelRatio: 2
        },
        dataZoom: {
          show: true,
          title: {
            zoom: 'Zoom',
            back: 'Reset'
          }
        },
        restore: {
          show: true,
          title: 'Reset'
        }
      }
    },
    animationDuration: isMobile ? 500 : 800,
    animationEasing: 'cubicInOut'
  };
};

/**
 * Chart animation configurations
 */
export const chartAnimations = {
  // Initial load animation
  initialAnimation: {
    animationDuration: 1000,
    animationEasing: 'cubicInOut',
    animationDelay: (idx: number) => idx * 50
  },

  // Update animation
  updateAnimation: {
    animationDuration: 300,
    animationEasing: 'cubicInOut'
  },

  // Hover animation
  hoverAnimation: {
    animationDuration: 200,
    animationEasing: 'cubicOut'
  }
};

/**
 * Empty state configuration
 */
export const emptyStateConfig = {
  backgroundColor: '#0A0A0A',
  borderRadius: 12,
  textColor: 'rgba(255, 255, 255, 0.5)',
  iconColor: 'rgba(255, 255, 255, 0.3)'
};