import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Edit2, Trash2, Globe, Clock, Layout, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import styles from './DashboardComponents.module.css';

export default function ProjectCard({ project, onDelete }) {
  const navigate = useNavigate();
  
  const handleEdit = () => {
    // Navigate to builder generation with projectId
    navigate(`/builder/generation?project=${project.id}`);
  };

  const handlePreview = () => {
    if (project.published_slug) {
      window.open(`/sites/${project.published_slug}/`, '_blank');
    } else {
      // Logic for previewing un-published site if available
      alert('This site has not been published to a permanent URL yet. Head over to the builder to see the live preview!');
    }
  };

  const status = project.build_status || 'preview';
  const updatedTime = project.updated_at 
    ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
    : 'Recently';

  const industry = project.industry || 'Modern Website';

  return (
    <div className={styles.card}>
      <div className={styles.thumbnailWrapper}>
        <div className={styles.abstractPattern} />
        <Layout size={48} color="rgba(255,255,255,0.1)" />
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 6 }}>
          <span className={`${styles.statusBadge} ${styles[`status-${status}`]}`}>
            {status}
          </span>
        </div>
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.projectHeader}>
          <h3 className={styles.projectName}>{project.name || 'Untitled Project'}</h3>
          <Globe size={14} color="rgba(255,255,255,0.2)" />
        </div>
        
        <p className={styles.lastUpdated}>
          <Clock size={12} style={{ marginRight: 4 }} />
          {updatedTime} • {industry}
        </p>

        <div className={styles.cardActions}>
          <button className={`${styles.actionButton} ${styles.btnPrimary}`} onClick={handleEdit}>
            <Edit2 size={14} />
            Edit Site
          </button>
          <button className={`${styles.actionButton} ${styles.btnSecondary}`} onClick={handlePreview}>
            <Play size={14} />
            Preview
          </button>
          <button 
            className={`${styles.actionButton} ${styles.btnDanger}`} 
            onClick={() => onDelete(project.id)}
            title="Delete Project"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
