import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminCard from '../../../features/admin/components/ui/AdminCard';
import { getUserMetrics, getConfigurationMetrics } from '../../../features/admin/api/analytics';
import styles from './AnalyticsDashboard.module.css';

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalConfigurations: 0,
    loading: true
  });
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      setMetrics(prev => ({ ...prev, loading: true }));
      const [userMetrics, configMetrics] = await Promise.all([
        getUserMetrics(dateRange),
        getConfigurationMetrics(dateRange)
      ]);
      setMetrics({
        totalUsers: userMetrics.totalUsers,
        totalConfigurations: configMetrics.totalConfigurations,
        loading: false
      });
    } catch (error) {
      console.error('[AnalyticsDashboard] Error fetching metrics:', error);
      setMetrics(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <AdminLayout>
      <div className={styles.analytics}>
        <h1 className={styles.title}>Analytics Dashboard</h1>

        <div className={styles.metricsGrid}>
          <AdminCard title="Total Users">
            <div className={styles.metricValue}>
              {metrics.loading ? 'Loading...' : metrics.totalUsers.toLocaleString()}
            </div>
          </AdminCard>

          <AdminCard title="Total Configurations">
            <div className={styles.metricValue}>
              {metrics.loading ? 'Loading...' : metrics.totalConfigurations.toLocaleString()}
            </div>
          </AdminCard>
        </div>

        <AdminCard title="Date Range Filter">
          <div className={styles.dateFilters}>
            <input
              type="date"
              className={styles.dateInput}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value || null }))}
            />
            <span>to</span>
            <input
              type="date"
              className={styles.dateInput}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value || null }))}
            />
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}

























