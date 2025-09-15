import React, { useEffect, useState } from 'react';
import { useMetricsStore } from '../stores/metricsStore';
import DashboardLayout from './layout/DashboardLayout';
import MetricCard from './ui/MetricCard';
import ChartCard from './ui/ChartCard';
import LambdaMetricsChart from './charts/LambdaMetricsChart';
import CostBreakdownChart from './charts/CostBreakdownChart';
import AppStoreChart from './charts/AppStoreChart';
import { formatters } from '../utils/chartTheme';

export const Dashboard: React.FC = () => {
  const {
    lambdaMetrics,
    costMetrics,
    appStoreMetrics,
    userEngagementMetrics,
    isLoading,
    fetchAllMetrics
  } = useMetricsStore();

  const [selectedCostView, setSelectedCostView] = useState<'daily' | 'service' | 'treemap' | 'stacked'>('daily');
  const [selectedLambdaMetric, setSelectedLambdaMetric] = useState<'invocations' | 'errors' | 'duration' | 'cost'>('invocations');
  const [selectedAppStoreChart, setSelectedAppStoreChart] = useState<'downloads' | 'revenue' | 'engagement' | 'retention'>('downloads');

  useEffect(() => {
    fetchAllMetrics();
  }, []);

  // Calculate summary metrics
  const calculateSummaryMetrics = () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Lambda metrics
    const todayLambda = lambdaMetrics.filter(m => m.timestamp >= yesterday);
    const totalInvocations = todayLambda.reduce((sum, m) => sum + m.invocations, 0);
    const totalErrors = todayLambda.reduce((sum, m) => sum + m.errors, 0);
    const avgDuration = todayLambda.length > 0
      ? todayLambda.reduce((sum, m) => sum + m.duration, 0) / todayLambda.length
      : 0;

    // Cost metrics
    const todayCosts = costMetrics.filter(m => m.date >= yesterday);
    const totalCost = todayCosts.reduce((sum, m) => sum + m.cost, 0);

    // App Store metrics
    const latestAppMetrics = appStoreMetrics[appStoreMetrics.length - 1];
    const previousAppMetrics = appStoreMetrics[appStoreMetrics.length - 2];

    // Engagement metrics
    const latestEngagement = userEngagementMetrics[userEngagementMetrics.length - 1];

    return {
      totalInvocations,
      totalErrors,
      avgDuration,
      totalCost,
      downloads: latestAppMetrics?.downloads || 0,
      downloadsChange: previousAppMetrics
        ? ((latestAppMetrics?.downloads - previousAppMetrics.downloads) / previousAppMetrics.downloads) * 100
        : 0,
      revenue: latestAppMetrics?.revenue || 0,
      revenueChange: previousAppMetrics
        ? ((latestAppMetrics?.revenue - previousAppMetrics.revenue) / previousAppMetrics.revenue) * 100
        : 0,
      dau: latestEngagement?.dailyActiveUsers || 0,
      retentionRate: latestEngagement?.retentionRate || 0
    };
  };

  const metrics = calculateSummaryMetrics();

  return (
    <DashboardLayout title="Central Analytics Dashboard">
      <div className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Lambda Invocations (24h)"
            value={formatters.number(metrics.totalInvocations)}
            change={12.5}
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <MetricCard
            title="Total Cost (24h)"
            value={formatters.currency(metrics.totalCost)}
            change={-5.2}
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            title="App Downloads"
            value={formatters.number(metrics.downloads)}
            change={metrics.downloadsChange}
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            }
          />
          <MetricCard
            title="Daily Active Users"
            value={formatters.number(metrics.dau)}
            change={8.3}
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
        </div>

        {/* Lambda Metrics Chart */}
        <div id="lambda">
          <ChartCard
            title="Lambda Performance Metrics"
            subtitle="Real-time function execution data"
            loading={isLoading}
            headerActions={
              <select
                value={selectedLambdaMetric}
                onChange={(e) => setSelectedLambdaMetric(e.target.value as any)}
                className="px-3 py-1 bg-background-surface border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-accent-blue"
              >
                <option value="invocations">Invocations</option>
                <option value="errors">Errors</option>
                <option value="duration">Duration</option>
                <option value="cost">Cost</option>
              </select>
            }
          >
            <LambdaMetricsChart
              data={lambdaMetrics}
              metricType={selectedLambdaMetric}
              height={400}
              showTrend
            />
          </ChartCard>
        </div>

        {/* Cost Analytics */}
        <div id="costs" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="AWS Cost Analytics"
            subtitle="Service costs and projections"
            loading={isLoading}
            headerActions={
              <select
                value={selectedCostView}
                onChange={(e) => setSelectedCostView(e.target.value as any)}
                className="px-3 py-1 bg-background-surface border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-accent-blue"
              >
                <option value="daily">Daily Trend</option>
                <option value="service">By Service</option>
                <option value="treemap">Distribution</option>
                <option value="stacked">Stacked Trend</option>
              </select>
            }
          >
            <CostBreakdownChart
              data={costMetrics}
              viewType={selectedCostView}
              height={400}
              showProjection={selectedCostView === 'daily'}
            />
          </ChartCard>

          <ChartCard
            title="Cost Breakdown by Service"
            subtitle="Top spending services"
            loading={isLoading}
          >
            <CostBreakdownChart
              data={costMetrics}
              viewType="service"
              height={400}
            />
          </ChartCard>
        </div>

        {/* App Store Analytics */}
        <div id="appstore" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="App Store Performance"
            subtitle="Downloads, updates, and user acquisition"
            loading={isLoading}
            headerActions={
              <select
                value={selectedAppStoreChart}
                onChange={(e) => setSelectedAppStoreChart(e.target.value as any)}
                className="px-3 py-1 bg-background-surface border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-accent-blue"
              >
                <option value="downloads">Downloads</option>
                <option value="revenue">Revenue</option>
                <option value="engagement">Engagement</option>
                <option value="retention">Retention</option>
              </select>
            }
          >
            <AppStoreChart
              data={selectedAppStoreChart === 'engagement' || selectedAppStoreChart === 'retention'
                ? userEngagementMetrics
                : appStoreMetrics}
              chartType={selectedAppStoreChart}
              height={400}
            />
          </ChartCard>

          <ChartCard
            title="App Store Ratings"
            subtitle="User ratings distribution"
            loading={isLoading}
          >
            <AppStoreChart
              data={appStoreMetrics}
              chartType="rating"
              height={400}
            />
          </ChartCard>
        </div>

        {/* User Engagement */}
        <div id="engagement">
          <ChartCard
            title="User Engagement Overview"
            subtitle="Daily active users and session metrics"
            loading={isLoading}
          >
            <AppStoreChart
              data={userEngagementMetrics}
              chartType="engagement"
              height={400}
            />
          </ChartCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;