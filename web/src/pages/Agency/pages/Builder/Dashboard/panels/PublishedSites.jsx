import React, { useState, useEffect } from 'react';
import { useBuilderAuth } from '../../../../../../contexts/BuilderAuthContext';
import { ExternalLink, Globe, Trash2, Loader2, Pause, Play, Eye, Calendar, Layout } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PublishedSites() {
    const { user, getAccessToken } = useBuilderAuth();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);

    const fetchSites = async () => {
        setLoading(true);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/published-sites', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSites(data.sites || []);
            }
        } catch (err) {
            console.error('Failed to fetch published sites:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchSites();
    }, [user]);

    const handleToggleStatus = async (siteId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        setActionId(siteId);
        try {
            const token = await getAccessToken();
            const res = await fetch(`/api/dashboard/sites/${siteId}/toggle`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                setSites(prev => prev.map(s => s.id === siteId ? { ...s, status: newStatus } : s));
            }
        } catch (err) {
            console.error('Toggle failed:', err);
        } finally {
            setActionId(null);
        }
    };

    const handleDelete = async (siteId) => {
        if (!window.confirm('Are you sure? This will delete the hosting files from Supabase and unpublish the site completely.')) return;
        setActionId(siteId);
        try {
            const token = await getAccessToken();
            const res = await fetch(`/api/dashboard/sites/${siteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSites(prev => prev.filter(s => s.id !== siteId));
            }
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setActionId(null);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                <Loader2 size={32} color="#555" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (sites.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '20px', textAlign: 'center' }}>
                <Globe size={64} style={{ opacity: 0.1, color: '#fff' }} />
                <div style={{ maxWidth: '300px' }}>
                    <p style={{ color: '#fff', fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No live sites yet</p>
                    <p style={{ color: '#666', fontSize: '14px' }}>Your published projects will appear here for hosting management.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {sites.map(site => {
                const publishedTime = site.published_at 
                    ? formatDistanceToNow(new Date(site.published_at), { addSuffix: true })
                    : 'Recently';

                return (
                    <div
                        key={site.id}
                        style={{
                            background: '#1A1A1A',
                            borderRadius: '16px',
                            border: '1px solid #2E2D2D',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            opacity: site.status === 'paused' ? 0.7 : 1,
                            transition: 'all 0.3s'
                        }}
                    >
                        {/* Header Header */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #2E2D2D', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '10px', 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {site.thumbnail_url ? (
                                    <img src={site.thumbnail_url} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <Layout size={20} color="#666" />
                                )}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {site.site_name || site.slug}
                                </h3>
                                <p style={{ color: '#666', fontSize: '12px', margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                                    /{site.slug}
                                </p>
                            </div>
                        </div>

                        {/* Mid Section: Stats */}
                        <div style={{ padding: '15px 20px', display: 'flex', gap: '20px', background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={14} color="#444" />
                                <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{site.view_count || 0}</span>
                                <span style={{ color: '#666', fontSize: '12px' }}>views</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={14} color="#444" />
                                <span style={{ color: '#666', fontSize: '12px' }}>{publishedTime}</span>
                            </div>
                        </div>

                        {/* Footer Section: Actions */}
                        <div style={{ padding: '15px 20px', display: 'flex', gap: '10px', marginTop: 'auto', background: 'rgba(0,0,0,0.2)' }}>
                            <button 
                                onClick={() => window.open(`/sites/${site.slug}/`, '_blank')}
                                style={{ 
                                    flex: 2, 
                                    padding: '8px', 
                                    background: '#fff', 
                                    color: '#000', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    fontSize: '13px', 
                                    fontWeight: '600', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <ExternalLink size={14} /> View Site
                            </button>

                            <button 
                                onClick={() => handleDelete(site.id)}
                                disabled={actionId === site.id}
                                style={{ 
                                    width: '40px', 
                                    background: 'rgba(239, 68, 68, 0.05)', 
                                    color: '#f87171', 
                                    border: '1px solid rgba(239, 68, 68, 0.1)', 
                                    borderRadius: '8px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                                title="Unpublish & Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
