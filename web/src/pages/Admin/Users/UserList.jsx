import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MoreHorizontal, ShieldCheck, Shield, User as UserIcon } from 'lucide-react';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import { getUsers } from '../../../features/admin/api/adminService';
import styles from './UserList.module.css';

export default function UserList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        setUsers(data);
      } catch (error) {
        console.error('[UserList] Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className={styles.roleBadge}>
            <ShieldCheck size={14} className={styles.roleIcon} />
            Super Admin
          </span>
        );
      case 'content_admin':
        return (
          <span className={`${styles.roleBadge} ${styles.roleBadgePurple}`}>
            <Shield size={14} className={styles.roleIcon} />
            Content
          </span>
        );
      case 'support_admin':
        return (
          <span className={`${styles.roleBadge} ${styles.roleBadgeBlue}`}>
            <Shield size={14} className={styles.roleIcon} />
            Support
          </span>
        );
      default:
        return (
          <span className={`${styles.roleBadge} ${styles.roleBadgeDefault}`}>
            <UserIcon size={14} className={styles.roleIcon} />
            User
          </span>
        );
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (email) => {
    if (!email) return 'AD';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <AdminLayout>
      <div className={styles.userList}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Users</h1>
            <p className={styles.subtitle}>Manage access and role-based permissions.</p>
          </div>
          <button 
            className={styles.inviteButton}
            onClick={() => navigate('/admin/users/create')}
          >
            Invite Admin
          </button>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} size={18} />
            <input 
              type="text" 
              placeholder="Search by email..." 
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className={styles.filterButton}>
            <Filter size={18} className={styles.filterIcon} />
            Filter
          </button>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className={styles.loading}>Loading users...</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>User Identity</th>
                  <th className={styles.th}>Role</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Last Active</th>
                  <th className={`${styles.th} ${styles.thActions}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.userIdentity}>
                        <div className={styles.avatar}>
                          {getInitials(user.email)}
                        </div>
                        <div>
                          <div className={styles.userEmail}>{user.email}</div>
                          <div className={styles.userId}>ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      {getRoleBadge(user.role)}
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.statusBadge} ${user.status === 'active' ? styles.statusActive : styles.statusSuspended}`}>
                        {user.status.toUpperCase()}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.lastActive}>{user.lastActive}</span>
                    </td>
                    <td className={`${styles.td} ${styles.tdActions}`}>
                      <button 
                        className={styles.actionButton}
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className={styles.emptyState}>No users found matching your search.</div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
