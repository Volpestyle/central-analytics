/**
 * Type definitions for analytics data structures
 */

// Time range options for filtering data
export type TimeRange = '24h' | '7d' | '30d' | '90d';

// Lambda Function Metrics
export interface LambdaMetrics {
  functionName: string;
  invocations: number;
  errors: number;
  errorRate: number;
  averageDuration: number;
  coldStarts: number;
  throttles: number;
  concurrentExecutions: number;
  estimatedCost: number;
  timestamp: string;
}

export interface LambdaTimeSeriesData {
  timestamp: string;
  invocations: number;
  errors: number;
  duration: number;
  cost: number;
}

// API Gateway Metrics
export interface ApiGatewayMetrics {
  endpoint: string;
  method: string;
  requestCount: number;
  errorCount4xx: number;
  errorCount5xx: number;
  averageLatency: number;
  p99Latency: number;
  dataTransferred: number;
  timestamp: string;
}

export interface ApiEndpointSummary {
  endpoint: string;
  totalRequests: number;
  errorRate: number;
  avgLatency: number;
}

// DynamoDB Metrics
export interface DynamoDBMetrics {
  tableName: string;
  readCapacityUsed: number;
  writeCapacityUsed: number;
  throttledReads: number;
  throttledWrites: number;
  itemCount: number;
  tableSize: number;
  estimatedCost: number;
  timestamp: string;
}

export interface DynamoDBTimeSeriesData {
  timestamp: string;
  readCapacity: number;
  writeCapacity: number;
  throttles: number;
}

// AWS Cost Analytics
export interface AWSCostBreakdown {
  service: string;
  cost: number;
  percentage: number;
  trend: number; // percentage change from previous period
}

export interface DailyCostData {
  date: string;
  totalCost: number;
  breakdown: {
    lambda: number;
    dynamoDB: number;
    apiGateway: number;
    s3: number;
    cloudFront: number;
    other: number;
  };
}

export interface CostProjection {
  currentMonthToDate: number;
  projectedMonthEnd: number;
  lastMonthTotal: number;
  percentageChange: number;
}

// App Store Analytics
export interface AppStoreDownloads {
  date: string;
  downloads: number;
  redownloads: number;
  updates: number;
  totalInstalls: number;
}

export interface GeographicDistribution {
  country: string;
  countryCode: string;
  downloads: number;
  revenue: number;
  percentage: number;
}

export interface RevenueMetrics {
  date: string;
  inAppPurchases: number;
  subscriptions: number;
  totalRevenue: number;
  transactions: number;
  arpu: number; // Average Revenue Per User
  arppu: number; // Average Revenue Per Paying User
}

export interface CreditPackSales {
  packName: string;
  packId: string;
  unitsSold: number;
  revenue: number;
  percentage: number;
}

export interface UserEngagement {
  date: string;
  activeDevices: number;
  sessions: number;
  averageSessionDuration: number;
  crashRate: number;
  retentionDay1: number;
  retentionDay7: number;
  retentionDay30: number;
}

// Aggregated Metrics from Backend
export interface AggregatedMetrics {
  appId: string;
  period: string;
  aws: AWSMetricsSummary;
  appStore: AppStoreMetricsSummary;
  health: HealthSummary;
  timestamp: number;
}

// AWS Metrics Summary
export interface AWSMetricsSummary {
  lambda: LambdaSummary;
  apiGateway: APIGatewaySummary;
  dynamoDB: DynamoDBSummary;
  cost: CostSummary;
}

export interface LambdaSummary {
  totalInvocations: number;
  totalErrors: number;
  errorRate: number;
  averageDuration: number;
  totalThrottles: number;
  functionCount: number;
}

export interface APIGatewaySummary {
  totalRequests: number;
  total4xxErrors: number;
  total5xxErrors: number;
  errorRate: number;
  averageLatency: number;
}

export interface DynamoDBSummary {
  totalReadCapacity: number;
  totalWriteCapacity: number;
  totalThrottles: number;
  totalErrors: number;
  tableCount: number;
  totalItemCount: number;
  totalSizeBytes: number;
}

export interface CostSummary {
  currentPeriod: number;
  dailyAverage: number;
  projectedMonth: number;
  topServices: ServiceCostSummary[];
}

export interface ServiceCostSummary {
  serviceName: string;
  cost: number;
  percentage: number;
}

// App Store Metrics Summary
export interface AppStoreMetricsSummary {
  downloads: number;
  updates: number;
  revenue: number;
  arpu: number;
  activeDevices: number;
  averageRating: number;
  totalRatings: number;
}

// Health Summary
export interface HealthSummary {
  status: string;
  healthyServices: number;
  degradedServices: number;
  unknownServices: number;
  issues: string[];
}

// Legacy type for backward compatibility (will be removed)
export interface AppMetricsSummary {
  appId: string;
  appName: string;
  timeRange: TimeRange;
  lastUpdated: string;
  aws: {
    totalCost: number;
    totalInvocations: number;
    errorRate: number;
    averageLatency: number;
  };
  appStore: {
    totalDownloads: number;
    totalRevenue: number;
    activeUsers: number;
    crashRate: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
  };
}

// Chart Data Structures
export interface ChartDataPoint {
  x: string | number;
  y: number;
  category?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  type?: 'line' | 'bar' | 'area' | 'scatter' | 'pie';
  color?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Filter and Query Parameters
export interface MetricsQuery {
  appId: string;
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  metrics?: string[];
}

// Real-time Update Types
export interface MetricsUpdate {
  type: 'lambda' | 'api' | 'dynamodb' | 'cost' | 'appstore';
  data: any;
  timestamp: string;
}

// Error Tracking
export interface ErrorDetail {
  timestamp: string;
  service: string;
  errorType: string;
  message: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Performance Metrics
export interface PerformanceMetrics {
  service: string;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  throughput: number;
}