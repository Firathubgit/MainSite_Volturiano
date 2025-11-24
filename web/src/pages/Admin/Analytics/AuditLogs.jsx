import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminTable from '../../../features/admin/components/ui/AdminTable';
import AdminSelect from '../../../features/admin/components/ui/AdminSelect';
import AdminPagination from '../../../features/admin/components/ui/AdminPagination';
import { getAuditLogs } from '../../../features/admin/api/analytics';
import styles from './AuditLogs.module.css';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    page: 1,
    limit: 100
  });
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, count } = await getAuditLogs(filters);
      setLogs(data);
      setTotalCount(count);
    } catch (error) {
      console.error('[AuditLogs] Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (value) => value ? new Date(value).toLocaleString() : 'N/A'
    },
    {
      key: 'profiles',
      label: 'Admin',
      render: (value) => value?.display_name || value?.email || 'N/A'
    },
    {
      key: 'action',
      label: 'Action'
    },
    {
      key: 'resource_type',
      label: 'Resource Type'
    },
    {
      key: 'resource_id',
      label: 'Resource ID',
      render: (value) => value ? value.substring(0, 8) + '...' : 'N/A'
    },
    {
      key: 'details',
      label: 'Details',
      render: (value) => value ? JSON.stringify(value).substring(0, 50) + '...' : 'N/A'
    }
  ];

  return (
    <AdminLayout>
      <div className={styles.auditLogs}>
        <h1 className={styles.title}>Audit Logs</h1>

        <div className={styles.filters}>
          <AdminSelect
            label="Filter by Action"
            value={filters.action || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value || null, page: 1 }))}
            options={[
              { value: '', label: 'All Actions' },
              { value: 'user_created', label: 'User Created' },
              { value: 'user_updated', label: 'User Updated' },
              { value: 'manifest_published', label: 'Manifest Published' },
              { value: 'vehicle_created', label: 'Vehicle Created' }
            ]}
          />
          <AdminSelect
            label="Filter by Resource Type"
            value={filters.resourceType || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, resourceType: e.target.value || null, page: 1 }))}
            options={[
              { value: '', label: 'All Types' },
              { value: 'user', label: 'User' },
              { value: 'manifest', label: 'Manifest' },
              { value: 'vehicle', label: 'Vehicle' }
            ]}
          />
        </div>

        <AdminTable
          columns={columns}
          data={logs}
          loading={loading}
          emptyMessage="No audit logs found"
        />

        <AdminPagination
          currentPage={filters.page}
          totalPages={Math.ceil(totalCount / filters.limit)}
          onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
          pageSize={filters.limit}
          onPageSizeChange={(limit) => setFilters(prev => ({ ...prev, limit, page: 1 }))}
          totalItems={totalCount}
        />
      </div>
    </AdminLayout>
  );
}



