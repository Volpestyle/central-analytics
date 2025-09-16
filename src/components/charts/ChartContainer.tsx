import React, { ReactNode } from 'react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: boolean | string | Error | null;
  controls?: ReactNode;
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  error = null,
  controls,
  className = ''
}) => {
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && error !== true && (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400 text-center">
            <p className="text-sm">Failed to load chart</p>
            <p className="text-xs mt-1">
              {typeof error === 'string' ? error : error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        </div>
      )}

      {!loading && (!error || error === true) && children}
    </div>
  );
};