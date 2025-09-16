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

  return (
    <div className={`bg-gray-900 rounded-2xl p-6 border border-gray-800 ${className}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
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

      {error && error !== true && (
        <ErrorState
          title="Chart Load Failed"
          message={getErrorMessage()}
          onRetry={onRetry}
          showRetry={!!onRetry}
          className="h-64"
        />
      )}

      {!loading && (!error || error === true) && children}
    </div>
  );
});