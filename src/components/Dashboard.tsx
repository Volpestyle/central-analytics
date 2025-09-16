import React, { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { KPICard } from "./charts/KPICard";
import { ChartContainer } from "./charts/ChartContainer";
import ReactECharts from "echarts-for-react";
import { darkTheme, getResponsiveOptions } from "../utils/chartTheme";
import type { User } from "../types/auth";

interface DashboardProps {
  user?: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const { isAuthenticated, user: authUser } = useAuthStore();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const lambdaMetricsOption = {
    ...darkTheme,
    ...getResponsiveOptions(windowWidth),
    title: {
      text: "Lambda Invocations",
      textStyle: { color: "#ffffff", fontSize: 16 },
    },
    xAxis: {
      type: "category",
      data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      axisLabel: { color: "#999999" },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#999999" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
    },
    series: [
      {
        name: "Invocations",
        type: "bar",
        data: [120, 200, 150, 80, 70, 110, 130],
        itemStyle: { color: "#0A84FF" },
      },
    ],
  };

  const costTrendOption = {
    ...darkTheme,
    ...getResponsiveOptions(windowWidth),
    title: {
      text: "AWS Cost Trend",
      textStyle: { color: "#ffffff", fontSize: 16 },
    },
    xAxis: {
      type: "category",
      data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      axisLabel: { color: "#999999" },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "#999999",
        formatter: "${value}",
      },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
    },
    series: [
      {
        name: "Cost",
        type: "line",
        smooth: true,
        data: [820, 932, 901, 934, 1290, 1330],
        itemStyle: { color: "#32D74B" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(50, 215, 75, 0.3)" },
              { offset: 1, color: "rgba(50, 215, 75, 0.05)" },
            ],
          },
        },
      },
    ],
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">
          Please sign in to view the dashboard
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-gray-400">Monitoring ilikeyacut iOS app</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Lambda Invocations"
            value="1,234"
            change={12.5}
            sparklineData={[100, 120, 115, 134, 168, 132, 150]}
            color="#0A84FF"
          />
          <KPICard
            title="API Requests"
            value="5.2K"
            change={-3.2}
            sparklineData={[200, 180, 190, 170, 160, 180, 175]}
            color="#FFD60A"
          />
          <KPICard
            title="Error Rate"
            value="0.12%"
            change={-25.0}
            sparklineData={[0.2, 0.18, 0.15, 0.14, 0.13, 0.12, 0.12]}
            color="#32D74B"
          />
          <KPICard
            title="Monthly Cost"
            value="$1,330"
            change={3.4}
            sparklineData={[1200, 1250, 1280, 1290, 1310, 1320, 1330]}
            color="#BF5AF2"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartContainer
            title="Lambda Function Metrics"
            subtitle="Last 7 days"
          >
            <div className="h-80">
              <ReactECharts
                option={lambdaMetricsOption}
                theme="dark"
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          </ChartContainer>

          <ChartContainer title="Cost Analysis" subtitle="Monthly trend">
            <div className="h-80">
              <ReactECharts
                option={costTrendOption}
                theme="dark"
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-3">
              App Store Metrics
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Downloads Today</span>
                <span className="text-white font-medium">142</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Users</span>
                <span className="text-white font-medium">3,521</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Revenue (24h)</span>
                <span className="text-green-400 font-medium">$458</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-3">
              DynamoDB Status
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Read Capacity</span>
                <span className="text-white font-medium">45%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Write Capacity</span>
                <span className="text-white font-medium">62%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Storage Used</span>
                <span className="text-white font-medium">1.2 GB</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-3">
              System Health
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">API Gateway</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-green-400"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Lambda Functions</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-green-400"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">CloudFront CDN</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-green-400"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
