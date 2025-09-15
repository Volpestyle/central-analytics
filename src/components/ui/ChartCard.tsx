import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  headerActions?: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  className = '',
  headerActions
}) => {
  return (
    <div
      className={`bg-background-card border border-white/5 rounded-2xl overflow-hidden ${className}`}
    >
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && (
              <p className="text-sm text-white/50 mt-1">{subtitle}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">{headerActions}</div>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-accent-blue" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ChartCard;