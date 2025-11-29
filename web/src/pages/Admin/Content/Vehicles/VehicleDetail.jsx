import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../../features/admin/components/AdminLayout/AdminLayout';
import AdminCard from '../../../../features/admin/components/ui/AdminCard';
import AdminInput from '../../../../features/admin/components/ui/AdminInput';
import AdminSelect from '../../../../features/admin/components/ui/AdminSelect';
import AdminButton from '../../../../features/admin/components/ui/AdminButton';
import AdminModal from '../../../../features/admin/components/ui/AdminModal';
import { getVehicleById, updateVehicle, deleteVehicle } from '../../../../features/admin/api/content';
import styles from './VehicleDetail.module.css';

export default function VehicleDetail() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    trim: '',
    year: null,
    base_price_cents: 0,
    currency: 'EUR',
    hero_image_url: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVehicle();
  }, [vehicleId]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const data = await getVehicleById(vehicleId);
      setVehicle(data);
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        trim: data.trim || '',
        year: data.year || null,
        base_price_cents: data.base_price_cents || 0,
        currency: data.currency || 'EUR',
        hero_image_url: data.hero_image_url || ''
      });
    } catch (error) {
      console.error('[VehicleDetail] Error fetching vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateVehicle(vehicleId, formData);
      setEditing(false);
      fetchVehicle();
    } catch (error) {
      console.error('[VehicleDetail] Error updating vehicle:', error);
      alert('Failed to update vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVehicle(vehicleId);
      navigate('/admin/content/vehicles');
    } catch (error) {
      console.error('[VehicleDetail] Error deleting vehicle:', error);
      alert('Failed to delete vehicle');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.vehicleDetail}>
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!vehicle) {
    return (
      <AdminLayout>
        <div className={styles.vehicleDetail}>
          <p>Vehicle not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.vehicleDetail}>
        <div className={styles.header}>
          <AdminButton variant="secondary" onClick={() => navigate('/admin/content/vehicles')}>
            ← Back to Vehicles
          </AdminButton>
          {!editing && (
            <AdminButton onClick={() => setEditing(true)}>
              Edit Vehicle
            </AdminButton>
          )}
        </div>

        <AdminCard title="Vehicle Details">
          {editing ? (
            <div className={styles.form}>
              <AdminInput
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <AdminInput
                label="Slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
              <AdminInput
                label="Trim"
                value={formData.trim}
                onChange={(e) => setFormData({ ...formData, trim: e.target.value })}
              />
              <AdminInput
                label="Year"
                type="number"
                value={formData.year || ''}
                onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : null })}
              />
              <AdminInput
                label="Base Price (cents)"
                type="number"
                value={formData.base_price_cents}
                onChange={(e) => setFormData({ ...formData, base_price_cents: parseInt(e.target.value) || 0 })}
                required
              />
              <AdminSelect
                label="Currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                options={[
                  { value: 'EUR', label: 'EUR' },
                  { value: 'USD', label: 'USD' },
                  { value: 'SEK', label: 'SEK' }
                ]}
              />
              <AdminInput
                label="Hero Image URL"
                value={formData.hero_image_url}
                onChange={(e) => setFormData({ ...formData, hero_image_url: e.target.value })}
              />
              <div className={styles.formActions}>
                <AdminButton onClick={handleSave} loading={saving}>
                  Save Changes
                </AdminButton>
                <AdminButton variant="secondary" onClick={() => {
                  setEditing(false);
                  fetchVehicle();
                }}>
                  Cancel
                </AdminButton>
              </div>
            </div>
          ) : (
            <div className={styles.vehicleInfo}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Name:</span>
                <span className={styles.value}>{vehicle.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Slug:</span>
                <span className={styles.value}>{vehicle.slug}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Trim:</span>
                <span className={styles.value}>{vehicle.trim || 'N/A'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Year:</span>
                <span className={styles.value}>{vehicle.year || 'N/A'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Base Price:</span>
                <span className={styles.value}>
                  {vehicle.base_price_cents ? `${vehicle.currency} ${(vehicle.base_price_cents / 100).toLocaleString()}` : 'N/A'}
                </span>
              </div>
            </div>
          )}
        </AdminCard>

        <AdminCard title="Actions">
          <AdminButton variant="danger" onClick={() => setShowDeleteModal(true)}>
            Delete Vehicle
          </AdminButton>
        </AdminCard>

        <AdminModal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Vehicle"
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </AdminButton>
              <AdminButton variant="danger" onClick={handleDelete}>
                Delete
              </AdminButton>
            </>
          }
        >
          <p>Are you sure you want to delete this vehicle? This will also delete all associated options. This action cannot be undone.</p>
        </AdminModal>
      </div>
    </AdminLayout>
  );
}





















