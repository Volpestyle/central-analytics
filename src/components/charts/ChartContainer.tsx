import React, { ReactNode } from 'react';
import { ErrorState } from '../ui/ErrorState';
import { LoadingState } from '../ui/LoadingState';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: boolean | string | Error | null;
  controls?: ReactNode;
  className?: string;
  onRetry?: () => void;
}

export const ChartContainer: React.FC<ChartContainerProps> = React.memo(({
  title,
  subtitle,
  children,
  loading = false,
  error = null,
  controls,
  className = '',
  onRetry
}) => {
  const getErrorMessage = () => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'Failed to load chart data. Please try again.';
  };

  // Check if children is empty or invalid (for empty state detection)
  const hasValidChildren = React.Children.count(children) > 0 &&
    React.Children.toArray(children).some(child =>
      child && typeof child === 'object' && 'props' in child
    );

  return (
    <div className={`bg-[#0A0A0A] rounded-xl p-6 border border-[rgba(255,255,255,0.05)] shadow-lg transition-all duration-300 hover:border-[rgba(255,255,255,0.1)] ${className}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">{subtitle}</p>
          )}
        </div>
        {controls && (
          <div className="flex gap-2">
            {controls}
          </div>
        )}
      </div>

      {loading && (
        <LoadingState
          message="Loading chart data..."
          size="medium"
          className="h-64"
        />
      )}

      {error && !loading && (
        <ErrorState
          title="Chart Load Failed"
          message={getErrorMessage()}
          onRetry={onRetry}
          showRetry={!!onRetry}
          className="h-64"
        />
      )}

      {!loading && !error && hasValidChildren && children}

      {!loading && !error && !hasValidChildren && (
        <div className="h-64 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[rgba(255,255,255,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-[rgba(255,255,255,0.3)] text-sm">No data available</p>
          <p className="text-[rgba(255,255,255,0.2)] text-xs mt-1">Data will appear when metrics are collected</p>
        </div>
      )}
    </div>
  );
});