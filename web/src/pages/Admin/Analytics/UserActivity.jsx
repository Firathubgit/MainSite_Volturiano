import React, { useEffect, useState } from 'react';
import { getAnalyticsData } from '../../../features/admin/api/adminService';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminLoading from '../../../features/admin/components/ui/AdminLoading';
import AdminSelect from '../../../features/admin/components/ui/AdminSelect';
import AdminButton from '../../../features/admin/components/ui/AdminButton';
import { Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import styles from './UserActivity.module.css';

const COLORS = ['#ff4520', '#00C49F', '#FFBB28', '#FF8042'];

export default function UserActivity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    setLoading(true);
    getAnalyticsData({ timeRange }).then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => {
      setData({
        dailyActivity: [],
        signupTrends: [],
        featureUsage: [],
        topUsers: []
      });
      setLoading(false);
    });
  }, [timeRange]);

  if (loading || !data) {
    return (
      <AdminLayout>
        <AdminLoading fullScreen />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>User Activity</h1>
          <p className={styles.subtitle}>Platform usage metrics and engagement reports.</p>
        </div>
        <div className={styles.controls}>
          <div className={styles.timeRangeSelect}>
            <AdminSelect 
              value={timeRange} 
              onChange={(val) => setTimeRange(val)}
              options={[
                {value: '7d', label: 'Last 7 Days'},
                {value: '30d', label: 'Last 30 Days'},
                {value: '90d', label: 'Last 90 Days'},
              ]}
            />
          </div>
          <AdminButton variant="secondary" icon={Download}>Export CSV</AdminButton>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Daily Activity</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#666" tick={{fill: '#666', fontSize: 12}} />
                <YAxis stroke="#666" tick={{fill: '#666', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', color: '#fff' }}
                  cursor={{fill: '#ffffff10'}}
                />
                <Bar dataKey="count" fill="#ff4520" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Feature Usage</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.featureUsage || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(data.featureUsage || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.legend}>
            {(data.featureUsage || []).map((entry, index) => (
              <div key={entry.name} className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className={styles.legendLabel}>{entry.name}</span>
                <span className={styles.legendValue}>{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.secondaryRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Sign-up Trends</h3>
          <div className={styles.chartContainerSmall}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.signupTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#666" tick={{fill: '#666', fontSize: 12}} />
                <YAxis stroke="#666" tick={{fill: '#666', fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', color: '#fff' }} />
                <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Most Active Users</h3>
          <div className={styles.usersList}>
            {(data.topUsers || []).map((user, i) => (
              <div key={i} className={styles.userCard}>
                <div className={styles.userInfo}>
                  <div className={styles.userRank}>{i + 1}</div>
                  <div>
                    <div className={styles.userEmail}>{user.email}</div>
                    <div className={styles.userLastActive}>Last active: {user.lastActive}</div>
                  </div>
                </div>
                <div className={styles.userStats}>
                  <div className={styles.userCount}>{user.count}</div>
                  <div className={styles.userLabel}>Actions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

