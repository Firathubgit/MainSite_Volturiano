import React, { useEffect, useState } from 'react';
import StatCard from '../../../features/admin/components/ui/StatCard';
import { getStats } from '../../../features/admin/api/adminService';
import { Users, Box, Banknote, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import styles from './Dashboard.module.css';

// Mock chart data - can be replaced with real data later
const CHART_DATA = [
  { name: 'Mon', configs: 140, users: 240 },
  { name: 'Tue', configs: 230, users: 139 },
  { name: 'Wed', configs: 200, users: 380 },
  { name: 'Thu', configs: 278, users: 390 },
  { name: 'Fri', configs: 189, users: 480 },
  { name: 'Sat', configs: 339, users: 380 },
  { name: 'Sun', configs: 349, users: 430 },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStats();
        setStats(data);
      } catch (error) {
        console.error('[Dashboard] Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <AdminLayout>
        <div className={styles.loading}>Loading metrics...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>Platform overview and performance metrics.</p>
          </div>
          <div className={styles.statusBadge}>
            <div className={styles.statusDot}></div>
            System Operational
          </div>
        </div>

        {/* KPI Grid */}
        <div className={styles.statsGrid}>
          <StatCard 
            label="Total Users" 
            value={stats.totalUsers.toLocaleString()} 
            trend={12.5} 
            icon={Users} 
          />
          <StatCard 
            label="Active Configs" 
            value={stats.activeConfigurations.toLocaleString()} 
            trend={8.2} 
            icon={Box} 
          />
          <StatCard 
            label="Monthly Revenue" 
            value={`€${(stats.totalRevenue / 1000).toFixed(1)}k`} 
            trend={-2.4} 
            icon={Banknote} 
          />
          <StatCard 
            label="Server Load" 
            value={`${stats.serverLoad}%`} 
            trend={0.5} 
            icon={Activity} 
          />
        </div>

        {/* Charts Area */}
        <div className={styles.chartsArea}>
          {/* Main Activity Chart */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Configuration Activity</h3>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_DATA}>
                  <defs>
                    <linearGradient id="colorConfigs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4520" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ff4520" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontSize: 12}} />
                  <YAxis stroke="#666" tick={{fill: '#666', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="configs" 
                    stroke="#ff4520" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorConfigs)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Health */}
          <div className={styles.healthCard}>
            <h3 className={styles.healthTitle}>System Health</h3>
            <div className={styles.healthList}>
              <div className={styles.healthItem}>
                <div className={styles.healthHeader}>
                  <span className={styles.healthLabel}>Database (Supabase)</span>
                  <span className={styles.healthStatus}>HEALTHY</span>
                </div>
                <div className={styles.healthBar}>
                  <div className={`${styles.healthBarFill} ${styles.healthBarSuccess}`} style={{ width: '98%' }}></div>
                </div>
              </div>
              
              <div className={styles.healthItem}>
                <div className={styles.healthHeader}>
                  <span className={styles.healthLabel}>Edge Functions</span>
                  <span className={styles.healthStatus}>99.9% UPTIME</span>
                </div>
                <div className={styles.healthBar}>
                  <div className={`${styles.healthBarFill} ${styles.healthBarSuccess}`} style={{ width: '99%' }}></div>
                </div>
              </div>

              <div className={styles.healthItem}>
                <div className={styles.healthHeader}>
                  <span className={styles.healthLabel}>3D Asset CDN</span>
                  <span className={`${styles.healthStatus} ${styles.healthStatusWarning}`}>HIGH LATENCY</span>
                </div>
                <div className={styles.healthBar}>
                  <div className={`${styles.healthBarFill} ${styles.healthBarWarning}`} style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>

            <div className={styles.healthFooter}>
              <button className={styles.reportButton}>
                View Detailed Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
