import React from 'react';
import { Plus, Layout } from 'lucide-react';
import ProjectCard from './ProjectCard';
import styles from './DashboardComponents.module.css';

export default function ProjectGrid({ projects, onDelete, onCreateNew }) {
  if (!projects || projects.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Layout size={64} className={styles.emptyIcon} />
        <h3>No projects yet</h3>
        <p>Your AI-generated websites will appear here once you start building. Ready to create your first one?</p>
        <button 
          onClick={onCreateNew}
          style={{
            marginTop: '24px',
            padding: '12px 24px',
            background: 'white',
            color: 'black',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={18} />
          Create New Project
        </button>
      </div>
    );
  }

  return (
    <div className={styles.gridContainer}>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} onDelete={onDelete} />
      ))}
    </div>
  );
}
