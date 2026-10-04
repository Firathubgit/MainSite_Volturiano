import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProjectsPage.module.css';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not load projects.');
      setProjects(data.projects || []);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rename = async (project) => {
    const name = window.prompt('Project name', project.name || '');
    if (!name || name.trim() === project.name) return;
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) load();
  };

  const remove = async (project) => {
    if (!window.confirm(`Delete "${project.name || 'Untitled'}"? This removes its snapshots and chat history.`)) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
    if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== project.id));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Projects</h1>
        <button className={styles.primary} onClick={() => navigate('/')}>New site</button>
      </div>

      {status === 'loading' && <p className={styles.muted}>Loading projects...</p>}
      {status === 'error' && <p className={styles.error}>{error}</p>}
      {status === 'ready' && projects.length === 0 && (
        <p className={styles.muted}>No projects yet. Describe a website on the start page to create one.</p>
      )}

      <ul className={styles.list}>
        {projects.map((project) => (
          <li key={project.id} className={styles.row}>
            <button className={styles.open} onClick={() => navigate(`/generation?project=${project.id}`)}>
              {project.thumbnail_url
                ? <img src={project.thumbnail_url} alt="" className={styles.thumb} />
                : <span className={styles.thumbPlaceholder} />}
              <span className={styles.meta}>
                <span className={styles.name}>{project.name || 'Untitled'}</span>
                <span className={styles.date}>Updated {formatDate(project.updated_at)}</span>
              </span>
            </button>
            <div className={styles.actions}>
              <button onClick={() => rename(project)}>Rename</button>
              <button className={styles.danger} onClick={() => remove(project)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
