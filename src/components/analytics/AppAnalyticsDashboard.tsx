/**
 * Main Analytics Dashboard Component for App Monitoring
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { KPICard } from '@components/charts/KPICard';
import { LambdaMetricsChart } from './LambdaMetricsChart';
import { CostBreakdownChart } from './CostBreakdownChart';
import { RevenueChart } from './RevenueChart';
import { DownloadsChart } from './DownloadsChart';
import { appleAuth } from '@lib/apple-auth';
import { ApiGatewayChart } from './ApiGatewayChart';
import { DynamoDBChart } from './DynamoDBChart';
import { CostAnalyticsChart } from './CostAnalyticsChart';
import { EngagementMetrics } from './EngagementMetrics';
import type { TimeRange, AggregatedMetrics } from '@/types/analytics';

interface AppAnalyticsDashboardProps {
  appId: string;
}

export const AppAnalyticsDashboard: React.FC<AppAnalyticsDashboardProps> = ({ appId }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'aws' | 'appstore'>('overview');

  // Fetch aggregated metrics
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = appleAuth.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/apps/${appId}/metrics/aggregated?timeRange=${timeRange}`, {
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [appId, timeRange]);

  useEffect(() => {
    fetchMetrics();
    // Set up real-time updates
    const interval = setInterval(fetchMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Calculate KPI values
  const kpiValues = useMemo(() => {
    if (!metrics) return null;

    // Calculate total AWS cost
    const totalCost = metrics.aws?.cost?.currentPeriod || 0;
    const totalInvocations = metrics.aws?.lambda?.totalInvocations || 0;
    const lambdaErrorRate = metrics.aws?.lambda?.errorRate || 0;
    const apiRequests = metrics.aws?.apiGateway?.totalRequests || 0;

    return {
      awsCost: {
        value: totalCost.toFixed(2),
        change: metrics.aws?.cost?.dailyAverage ? ((totalCost - metrics.aws.cost.dailyAverage) / metrics.aws.cost.dailyAverage * 100).toFixed(1) : '0',
        unit: 'USD'
      },
      apiCalls: {
        value: (totalInvocations + apiRequests).toLocaleString(),
        change: 8.3,
        unit: 'calls'
      },
      revenue: {
        value: (metrics.appStore?.revenue || 0).toFixed(2),
        change: 15.7,
        unit: 'USD'
      },
      activeUsers: {
        value: (metrics.appStore?.activeDevices || 0).toLocaleString(),
        change: 5.2,
        unit: 'devices'
      },
      downloads: {
        value: (metrics.appStore?.downloads || 0).toLocaleString(),
        change: 12.4,
        unit: 'downloads'
      },
      errorRate: {
        value: lambdaErrorRate.toFixed(2),
        change: -23.5,
        unit: '%'
      }
    };
  }, [metrics]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  const healthStatusColor = useMemo(() => {
    if (!metrics || !metrics.health) return 'bg-gray-500';
    const status = metrics.health.status?.toLowerCase();
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }, [metrics]);

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-xl p-6 text-center">
            <h3 className="text-red-400 text-lg font-medium mb-2">Error Loading Dashboard</h3>
            <p className="text-red-300">{error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-surface-light sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
            {/* App Info and Navigation */}
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="text-text-secondary hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary">ilikeyacut</h1>
                  <p className="text-xs text-text-secondary">iOS App Analytics</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${healthStatusColor} animate-pulse`} />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* View Selector */}
              <div className="flex bg-surface-light rounded-lg p-1">
                <button
                  onClick={() => setSelectedView('overview')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    selectedView === 'overview'
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setSelectedView('aws')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    selectedView === 'aws'
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  AWS Infrastructure
                </button>
                <button
                  onClick={() => setSelectedView('appstore')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    selectedView === 'appstore'
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  App Store
                </button>
              </div>

              {/* Time Range Selector */}
              <div className="flex bg-surface-light rounded-lg p-1">
                {(['24h', '7d', '30d', '90d'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeRangeChange(range)}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                      timeRange === range
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {range === '24h' ? 'Today' : range === '7d' ? 'Week' : range === '30d' ? 'Month' : 'Quarter'}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchMetrics}
                className="p-2 rounded-lg hover:bg-surface-light transition-colors text-text-secondary hover:text-primary"
                disabled={isLoading}
              >
                <svg
                  className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && !metrics ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            {selectedView === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                <KPICard
                  title="AWS Cost"
                  value={`$${kpiValues?.awsCost.value || '0'}`}
                  change={Number(kpiValues?.awsCost.change || 0)}
                  color="#0A84FF"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  sparklineData={[10, 15, 13, 17, 15, 19, 21, 20, 18, 22, 25, 23]}
                />
                <KPICard
                  title="API Calls"
                  value={kpiValues?.apiCalls.value || '0'}
                  change={Number(kpiValues?.apiCalls.change || 0)}
                  color="#32D74B"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                  sparklineData={[30, 35, 32, 38, 40, 37, 42, 45, 48, 44, 50, 52]}
                />
                <KPICard
                  title="Revenue"
                  value={`$${kpiValues?.revenue.value || '0'}`}
                  change={Number(kpiValues?.revenue.change || 0)}
                  color="#FFD60A"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  sparklineData={[40, 42, 38, 45, 48, 50, 47, 52, 55, 58, 60, 62]}
                />
                <KPICard
                  title="Active Users"
                  value={kpiValues?.activeUsers.value || '0'}
                  change={Number(kpiValues?.activeUsers.change || 0)}
                  color="#BF5AF2"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  sparklineData={[20, 22, 21, 23, 25, 24, 26, 28, 27, 29, 30, 31]}
                />
                <KPICard
                  title="Downloads"
                  value={kpiValues?.downloads.value || '0'}
                  change={Number(kpiValues?.downloads.change || 0)}
                  color="#64D2FF"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  }
                  sparklineData={[15, 18, 17, 20, 22, 19, 24, 26, 28, 25, 30, 32]}
                />
                <KPICard
                  title="Error Rate"
                  value={`${kpiValues?.errorRate.value || '0'}%`}
                  change={Number(kpiValues?.errorRate.change || 0)}
                  color="#FF453A"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  sparklineData={[5, 4.5, 4.8, 4.2, 3.9, 3.7, 3.5, 3.3, 3.1, 2.9, 2.7, 2.5]}
                />
              </div>
            )}

            {/* Charts Section */}
            <div className="space-y-6">
              {/* Overview View */}
              {selectedView === 'overview' && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <LambdaMetricsChart appId={appId} timeRange={timeRange} metrics={metrics} />
                    <CostBreakdownChart appId={appId} timeRange={timeRange} metrics={metrics} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RevenueChart appId={appId} timeRange={timeRange} metrics={metrics} />
                    <DownloadsChart appId={appId} timeRange={timeRange} metrics={metrics} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <EngagementMetrics appId={appId} timeRange={timeRange} metrics={metrics} />
                    <CostAnalyticsChart appId={appId} timeRange={timeRange} metrics={metrics} />
                  </div>
                </>
              )}

              {/* AWS Infrastructure View */}
              {selectedView === 'aws' && (
                <>
                  <LambdaMetricsChart appId={appId} timeRange={timeRange} metrics={metrics} detailed />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ApiGatewayChart appId={appId} timeRange={timeRange} metrics={metrics} />
                    <DynamoDBChart appId={appId} timeRange={timeRange} metrics={metrics} />
                  </div>
                  <CostAnalyticsChart appId={appId} timeRange={timeRange} metrics={metrics} detailed />
                </>
              )}

              {/* App Store View */}
              {selectedView === 'appstore' && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DownloadsChart appId={appId} timeRange={timeRange} metrics={metrics} detailed />
                    <RevenueChart appId={appId} timeRange={timeRange} metrics={metrics} detailed />
                  </div>
                  <EngagementMetrics appId={appId} timeRange={timeRange} metrics={metrics} detailed />
                </>
              )}
            </div>

            {/* Health Issues Alert */}
            {metrics?.health?.issues && metrics.health.issues.length > 0 && (
              <div className="mt-6 bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="text-yellow-300 font-medium mb-1">Active Issues</h4>
                    <ul className="text-sm text-yellow-200 space-y-1">
                      {metrics.health.issues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="mt-6 text-center text-xs text-text-tertiary">
              Last updated: {metrics ? new Date(metrics.timestamp * 1000).toLocaleString() : 'Loading...'}
            </div>
          </>
        )}
      </main>
    </div>
  );
};