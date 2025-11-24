import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../../../stores/adminStore';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './AdminLayout.module.css';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminRole } = useAdminStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/account/login');
  };

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Users', icon: '👥', roles: ['support_admin', 'content_admin', 'super_admin'] },
    { path: '/admin/content', label: 'Content', icon: '📝', roles: ['content_admin', 'super_admin'] },
    { path: '/admin/manifests', label: 'Manifests', icon: '📋', roles: ['content_admin', 'super_admin'] },
    { path: '/admin/analytics', label: 'Analytics', icon: '📈', roles: ['support_admin', 'content_admin', 'super_admin'] },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️', roles: ['super_admin'] },
  ].filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(adminRole);
  });

  return (
    <div className={styles.adminLayout}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.logo}>VOLTURIANO</h2>
          <button
            className={styles.toggleButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
        <nav className={styles.nav}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <h1 className={styles.pageTitle}>Admin Dashboard</h1>
          </div>
          <div className={styles.topBarRight}>
            <div className={styles.userMenu}>
              <span className={styles.userRole}>{adminRole}</span>
              <button onClick={handleLogout} className={styles.logoutButton}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}

