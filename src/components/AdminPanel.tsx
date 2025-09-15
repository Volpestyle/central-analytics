/**
 * Admin Panel Component
 * Administrative interface for system management
 */

import React from 'react';
import { useAuthStore } from '@stores/authStore';

export const AdminPanel: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-warning/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="p-2 rounded-lg hover:bg-surface-light transition-colors"
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-text-primary">Admin Panel</h1>
              <span className="px-3 py-1 bg-warning/20 text-warning text-xs font-medium rounded-full">
                RESTRICTED ACCESS
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Info */}
        <div className="bg-surface rounded-xl p-6 mb-6 border border-warning/20">
          <div className="flex items-center space-x-3 mb-3">
            <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h2 className="text-lg font-medium text-text-primary">Administrator Access Granted</h2>
          </div>
          <p className="text-sm text-text-secondary">
            Logged in as: <span className="font-mono">{user?.email || 'Admin'}</span>
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            Apple ID: <span className="font-mono">{user?.appleUserSub}</span>
          </p>
        </div>

        {/* Admin Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Management */}
          <div className="bg-surface rounded-xl p-6 border border-surface-light hover:border-primary/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">User Management</h3>
            <p className="text-sm text-text-secondary mb-3">Manage user access and permissions</p>
            <p className="text-xs text-text-tertiary">23 active users</p>
          </div>

          {/* System Configuration */}
          <div className="bg-surface rounded-xl p-6 border border-surface-light hover:border-primary/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">System Configuration</h3>
            <p className="text-sm text-text-secondary mb-3">Configure API keys and services</p>
            <p className="text-xs text-text-tertiary">Last updated: 2 hours ago</p>
          </div>

          {/* Security Logs */}
          <div className="bg-surface rounded-xl p-6 border border-surface-light hover:border-primary/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">Security Logs</h3>
            <p className="text-sm text-text-secondary mb-3">View authentication and access logs</p>
            <p className="text-xs text-text-tertiary">142 events today</p>
          </div>

          {/* Cost Management */}
          <div className="bg-surface rounded-xl p-6 border border-surface-light hover:border-primary/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">Cost Management</h3>
            <p className="text-sm text-text-secondary mb-3">Set budgets and cost alerts</p>
            <p className="text-xs text-success">$2,458 MTD</p>
          </div>

          {/* API Keys */}
          <div className="bg-surface rounded-xl p-6 border border-surface-light hover:border-primary/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">API Keys</h3>
            <p className="text-sm text-text-secondary mb-3">Manage API keys and secrets</p>
            <p className="text-xs text-text-tertiary">3 active keys</p>
          </div>

          {/* Database */}
          <div className="bg-surface rounded-xl p-6 border border-surface-light hover:border-primary/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">Database</h3>
            <p className="text-sm text-text-secondary mb-3">Database operations and backups</p>
            <p className="text-xs text-text-tertiary">Last backup: 4 hours ago</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-surface rounded-xl p-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors">
              Clear Cache
            </button>
            <button className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors">
              Restart Services
            </button>
            <button className="px-4 py-2 bg-warning/20 text-warning rounded-lg text-sm font-medium hover:bg-warning/30 transition-colors">
              Export Logs
            </button>
            <button className="px-4 py-2 bg-error/20 text-error rounded-lg text-sm font-medium hover:bg-error/30 transition-colors">
              Emergency Shutdown
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};