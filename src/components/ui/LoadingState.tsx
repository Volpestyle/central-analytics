/**
 * LoadingState Component
 * Standardized loading indicator
 */

import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'medium',
  className = '',
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-10 h-10',
    large: 'w-16 h-16',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
      {message && (
        <p className="text-gray-400 mt-4 text-sm">{message}</p>
      )}
    </div>
  );
};