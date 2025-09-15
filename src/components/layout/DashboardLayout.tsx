import React, { useState, useEffect } from 'react';
import { useMetricsStore } from '../../stores/metricsStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title = 'Central Analytics'
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { autoRefresh, refreshInterval, fetchAllMetrics, setAutoRefresh } = useMetricsStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAllMetrics();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchAllMetrics]);

  return (
    <div className="min-h-screen bg-background-base text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-base/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto-refresh toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-white/70">Auto-refresh</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  autoRefresh ? 'bg-accent-blue' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    autoRefresh ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => fetchAllMetrics()}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Refresh data"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        {!isMobile && (
          <aside className="w-64 min-h-[calc(100vh-4rem)] bg-background-surface border-r border-white/10">
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <a
                    href="#lambda"
                    className="block px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Lambda Metrics
                  </a>
                </li>
                <li>
                  <a
                    href="#costs"
                    className="block px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cost Analytics
                  </a>
                </li>
                <li>
                  <a
                    href="#appstore"
                    className="block px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    App Store Analytics
                  </a>
                </li>
                <li>
                  <a
                    href="#engagement"
                    className="block px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    User Engagement
                  </a>
                </li>
              </ul>
            </nav>
          </aside>
        )}

        {/* Sidebar - Mobile (Drawer) */}
        {isMobile && sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-16 bottom-0 w-64 bg-background-surface border-r border-white/10 z-50 animate-slide-in">
              <nav className="p-4">
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#lambda"
                      className="block px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Lambda Metrics
                    </a>
                  </li>
                  <li>
                    <a
                      href="#costs"
                      className="block px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Cost Analytics
                    </a>
                  </li>
                  <li>
                    <a
                      href="#appstore"
                      className="block px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      App Store Analytics
                    </a>
                  </li>
                  <li>
                    <a
                      href="#engagement"
                      className="block px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      User Engagement
                    </a>
                  </li>
                </ul>
              </nav>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;