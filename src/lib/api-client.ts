/**
 * API Client Utility
 * Provides a centralized, authenticated fetch wrapper for API calls
 */

import { appleAuth } from './apple-auth';
import type { ApiResponse, MetricsResponse, FetchOptions } from '@/types/api';

/**
 * Makes an authenticated API request
 * @param url The API endpoint URL
 * @param options Fetch options with optional auth requirement
 * @returns Promise<Response>
 */
export async function apiClient(url: string, options: FetchOptions = {}): Promise<Response> {
  const { requireAuth = true, headers: customHeaders = {}, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // Add authorization header if auth is required
  if (requireAuth) {
    const token = appleAuth.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return fetch(url, {
    ...fetchOptions,
    headers,
  });
}

/**
 * Makes an authenticated GET request
 * @param url The API endpoint URL
 * @param options Optional fetch options
 * @returns Promise<T> The parsed JSON response
 */
export async function apiGet<T>(url: string, options?: FetchOptions): Promise<T> {
  const response = await apiClient(url, { ...options, method: 'GET' });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Makes an authenticated POST request
 * @param url The API endpoint URL
 * @param data The request body data
 * @param options Optional fetch options
 * @returns Promise<T> The parsed JSON response
 */
export async function apiPost<T, TData = unknown>(url: string, data?: TData, options?: FetchOptions): Promise<T> {
  const response = await apiClient(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Builds an API URL with query parameters
 * @param path The API path
 * @param params Query parameters
 * @returns The complete URL with query string
 */
export function buildApiUrl(path: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return path;

  const queryString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return queryString ? `${path}?${queryString}` : path;
}

/**
 * Fetches metrics data with standard error handling
 * @param endpoint The API endpoint
 * @param params Query parameters
 * @returns Promise<T> The metrics data
 */
export async function fetchMetrics<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<MetricsResponse<T>> {
  const url = buildApiUrl(endpoint, params);

  try {
    const response = await apiGet<MetricsResponse<T>>(url);
    return response;
  } catch (error) {
    console.error(`Failed to fetch metrics from ${endpoint}:`, error);
    // Return empty data structure to avoid breaking the UI
    return { data: [] as unknown as T };
  }
}

/**
 * Fetches multiple metrics endpoints in parallel
 * @param requests Array of endpoint configurations
 * @returns Promise array of responses
 */
export async function fetchMetricsParallel<T extends readonly unknown[]>(
  requests: { endpoint: string; params?: Record<string, string | number> }[]
): Promise<T> {
  const promises = requests.map(({ endpoint, params }) =>
    fetchMetrics(endpoint, params).catch(err => {
      console.error(`Error fetching ${endpoint}:`, err);
      return { data: null };
    })
  );

  return Promise.all(promises) as unknown as Promise<T>;
}