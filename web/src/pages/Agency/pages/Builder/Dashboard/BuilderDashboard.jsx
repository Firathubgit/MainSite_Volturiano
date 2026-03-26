import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Layout, 
  Globe, 
  CreditCard, 
  Settings, 
  Plus, 
  User, 
  LogOut, 
  Activity, 
  ChevronRight, 
  PieChart, 
  Zap, 
  ExternalLink, 
  Trash2, 
  Loader2Icon, 
  SaveIcon, 
  CameraIcon, 
  ArrowLeftIcon,
  Heart
} from 'lucide-react';
import { useBuilderAuth } from '../../../../../contexts/BuilderAuthContext';
import { builderSupabase } from '../../../../../lib/builderSupabaseClient';
import ProjectGrid from './components/ProjectGrid';
import CongratsModal from './components/CongratsModal';
import styles from './BuilderDashboard.module.css';

// ─── TABS ───────────────────────────────────
const TABS = [
  { id: 'websites', label: 'My Websites', icon: Layout },
  { id: 'liked', label: 'Liked Components', icon: Heart },
  { id: 'published', label: 'Published Sites', icon: Globe },
  { id: 'billing', label: 'Credits & Billing', icon: CreditCard },
  { id: 'settings', label: 'Account Settings', icon: Settings },
];

export default function BuilderDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'websites';
  const { user, profile, signOut, loading: authLoading } = useBuilderAuth();
  const [projects, setProjects] = useState([]);
  const [publishedSites, setPublishedSites] = useState([]);
  const [stats, setStats] = useState({ totalProjects: 0, totalPublished: 0, credits: 0 });
  const [loading, setLoading] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);

  // Auth Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/builder/login');
    }
  }, [user, authLoading, navigate]);

  // Stats fetching
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) { console.error('Stats fetch failed:', e); }
  }, []);

  // Project fetching
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/projects');
      const data = await res.json();
      if (data.success) setProjects(data.projects);
    } catch (e) { console.error('Projects fetch failed:', e); }
  }, []);

  // Published sites fetching
  const fetchPublishedSites = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await builderSupabase
        .from('published_sites')
        .select('*')
        .eq('user_id', user.id)
        .order('published_at', { ascending: false });
      if (!error) setPublishedSites(data || []);
    } catch (e) { console.error('Published sites fetch failed:', e); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchProjects(), fetchPublishedSites()]);
      setLoading(false);

      // Trigger Congrats Modal if new user flag exists AND they haven't seen it yet
      if (searchParams.get('new') === 'true' && !profile?.has_received_bonus_popup) {
        setShowCongrats(true);
        // Clean up URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('new');
        setSearchParams(newParams, { replace: true });
      }
    };
    init();
  }, [user, profile, fetchStats, fetchProjects, fetchPublishedSites, searchParams, setSearchParams]);

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project permanently? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/dashboard/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.filter(p => p.id !== id));
        fetchStats();
      }
    } catch (e) { console.error('Delete failed:', e); }
  };

  const handleTabChange = (id) => {
    setSearchParams({ tab: id });
  };

  const handleCreateNew = () => navigate('/builder');

  const handleCloseCongrats = async () => {
    setShowCongrats(false);
    // Mark as received in DB so it never shows again
    if (user?.id) {
      await builderSupabase
        .from('profiles')
        .update({ has_received_bonus_popup: true })
        .eq('id', user.id);
    }
  };

  if (!user || !profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a' }}>
        <Loader2Icon size={32} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar Nav */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div style={{ background: '#fff', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="black" fill="black" />
          </div>
          <h2>Volturiano</h2>
        </div>

        <nav className={styles.navSection}>
          {TABS.map(tab => (
            <div 
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''}`}
            >
              <tab.icon className={styles.navIcon} />
              <span>{tab.label}</span>
              {activeTab === tab.id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
            </div>
          ))}
        </nav>

        {/* User Card */}
        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" />
            ) : (
              <User size={20} color="rgba(255,255,255,0.4)" />
            )}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{profile.display_name || user.email.split('@')[0]}</span>
            <span className={styles.userRole}>{profile.role || 'Professional Creator'}</span>
          </div>
          <button 
            onClick={signOut} 
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <header className={styles.contentHeader}>
          <h1>{TABS.find(t => t.id === activeTab)?.label}</h1>
          <div className={styles.headerActions}>
            <button className={styles.createButton} onClick={handleCreateNew}>
              <Plus size={18} />
              New Project
            </button>
          </div>
        </header>

        {activeTab === 'websites' && (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Local Projects</div>
                <div className={styles.statValue}>{stats.totalProjects}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Published Sites</div>
                <div className={styles.statValue}>{stats.totalPublished}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Available Credits <span className={styles.badge}>PREMIUM</span></div>
                <div className={styles.statValue}>{stats.credits}</div>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader2Icon size={32} color="#444" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <ProjectGrid projects={projects} onDelete={handleDeleteProject} onCreateNew={handleCreateNew} />
            )}
          </>
        )}

        {activeTab === 'published' && (
          <PublishedSitesTab sites={publishedSites} loading={loading} />
        )}

        {activeTab === 'settings' && (
          <AccountSettingsTab profile={profile} user={user} />
        )}

        {activeTab === 'liked' && (
          <LikedComponentsTab onOpenCommunity={() => navigate('/community')} />
        )}

        {activeTab === 'billing' && (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', opacity: 0.6 }}>
            <Activity size={48} />
            <h3>Billing system integration pending...</h3>
            <p>Purchase history and plan management will be available here soon.</p>
          </div>
        )}
      </main>

      <CongratsModal 
        isOpen={showCongrats} 
        onClose={handleCloseCongrats} 
      />
    </div>
  );
}

// ─── Published Sites Tab ─────
function PublishedSitesTab({ sites, loading }) {
  if (loading) return null;
  if (!sites || sites.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)' }}>
        <Globe size={48} style={{ opacity: 0.2, marginBottom: 20 }} />
        <h3>No sites published yet</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Once you finish a site and publish it to a custom URL, it will appear here.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
      {sites.map(site => (
        <div key={site.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h4 style={{ margin: 0, fontSize: 16 }}>{site.site_name || 'My Live Website'}</h4>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#0D3B1F', color: '#4ADE80', fontWeight: 'bold' }}>LIVE</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>/{site.slug}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button 
              onClick={() => window.open(`/sites/${site.slug}/`, '_blank')}
              style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <ExternalLink size={14} /> View Live
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Settings Tab ──────
function AccountSettingsTab({ profile, user }) {
  // Simplified version of ProfileSettings content
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [role, setRole] = useState(profile?.role || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await builderSupabase
        .from('profiles')
        .update({ display_name: displayName, role, bio, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      alert('Profile updated!');
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 32 }}>
      <section>
        <h3 style={{ marginBottom: 24 }}>Profile Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Display Name</label>
            <input 
              className="builder-input"
              style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #222', borderRadius: 10, color: '#fff' }}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Job Title / Role</label>
            <input 
              className="builder-input"
              style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #222', borderRadius: 10, color: '#fff' }}
              value={role}
              onChange={e => setRole(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Bio</label>
          <textarea 
            rows={4}
            style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #222', borderRadius: 10, color: '#fff', resize: 'none' }}
            value={bio}
            onChange={e => setBio(e.target.value)}
          />
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '12px 32px', background: '#fff', color: '#000', border: 'none', borderRadius: 12, fontWeight: '600', cursor: 'pointer' }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </section>
    </div>
  );
}
// ─── Liked Components Tab ─────
function LikedComponentsTab({ onOpenCommunity }) {
  const { getAccessToken } = useBuilderAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLiked() {
      try {
        const token = getAccessToken();
        const res = await fetch('/api/community/liked-components', {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        const data = await res.json();
        if (data.success) setItems(data.items || []);
      } catch (e) { console.error('Liked fetch failed:', e); }
      finally { setLoading(false); }
    }
    fetchLiked();
  }, [getAccessToken]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2Icon size={32} color="#444" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)' }}>
        <Heart size={48} style={{ opacity: 0.2, marginBottom: 20 }} />
        <h3>Your collection is empty</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Heart some components in the community hub to save them here.</p>
        <button 
          onClick={onOpenCommunity}
          style={{ padding: '12px 24px', background: '#fff', color: '#000', borderRadius: 12, fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Explore Community Hub
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
      {items.map(comp => (
        <div key={comp.id} className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', height: 'fit-content' }}>
          {comp.thumbnail_url || comp.preview_image_url ? (
            <img src={comp.thumbnail_url || comp.preview_image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
          ) : (
             <div style={{ width: '100%', height: 160, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={24} style={{ opacity: 0.1 }} />
             </div>
          )}
          <div style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: 14 }}>{comp.display_name || comp.name}</h4>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>by @{comp.profiles?.username || 'Unknown'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
