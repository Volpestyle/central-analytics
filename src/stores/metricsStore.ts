import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  LambdaMetrics,
  APIGatewayMetrics,
  DynamoDBMetrics,
  CostMetrics,
  AppStoreMetrics,
  UserEngagementMetrics,
  TimeRange
} from '../types/metrics';

interface MetricsState {
  // AWS Metrics
  lambdaMetrics: LambdaMetrics[];
  apiGatewayMetrics: APIGatewayMetrics[];
  dynamoDBMetrics: DynamoDBMetrics[];
  costMetrics: CostMetrics[];

  // App Store Metrics
  appStoreMetrics: AppStoreMetrics[];
  userEngagementMetrics: UserEngagementMetrics[];

  // UI State
  timeRange: TimeRange;
  selectedService: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefresh: boolean;
  refreshInterval: number; // milliseconds

  // Actions
  setLambdaMetrics: (metrics: LambdaMetrics[]) => void;
  setAPIGatewayMetrics: (metrics: APIGatewayMetrics[]) => void;
  setDynamoDBMetrics: (metrics: DynamoDBMetrics[]) => void;
  setCostMetrics: (metrics: CostMetrics[]) => void;
  setAppStoreMetrics: (metrics: AppStoreMetrics[]) => void;
  setUserEngagementMetrics: (metrics: UserEngagementMetrics[]) => void;

  setTimeRange: (range: TimeRange) => void;
  setSelectedService: (service: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;

  // Data fetching
  fetchAllMetrics: () => Promise<void>;
  fetchLambdaMetrics: () => Promise<void>;
  fetchAPIGatewayMetrics: () => Promise<void>;
  fetchDynamoDBMetrics: () => Promise<void>;
  fetchCostMetrics: () => Promise<void>;
  fetchAppStoreMetrics: () => Promise<void>;

  // Utility
  clearAllMetrics: () => void;
  getMetricsByTimeRange: <T extends { timestamp?: Date; date?: Date }>(
    metrics: T[],
    range?: TimeRange
  ) => T[];
}

// Mock data generator for demo purposes
const generateMockLambdaMetrics = (hours: number = 24): LambdaMetrics[] => {
  const metrics: LambdaMetrics[] = [];
  const now = new Date();

  for (let i = 0; i < hours; i++) {
    const timestamp = new Date(now.getTime() - (hours - i) * 60 * 60 * 1000);
    metrics.push({
      timestamp,
      invocations: Math.floor(Math.random() * 1000) + 500,
      errors: Math.floor(Math.random() * 50),
      duration: Math.random() * 300 + 50,
      cost: Math.random() * 10 + 1,
      throttles: Math.floor(Math.random() * 10),
      concurrentExecutions: Math.floor(Math.random() * 100) + 20
    });
  }

  return metrics;
};

const generateMockCostMetrics = (days: number = 30): CostMetrics[] => {
  const metrics: CostMetrics[] = [];
  const services = ['Lambda', 'DynamoDB', 'API Gateway', 'S3', 'CloudWatch', 'SNS'];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
    services.forEach(service => {
      metrics.push({
        date,
        service,
        cost: Math.random() * 50 + 10,
        usage: Math.random() * 1000,
        region: 'us-east-1'
      });
    });
  }

  return metrics;
};

const generateMockAppStoreMetrics = (days: number = 30): AppStoreMetrics[] => {
  const metrics: AppStoreMetrics[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
    metrics.push({
      date,
      downloads: Math.floor(Math.random() * 500) + 100,
      updates: Math.floor(Math.random() * 200) + 50,
      revenue: Math.random() * 1000 + 200,
      inAppPurchases: Math.random() * 500 + 100,
      subscriptions: Math.random() * 300 + 50,
      activeDevices: Math.floor(Math.random() * 5000) + 1000,
      crashes: Math.floor(Math.random() * 20),
      rating: 4 + Math.random() * 0.8,
      reviews: Math.floor(Math.random() * 50) + 10
    });
  }

  return metrics;
};

const generateMockEngagementMetrics = (days: number = 30): UserEngagementMetrics[] => {
  const metrics: UserEngagementMetrics[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
    metrics.push({
      date,
      dailyActiveUsers: Math.floor(Math.random() * 2000) + 500,
      monthlyActiveUsers: Math.floor(Math.random() * 10000) + 5000,
      sessionDuration: Math.random() * 600 + 120, // 2-12 minutes
      sessionsPerUser: Math.random() * 5 + 1,
      retentionRate: 60 + Math.random() * 30, // 60-90%
      churnRate: 5 + Math.random() * 10, // 5-15%
      screenViews: Math.floor(Math.random() * 10000) + 2000,
      userActions: Math.floor(Math.random() * 5000) + 1000
    });
  }

  return metrics;
};

export const useMetricsStore = create<MetricsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        lambdaMetrics: [],
        apiGatewayMetrics: [],
        dynamoDBMetrics: [],
        costMetrics: [],
        appStoreMetrics: [],
        userEngagementMetrics: [],

        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          end: new Date(),
          granularity: 'hour'
        },
        selectedService: null,
        isLoading: false,
        error: null,
        lastUpdated: null,
        autoRefresh: false,
        refreshInterval: 60000, // 1 minute

        // Setters
        setLambdaMetrics: (metrics) => set({ lambdaMetrics: metrics }),
        setAPIGatewayMetrics: (metrics) => set({ apiGatewayMetrics: metrics }),
        setDynamoDBMetrics: (metrics) => set({ dynamoDBMetrics: metrics }),
        setCostMetrics: (metrics) => set({ costMetrics: metrics }),
        setAppStoreMetrics: (metrics) => set({ appStoreMetrics: metrics }),
        setUserEngagementMetrics: (metrics) => set({ userEngagementMetrics: metrics }),

        setTimeRange: (range) => set({ timeRange: range }),
        setSelectedService: (service) => set({ selectedService: service }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
        setRefreshInterval: (interval) => set({ refreshInterval: interval }),

        // Data fetching
        fetchAllMetrics: async () => {
          set({ isLoading: true, error: null });
          try {
            // In production, these would be actual API calls
            await Promise.all([
              get().fetchLambdaMetrics(),
              get().fetchCostMetrics(),
              get().fetchAppStoreMetrics()
            ]);
            set({ lastUpdated: new Date() });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch metrics' });
          } finally {
            set({ isLoading: false });
          }
        },

        fetchLambdaMetrics: async () => {
          try {
            // Mock implementation - replace with actual API call
            const metrics = generateMockLambdaMetrics(24);
            set({ lambdaMetrics: metrics });
          } catch (error) {
            console.error('Failed to fetch Lambda metrics:', error);
            throw error;
          }
        },

        fetchAPIGatewayMetrics: async () => {
          // Implementation for API Gateway metrics
          // Similar structure to fetchLambdaMetrics
        },

        fetchDynamoDBMetrics: async () => {
          // Implementation for DynamoDB metrics
          // Similar structure to fetchLambdaMetrics
        },

        fetchCostMetrics: async () => {
          try {
            const metrics = generateMockCostMetrics(30);
            set({ costMetrics: metrics });
          } catch (error) {
            console.error('Failed to fetch cost metrics:', error);
            throw error;
          }
        },

        fetchAppStoreMetrics: async () => {
          try {
            const appMetrics = generateMockAppStoreMetrics(30);
            const engagementMetrics = generateMockEngagementMetrics(30);
            set({
              appStoreMetrics: appMetrics,
              userEngagementMetrics: engagementMetrics
            });
          } catch (error) {
            console.error('Failed to fetch App Store metrics:', error);
            throw error;
          }
        },

        // Utility
        clearAllMetrics: () => {
          set({
            lambdaMetrics: [],
            apiGatewayMetrics: [],
            dynamoDBMetrics: [],
            costMetrics: [],
            appStoreMetrics: [],
            userEngagementMetrics: [],
            lastUpdated: null,
            error: null
          });
        },

        getMetricsByTimeRange: (metrics, range) => {
          const timeRange = range || get().timeRange;
          return metrics.filter(metric => {
            const date = metric.timestamp || metric.date;
            if (!date) return false;
            return date >= timeRange.start && date <= timeRange.end;
          });
        }
      }),
      {
        name: 'metrics-storage',
        partialize: (state) => ({
          timeRange: state.timeRange,
          autoRefresh: state.autoRefresh,
          refreshInterval: state.refreshInterval
        })
      }
    )
  )
);