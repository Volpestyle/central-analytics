import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimeRange = '1h' | '6h' | '24h' | '7d';
export type MetricView = 'overview' | 'lambda' | 'api' | 'database' | 'costs' | 'appstore';

interface DashboardState {
  // Time range selection
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;

  // Current view
  currentView: MetricView;
  setCurrentView: (view: MetricView) => void;

  // Selected resources
  selectedLambdaFunctions: string[];
  toggleLambdaFunction: (functionName: string) => void;
  selectAllLambdaFunctions: () => void;
  clearLambdaSelection: () => void;

  selectedDynamoTables: string[];
  toggleDynamoTable: (tableName: string) => void;
  selectAllDynamoTables: () => void;
  clearDynamoSelection: () => void;

  // Refresh control
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  triggerRefresh: () => void;
  setRefreshing: (refreshing: boolean) => void;

  // Error handling
  errors: Map<string, string>;
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;

  // Alerts configuration
  alertsEnabled: boolean;
  toggleAlerts: () => void;
  alertThresholds: {
    lambdaErrorRate: number;
    apiLatency: number;
    dynamoThrottles: number;
    costIncrease: number;
  };
  updateAlertThreshold: (key: keyof DashboardState['alertThresholds'], value: number) => void;

  // Cache control
  cacheEnabled: boolean;
  toggleCache: () => void;

  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      // Time range
      timeRange: '24h',
      setTimeRange: (range) => set({ timeRange: range }),

      // Current view
      currentView: 'overview',
      setCurrentView: (view) => set({ currentView: view }),

      // Lambda selection
      selectedLambdaFunctions: [],
      toggleLambdaFunction: (functionName) => set((state) => {
        const selected = [...state.selectedLambdaFunctions];
        const index = selected.indexOf(functionName);
        if (index > -1) {
          selected.splice(index, 1);
        } else {
          selected.push(functionName);
        }
        return { selectedLambdaFunctions: selected };
      }),
      selectAllLambdaFunctions: () => set({
        selectedLambdaFunctions: [
          'ilikeyacut-gemini-proxy-dev',
          'ilikeyacut-auth-dev',
          'ilikeyacut-payment-handler-dev',
          'ilikeyacut-notification-service-dev'
        ]
      }),
      clearLambdaSelection: () => set({ selectedLambdaFunctions: [] }),

      // DynamoDB selection
      selectedDynamoTables: [],
      toggleDynamoTable: (tableName) => set((state) => {
        const selected = [...state.selectedDynamoTables];
        const index = selected.indexOf(tableName);
        if (index > -1) {
          selected.splice(index, 1);
        } else {
          selected.push(tableName);
        }
        return { selectedDynamoTables: selected };
      }),
      selectAllDynamoTables: () => set({
        selectedDynamoTables: [
          'ilikeyacut-users-dev',
          'ilikeyacut-transactions-dev',
          'ilikeyacut-sessions-dev',
          'ilikeyacut-barbers-dev',
          'ilikeyacut-appointments-dev'
        ]
      }),
      clearDynamoSelection: () => set({ selectedDynamoTables: [] }),

      // Refresh control
      isRefreshing: false,
      lastRefreshTime: null,
      triggerRefresh: () => {
        set({ isRefreshing: true, lastRefreshTime: new Date() });
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      },
      setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),

      // Error handling
      errors: new Map(),
      setError: (key, error) => set((state) => {
        const errors = new Map(state.errors);
        errors.set(key, error);
        return { errors };
      }),
      clearError: (key) => set((state) => {
        const errors = new Map(state.errors);
        errors.delete(key);
        return { errors };
      }),
      clearAllErrors: () => set({ errors: new Map() }),

      // Alerts
      alertsEnabled: true,
      toggleAlerts: () => set((state) => ({ alertsEnabled: !state.alertsEnabled })),
      alertThresholds: {
        lambdaErrorRate: 0.05, // 5%
        apiLatency: 2000, // 2 seconds
        dynamoThrottles: 10,
        costIncrease: 0.2 // 20%
      },
      updateAlertThreshold: (key, value) => set((state) => ({
        alertThresholds: {
          ...state.alertThresholds,
          [key]: value
        }
      })),

      // Cache control
      cacheEnabled: true,
      toggleCache: () => set((state) => ({ cacheEnabled: !state.cacheEnabled })),

      // Dark mode
      darkMode: true, // Default to dark mode for iPhone 17 Pro
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode }))
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        timeRange: state.timeRange,
        currentView: state.currentView,
        alertsEnabled: state.alertsEnabled,
        alertThresholds: state.alertThresholds,
        cacheEnabled: state.cacheEnabled,
        darkMode: state.darkMode
      })
    }
  )
);