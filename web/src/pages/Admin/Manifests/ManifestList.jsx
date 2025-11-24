import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminTable from '../../../features/admin/components/ui/AdminTable';
import AdminSearch from '../../../features/admin/components/ui/AdminSearch';
import AdminSelect from '../../../features/admin/components/ui/AdminSelect';
import AdminButton from '../../../features/admin/components/ui/AdminButton';
import AdminBadge from '../../../features/admin/components/ui/AdminBadge';
import AdminPagination from '../../../features/admin/components/ui/AdminPagination';
import AdminModal from '../../../features/admin/components/ui/AdminModal';
import { getManifests, publishManifest, archiveManifest } from '../../../features/admin/api/manifests';
import styles from './ManifestList.module.css';

export default function ManifestList() {
  const navigate = useNavigate();
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 50
  });
  const [totalCount, setTotalCount] = useState(0);
  const [publishingId, setPublishingId] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState(null);

  useEffect(() => {
    fetchManifests();
  }, [filters]);

  const fetchManifests = async () => {
    try {
      setLoading(true);
      const { data, count } = await getManifests(filters);
      // Filter out null/undefined and ensure all manifests have required fields with defaults
      const normalizedData = (data || [])
        .filter(manifest => manifest != null) // Remove null/undefined items
        .map(manifest => ({
          ...manifest,
          status: manifest.status || 'draft',
          version: manifest.version || 1,
          slug: manifest.slug || manifest.id || 'unknown',
          created_at: manifest.created_at || new Date().toISOString()
        }));
      setManifests(normalizedData);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('[ManifestList] Error fetching manifests:', error);
      setManifests([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedManifest) return;

    try {
      setPublishingId(selectedManifest.id);
      await publishManifest(selectedManifest.id);
      setShowPublishModal(false);
      setSelectedManifest(null);
      fetchManifests();
    } catch (error) {
      console.error('[ManifestList] Error publishing manifest:', error);
      alert('Failed to publish manifest: ' + (error.message || 'Unknown error'));
    } finally {
      setPublishingId(null);
    }
  };

  const handleArchive = async (manifestId) => {
    if (!confirm('Are you sure you want to archive this manifest?')) return;

    try {
      await archiveManifest(manifestId);
      fetchManifests();
    } catch (error) {
      console.error('[ManifestList] Error archiving manifest:', error);
      alert('Failed to archive manifest');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'warning',
      published: 'success',
      archived: 'default'
    };
    return <AdminBadge variant={variants[status] || 'default'}>{status}</AdminBadge>;
  };

  const columns = [
    {
      key: 'slug',
      label: 'Slug',
      render: (value, row) => value || row?.id || 'unknown'
    },
    {
      key: 'data',
      label: 'Vehicle Model',
      render: (value) => value?.vehicleModel || 'N/A'
    },
    {
      key: 'version',
      label: 'Version',
      render: (value) => `v${value || 1}`
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStatusBadge(value || 'draft')
    },
    {
      key: 'created_at',
      label: 'Created At',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value, row) => {
        // Defensive check for row existence
        if (!row || !value) {
          return <div className={styles.actions}>-</div>;
        }
        
        const status = row.status || 'draft';
        
        return (
          <div className={styles.actions}>
            <AdminButton
              size="small"
              onClick={() => navigate(`/admin/manifests/${value}/edit`)}
            >
              Edit
            </AdminButton>
            {status === 'draft' && (
              <AdminButton
                size="small"
                variant="primary"
                onClick={() => {
                  setSelectedManifest(row);
                  setShowPublishModal(true);
                }}
              >
                Publish
              </AdminButton>
            )}
            {status === 'published' && (
              <AdminButton
                size="small"
                variant="secondary"
                onClick={() => handleArchive(value)}
              >
                Archive
              </AdminButton>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <AdminLayout>
      <div className={styles.manifestList}>
        <div className={styles.header}>
          <h1 className={styles.title}>Manifest Management</h1>
          <AdminButton onClick={() => navigate('/admin/manifests/create')}>
            Create Manifest
          </AdminButton>
        </div>

        <div className={styles.filters}>
          <AdminSearch
            placeholder="Search by slug..."
            value={filters.search}
            onChange={(search) => setFilters(prev => ({ ...prev, search, page: 1 }))}
            className={styles.search}
          />
          <AdminSelect
            label="Filter by Status"
            value={filters.status || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || null, page: 1 }))}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' }
            ]}
            className={styles.statusFilter}
          />
        </div>

        <AdminTable
          columns={columns}
          data={manifests}
          loading={loading}
          emptyMessage="No manifests found"
        />

        <AdminPagination
          currentPage={filters.page}
          totalPages={Math.ceil(totalCount / filters.limit)}
          onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
          pageSize={filters.limit}
          onPageSizeChange={(limit) => setFilters(prev => ({ ...prev, limit, page: 1 }))}
          totalItems={totalCount}
        />

        <AdminModal
          open={showPublishModal}
          onClose={() => {
            setShowPublishModal(false);
            setSelectedManifest(null);
          }}
          title="Publish Manifest"
          footer={
            <>
              <AdminButton
                variant="secondary"
                onClick={() => {
                  setShowPublishModal(false);
                  setSelectedManifest(null);
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton
                onClick={handlePublish}
                loading={publishingId === selectedManifest?.id}
              >
                Publish
              </AdminButton>
            </>
          }
        >
          <p>Are you sure you want to publish this manifest? This will make it available to users.</p>
          {selectedManifest && (
            <div className={styles.publishInfo}>
              <p><strong>Slug:</strong> {selectedManifest.slug}</p>
              <p><strong>Current Version:</strong> {selectedManifest.version}</p>
              <p><strong>New Version:</strong> {selectedManifest.version + 1}</p>
            </div>
          )}
        </AdminModal>
      </div>
    </AdminLayout>
  );
}






