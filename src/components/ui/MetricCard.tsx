import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  loading = false,
  className = ''
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  if (loading) {
    return (
      <div className={`bg-background-card border border-white/5 rounded-2xl p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-24 mb-4" />
          <div className="h-8 bg-white/10 rounded w-32 mb-2" />
          <div className="h-3 bg-white/10 rounded w-20" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-background-card border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-200 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-white/70">{title}</h3>
        {icon && <div className="text-white/50">{icon}</div>}
      </div>

      <div className="space-y-2">
        <p className="text-2xl sm:text-3xl font-bold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>

        {change !== undefined && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center text-sm font-medium ${
                isPositive
                  ? 'text-accent-green'
                  : isNegative
                  ? 'text-accent-red'
                  : 'text-white/50'
              }`}
            >
              {isPositive && (
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              )}
              {isNegative && (
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-xs text-white/50">{changeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;