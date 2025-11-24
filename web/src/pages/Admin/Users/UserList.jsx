import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminTable from '../../../features/admin/components/ui/AdminTable';
import AdminSearch from '../../../features/admin/components/ui/AdminSearch';
import AdminSelect from '../../../features/admin/components/ui/AdminSelect';
import AdminButton from '../../../features/admin/components/ui/AdminButton';
import AdminPagination from '../../../features/admin/components/ui/AdminPagination';
import AdminBadge from '../../../features/admin/components/ui/AdminBadge';
import { getUsers, bulkUpdateUserRoles, exportUsersToCSV } from '../../../features/admin/api/users';
import styles from './UserList.module.css';

export default function UserList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    page: 1,
    limit: 50,
    sortColumn: 'created_at',
    sortDirection: 'desc'
  });
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, count } = await getUsers(filters);
      setUsers(data);
      setTotalCount(count);
    } catch (error) {
      console.error('[UserList] Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (search) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handleRoleFilter = (e) => {
    setFilters(prev => ({ ...prev, role: e.target.value || null, page: 1 }));
  };

  const handleSort = (column, direction) => {
    setFilters(prev => ({ ...prev, sortColumn: column, sortDirection: direction }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (limit) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  };

  const handleBulkRoleUpdate = async (role) => {
    if (selectedRows.length === 0) return;
    
    const userIds = selectedRows.map(index => users[index].id);
    try {
      await bulkUpdateUserRoles(userIds, role);
      setSelectedRows([]);
      fetchUsers();
    } catch (error) {
      console.error('[UserList] Error updating roles:', error);
      alert('Failed to update user roles');
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await exportUsersToCSV(filters);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[UserList] Error exporting CSV:', error);
      alert('Failed to export users');
    }
  };

  const columns = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (value) => value || 'N/A'
    },
    {
      key: 'display_name',
      label: 'Display Name',
      sortable: true,
      render: (value) => value || 'N/A'
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value) => {
        const roleColors = {
          super_admin: 'error',
          content_admin: 'warning',
          support_admin: 'info',
          user: 'default'
        };
        return (
          <AdminBadge variant={roleColors[value] || 'default'}>
            {value || 'user'}
          </AdminBadge>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Created At',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value, row) => (
        <AdminButton
          size="small"
          onClick={() => navigate(`/admin/users/${value}`)}
        >
          View
        </AdminButton>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className={styles.userList}>
        <div className={styles.header}>
          <h1 className={styles.title}>User Management</h1>
          <AdminButton onClick={() => navigate('/admin/users/create')}>
            Create User
          </AdminButton>
        </div>

        <div className={styles.filters}>
          <AdminSearch
            placeholder="Search by email or name..."
            value={filters.search}
            onChange={handleSearch}
            className={styles.search}
          />
          <AdminSelect
            label="Filter by Role"
            value={filters.role || ''}
            onChange={handleRoleFilter}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'user', label: 'User' },
              { value: 'support_admin', label: 'Support Admin' },
              { value: 'content_admin', label: 'Content Admin' },
              { value: 'super_admin', label: 'Super Admin' }
            ]}
            className={styles.roleFilter}
          />
        </div>

        {selectedRows.length > 0 && (
          <div className={styles.bulkActions}>
            <span className={styles.selectedCount}>
              {selectedRows.length} selected
            </span>
            <AdminSelect
              value=""
              onChange={(e) => e.target.value && handleBulkRoleUpdate(e.target.value)}
              options={[
                { value: '', label: 'Bulk Role Update' },
                { value: 'user', label: 'Set to User' },
                { value: 'support_admin', label: 'Set to Support Admin' },
                { value: 'content_admin', label: 'Set to Content Admin' }
              ]}
            />
            <AdminButton variant="danger" onClick={() => setSelectedRows([])}>
              Clear Selection
            </AdminButton>
          </div>
        )}

        <div className={styles.actions}>
          <AdminButton variant="secondary" onClick={handleExportCSV}>
            Export CSV
          </AdminButton>
        </div>

        <AdminTable
          columns={columns}
          data={users}
          loading={loading}
          onSort={handleSort}
          sortColumn={filters.sortColumn}
          sortDirection={filters.sortDirection}
          onRowSelect={setSelectedRows}
          selectedRows={selectedRows}
          emptyMessage="No users found"
        />

        <AdminPagination
          currentPage={filters.page}
          totalPages={Math.ceil(totalCount / filters.limit)}
          onPageChange={handlePageChange}
          pageSize={filters.limit}
          onPageSizeChange={handlePageSizeChange}
          totalItems={totalCount}
        />
      </div>
    </AdminLayout>
  );
}



