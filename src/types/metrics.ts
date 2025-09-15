// AWS Metrics Types
export interface LambdaMetrics {
  timestamp: Date;
  invocations: number;
  errors: number;
  duration: number; // milliseconds
  cost: number; // USD
  throttles: number;
  concurrentExecutions: number;
}

export interface APIGatewayMetrics {
  timestamp: Date;
  requests: number;
  errors4xx: number;
  errors5xx: number;
  latency: number; // milliseconds
  dataTransferred: number; // bytes
  cacheHitCount: number;
  cacheMissCount: number;
}

export interface DynamoDBMetrics {
  timestamp: Date;
  readCapacityUnits: number;
  writeCapacityUnits: number;
  throttledRequests: number;
  userErrors: number;
  systemErrors: number;
  tableSize: number; // bytes
  itemCount: number;
}

export interface CostMetrics {
  date: Date;
  service: string;
  cost: number; // USD
  usage: number;
  region: string;
}

// App Store Analytics Types
export interface AppStoreMetrics {
  date: Date;
  downloads: number;
  updates: number;
  revenue: number; // USD
  inAppPurchases: number;
  subscriptions: number;
  activeDevices: number;
  crashes: number;
  rating: number;
  reviews: number;
}

export interface UserEngagementMetrics {
  date: Date;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  sessionDuration: number; // seconds
  sessionsPerUser: number;
  retentionRate: number; // percentage
  churnRate: number; // percentage
  screenViews: number;
  userActions: number;
}

// Chart Configuration Types
export interface ChartConfig {
  title: string;
  subtitle?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  responsive?: boolean;
  theme?: 'dark' | 'light';
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

// Data Point Types
export interface DataPoint {
  x: number | Date | string;
  y: number;
  label?: string;
}

export interface SeriesData {
  name: string;
  data: DataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area' | 'scatter';
}