/**
 * API Types
 * Type definitions for API requests and responses
 */

export interface ApiResponse<T> {
  data: T;
  metadata?: {
    timestamp: string;
    version?: string;
    count?: number;
  };
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface MetricsResponse<T> {
  data: T;
  metadata?: {
    timeRange: string;
    aggregation?: string;
    units?: string;
  };
}

export interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
  timeout?: number;
  retries?: number;
}