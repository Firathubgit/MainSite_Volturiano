import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../../features/admin/components/AdminLayout/AdminLayout';
import AdminTable from '../../../../features/admin/components/ui/AdminTable';
import AdminSearch from '../../../../features/admin/components/ui/AdminSearch';
import AdminButton from '../../../../features/admin/components/ui/AdminButton';
import AdminPagination from '../../../../features/admin/components/ui/AdminPagination';
import { getVehicles } from '../../../../features/admin/api/content';
import styles from './VehicleList.module.css';

export default function VehicleList() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 50,
    sortColumn: 'created_at',
    sortDirection: 'desc'
  });
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchVehicles();
  }, [filters]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, count } = await getVehicles(filters);
      setVehicles(data);
      setTotalCount(count);
    } catch (error) {
      console.error('[VehicleList] Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true
    },
    {
      key: 'slug',
      label: 'Slug',
      sortable: true
    },
    {
      key: 'trim',
      label: 'Trim'
    },
    {
      key: 'year',
      label: 'Year',
      sortable: true
    },
    {
      key: 'base_price_cents',
      label: 'Base Price',
      render: (value) => value ? `€${(value / 100).toLocaleString()}` : 'N/A'
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value) => (
        <AdminButton
          size="small"
          onClick={() => navigate(`/admin/content/vehicles/${value}`)}
        >
          View
        </AdminButton>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className={styles.vehicleList}>
        <div className={styles.header}>
          <h1 className={styles.title}>Vehicle Management</h1>
          <AdminButton onClick={() => navigate('/admin/content/vehicles/create')}>
            Add Vehicle
          </AdminButton>
        </div>

        <div className={styles.filters}>
          <AdminSearch
            placeholder="Search vehicles..."
            value={filters.search}
            onChange={(search) => setFilters(prev => ({ ...prev, search, page: 1 }))}
          />
        </div>

        <AdminTable
          columns={columns}
          data={vehicles}
          loading={loading}
          emptyMessage="No vehicles found"
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



