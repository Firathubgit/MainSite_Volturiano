import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PenTool, Eye } from 'lucide-react';
import AdminLayout from '../../../../features/admin/components/AdminLayout/AdminLayout';
import { getVehicles } from '../../../../features/admin/api/adminService';
import styles from './VehicleList.module.css';

export default function VehicleList() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const data = await getVehicles();
        setVehicles(data);
      } catch (error) {
        console.error('[VehicleList] Error fetching vehicles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  return (
    <AdminLayout>
      <div className={styles.vehicleList}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Vehicles</h1>
            <p className={styles.subtitle}>Manage 3D assets, configuration manifests, and pricing.</p>
          </div>
          <button 
            className={styles.addButton}
            onClick={() => navigate('/admin/content/vehicles/create')}
          >
            <Plus size={16} className={styles.addButtonIcon} />
            Add Vehicle
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading vehicles...</div>
        ) : (
          <div className={styles.grid}>
            {vehicles.map((car) => (
              <div key={car.id} className={styles.card}>
                <div className={styles.imageContainer}>
                  <img 
                    src={car.thumbnail} 
                    alt={car.name} 
                    className={styles.image}
                  />
                  <div className={styles.statusBadge}>
                    <span className={`${styles.statusText} ${styles[`status${car.status.charAt(0).toUpperCase() + car.status.slice(1)}`]}`}>
                      {car.status}
                    </span>
                  </div>
                </div>
                
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.vehicleName}>{car.name}</h3>
                      <p className={styles.modelCode}>{car.modelCode}</p>
                    </div>
                  </div>
                  
                  <div className={styles.statsGrid}>
                    <div className={styles.stat}>
                      <p className={styles.statLabel}>Configs</p>
                      <p className={styles.statValue}>{car.configurationsCount}</p>
                    </div>
                    <div className={styles.stat}>
                      <p className={styles.statLabel}>Last Edit</p>
                      <p className={styles.statValueSmall}>{car.lastUpdated}</p>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button 
                      className={styles.editButton}
                      onClick={() => navigate(`/admin/content/vehicles/${car.id}`)}
                    >
                      <PenTool size={14} className={styles.editButtonIcon} />
                      Edit
                    </button>
                    <button className={styles.viewButton}>
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Placeholder for 'New' card */}
            <div 
              className={styles.newCard}
              onClick={() => navigate('/admin/content/vehicles/create')}
            >
              <div className={styles.newCardIcon}>
                <Plus size={32} />
              </div>
              <h3 className={styles.newCardTitle}>Create New Model</h3>
              <p className={styles.newCardSubtitle}>Import blender assets to start</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
