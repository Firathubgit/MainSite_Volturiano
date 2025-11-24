import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminButton from '../../../features/admin/components/ui/AdminButton';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeConfigurations: 0,
    publishedManifests: 0,
    recentActivity: [],
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total users count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch active configurations count
        const { count: configsCount } = await supabase
          .from('garage_items')
          .select('*', { count: 'exact', head: true });

        // Fetch published manifests count
        const { count: manifestsCount } = await supabase
          .from('config_2d_manifests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published');

        // Fetch recent activity
        const { data: recentActivity } = await supabase
          .from('admin_audit_logs')
          .select('*, profiles!admin_audit_logs_admin_id_fkey(display_name)')
          .order('created_at', { ascending: false })
          .limit(10);

        setStats({
          totalUsers: usersCount || 0,
          activeConfigurations: configsCount || 0,
          publishedManifests: manifestsCount || 0,
          recentActivity: recentActivity || [],
          loading: false
        });
      } catch (error) {
        console.error('[Dashboard] Error fetching stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (stats.loading) {
    return (
      <AdminLayout>
        <div className={styles.dashboard}>
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.dashboard}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.totalUsers}</h3>
              <p className={styles.statLabel}>Total Users</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🚗</div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.activeConfigurations}</h3>
              <p className={styles.statLabel}>Active Configurations</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📋</div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.publishedManifests}</h3>
              <p className={styles.statLabel}>Published Manifests</p>
            </div>
          </div>
        </div>

        <div className={styles.quickActions}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.actionsGrid}>
            <AdminButton
              variant="secondary"
              onClick={() => navigate('/admin/users/create')}
              className={styles.actionButton}
            >
              <span className={styles.actionIcon}>➕</span>
              <span className={styles.actionLabel}>Create User</span>
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => navigate('/admin/manifests')}
              className={styles.actionButton}
            >
              <span className={styles.actionIcon}>📋</span>
              <span className={styles.actionLabel}>Manage Manifests</span>
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => navigate('/admin/content/vehicles')}
              className={styles.actionButton}
            >
              <span className={styles.actionIcon}>🚗</span>
              <span className={styles.actionLabel}>Manage Vehicles</span>
            </AdminButton>
          </div>
        </div>

        <div className={styles.recentActivity}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <div className={styles.activityList}>
            {stats.recentActivity.length === 0 ? (
              <p className={styles.emptyState}>No recent activity</p>
            ) : (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>📝</div>
                  <div className={styles.activityContent}>
                    <p className={styles.activityAction}>{activity.action}</p>
                    <p className={styles.activityResource}>
                      {activity.resource_type} {activity.resource_id ? `#${activity.resource_id.substring(0, 8)}` : ''}
                    </p>
                  </div>
                  <div className={styles.activityTime}>
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

