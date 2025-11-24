import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Car, ShieldAlert, Settings, LogOut, FileText, Package, BarChart3, UserCog } from 'lucide-react';
import { useAdminStore } from '../../../../stores/adminStore';
import { useUserStore } from '../../../../stores/userStore';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './AdminLayout.module.css';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminRole } = useAdminStore();
  const { profile, session } = useUserStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/account/login');
  };

  const handleSettings = () => {
    navigate('/admin/settings');
  };

  const menuItems = [
    { path: '/admin', label: 'Overview', icon: LayoutDashboard, roles: ['support_admin', 'content_admin', 'super_admin'] },
    { path: '/admin/users', label: 'User Management', icon: Users, roles: ['support_admin', 'content_admin', 'super_admin'] },
    { path: '/admin/content/vehicles', label: 'Vehicles & Assets', icon: Car, roles: ['content_admin', 'super_admin'] },
    { path: '/admin/content/options', label: 'Vehicle Options', icon: Package, roles: ['content_admin', 'super_admin'] },
    { path: '/admin/manifests', label: 'Manifests', icon: FileText, roles: ['content_admin', 'super_admin'] },
    { path: '/admin/analytics/audit-logs', label: 'Audit Logs', icon: ShieldAlert, roles: ['support_admin', 'content_admin', 'super_admin'] },
    { path: '/admin/analytics/user-activity', label: 'User Activity', icon: BarChart3, roles: ['support_admin', 'content_admin', 'super_admin'] },
    { path: '/admin/settings/roles', label: 'Role Management', icon: UserCog, roles: ['super_admin'] },
  ].filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(adminRole);
  });

  const getRoleDisplayName = (role) => {
    const roleMap = {
      super_admin: 'Super Admin',
      content_admin: 'Content Admin',
      support_admin: 'Support Admin',
      user: 'User'
    };
    return roleMap[role] || 'User';
  };

  const getInitials = (email) => {
    if (!email) return 'AD';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        {/* Brand Header */}
        <div className={styles.brandHeader}>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <Icon className={styles.navIcon} size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User Profile */}
        <div className={styles.footer}>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>
              {getInitials(session?.user?.email || profile?.email || '')}
            </div>
            <div className={styles.userInfo}>
              <p className={styles.userRole}>{getRoleDisplayName(adminRole)}</p>
              <p className={styles.userEmail}>{session?.user?.email || profile?.email || 'admin@volturiano.com'}</p>
            </div>
          </div>
          <button onClick={handleSettings} className={styles.footerButton}>
            <Settings size={16} className={styles.footerButtonIcon} />
            Settings
          </button>
          <button onClick={handleLogout} className={`${styles.footerButton} ${styles.footerButtonDanger}`}>
            <LogOut size={16} className={styles.footerButtonIcon} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {children}
        </div>
      </main>
    </div>
  );
}
