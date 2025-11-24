import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOptions, getVehicles } from '../../../../features/admin/api/adminService';
import { Plus, Edit2 } from 'lucide-react';
import AdminLayout from '../../../../features/admin/components/AdminLayout/AdminLayout';
import AdminTable from '../../../../features/admin/components/ui/AdminTable';
import AdminButton from '../../../../features/admin/components/ui/AdminButton';
import AdminSearch from '../../../../features/admin/components/ui/AdminSearch';
import AdminSelect from '../../../../features/admin/components/ui/AdminSelect';
import AdminBadge from '../../../../features/admin/components/ui/AdminBadge';
import styles from './OptionList.module.css';

export default function OptionList() {
  const navigate = useNavigate();
  const [options, setOptions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [visibleFilter, setVisibleFilter] = useState('all');

  useEffect(() => {
    getVehicles().then(setVehicles).catch(() => setVehicles([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    getOptions({
      vehicleId: selectedVehicle === 'all' ? null : selectedVehicle,
      category: selectedCategory === 'all' ? null : selectedCategory,
      search: searchQuery || null,
      visible: visibleFilter === 'all' ? null : visibleFilter === 'visible'
    }).then(data => {
      // Filter out null/undefined and normalize data
      const normalizedData = (data || [])
        .filter(option => option != null)
        .map(option => ({
          ...option,
          code: option.code || '',
          label: option.label || '',
          category: option.category || 'other',
          currency: option.currency || 'EUR',
          priceCents: option.priceCents || 0,
          configuratorVisible: option.configuratorVisible !== undefined ? option.configuratorVisible : true
        }));
      setOptions(normalizedData);
      setLoading(false);
    }).catch((error) => {
      console.error('[OptionList] Error fetching options:', error);
      setOptions([]);
      setLoading(false);
    });
  }, [selectedVehicle, selectedCategory, searchQuery, visibleFilter]);

  const vehicleOptions = [
    { value: 'all', label: 'All Vehicles' },
    ...vehicles.map(v => ({ value: v.id, label: v.name }))
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'paint', label: 'Paint' },
    { value: 'wheels', label: 'Wheels' },
    { value: 'interior', label: 'Interior' },
    { value: 'accessories', label: 'Accessories' }
  ];

  const visibilityOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'visible', label: 'Visible' },
    { value: 'hidden', label: 'Hidden' }
  ];

  const columns = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (value, row) => {
        if (!row) return '-';
        return <span className={styles.code}>{row.code || value || '-'}</span>;
      }
    },
    {
      key: 'label',
      label: 'Label',
      sortable: true,
      render: (value, row) => {
        if (!row) return '-';
        return <span className={styles.label}>{row.label || value || '-'}</span>;
      }
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (value, row) => {
        if (!row) return '-';
        return <AdminBadge size="sm">{row.category || value || '-'}</AdminBadge>;
      }
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (value, row) => {
        if (!row) return '-';
        const currency = row.currency || 'EUR';
        const priceCents = row.priceCents || 0;
        return (
          <span className={styles.price}>
            {new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(priceCents / 100)}
          </span>
        );
      }
    },
    {
      key: 'visible',
      label: 'Visible',
      render: (value, row) => {
        if (!row) return '-';
        const isVisible = row.configuratorVisible !== undefined ? row.configuratorVisible : true;
        return (
          <AdminBadge variant={isVisible ? 'success' : 'warning'} size="sm">
            {isVisible ? 'YES' : 'NO'}
          </AdminBadge>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => {
        if (!row || !row.id) return '-';
        return (
          <div className={styles.actions}>
            <button 
              onClick={() => navigate(`/admin/content/options/${row.id}`)}
              className={styles.actionButton}
            >
              <Edit2 size={16} />
            </button>
          </div>
        );
      }
    }
  ];

  const currentVehicleName = selectedVehicle === 'all' 
    ? 'All Vehicles' 
    : vehicles.find(v => v.id === selectedVehicle)?.name || 'Unknown Vehicle';

  return (
    <AdminLayout>
      <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Vehicle Options</h1>
          <p className={styles.subtitle}>Manage configurable options for {currentVehicleName}.</p>
        </div>
        <div className={styles.vehicleSelect}>
          <AdminSelect 
            value={selectedVehicle}
            onChange={(val) => setSelectedVehicle(val)}
            options={vehicleOptions}
            placeholder="Select Vehicle"
          />
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.search}>
          <AdminSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by code or label..."
          />
        </div>
        <div className={styles.filterControls}>
          <div className={styles.filterSelect}>
            <AdminSelect
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={categoryOptions}
            />
          </div>
          <div className={styles.filterSelect}>
            <AdminSelect
              value={visibleFilter}
              onChange={(val) => setVisibleFilter(val)}
              options={visibilityOptions}
            />
          </div>
          <AdminButton variant="primary" icon={Plus} onClick={() => navigate('/admin/content/options/create')}>
            Create
          </AdminButton>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={options}
        loading={loading}
        pagination={{
          currentPage: 1,
          totalPages: 1,
          onPageChange: () => {},
          totalItems: options.length,
          pageSize: 50
        }}
      />
      </div>
    </AdminLayout>
  );
}

