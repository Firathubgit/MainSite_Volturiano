import React, { useState, useEffect } from 'react';
import { useBuilderAuth } from '../../../../../contexts/BuilderAuthContext';
import { builderSupabase } from '../../../../../lib/builderSupabaseClient';
import { useNavigate } from 'react-router-dom';
import styles from './MySubmissions.module.css';
import { ClockIcon, CheckCircleIcon, XCircleIcon, ActivityIcon, EditIcon, Trash2Icon, LayoutTemplateIcon, BoxIcon, Loader2, MoreHorizontal, Heart, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function MySubmissions() {
    const { user, getAccessToken } = useBuilderAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [stats, setStats] = useState({ reputation: 0, active_components: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('components');
    const [selectedRejection, setSelectedRejection] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [hoveredCardId, setHoveredCardId] = useState(null);
    const [videoPlayingId, setVideoPlayingId] = useState(null);
    const [error, setError] = useState(null);
    const [menuOpenId, setMenuOpenId] = useState(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null);
        if (menuOpenId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [menuOpenId]);

    const fetchDashboardData = async () => {
        if (!user) {
            console.log("[MySubmissions] [TRACE] No user, skipping fetch");
            return;
        }

        console.log("[MySubmissions] [TRACE] fetchDashboardData started");
        setLoading(true);
        setError(null);

        // Safety Timeout: Force loading to resolve after 7 seconds if API hangs
        const timeoutId = setTimeout(() => {
            console.warn("[MySubmissions] [TRACE] Safety timeout triggered! Force-releasing loader.");
            setLoading(false);
            setError("The request took too long. Please try refreshing.");
        }, 7000);

        try {
            console.log("[MySubmissions] [TRACE] Getting access token...");
            const token = await getAccessToken();
            console.log("[MySubmissions] [TRACE] Token received. Fetching from API...");

            const res = await fetch('/api/community/my-submissions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log(`[MySubmissions] [TRACE] API Response Status: ${res.status}`);
            const data = await res.json();
            
            if (data.success) {
                console.log("[MySubmissions] [TRACE] Data received successfully", {
                    subs: data.submissions?.length,
                    temps: data.templates?.length,
                    stats: data.stats
                });
                setSubmissions(data.submissions || []);
                setTemplates(data.templates || []);
                setStats(data.stats || { reputation: 0, active_components: 0 });
            } else {
                console.error("[MySubmissions] [TRACE] API returned failure:", data.error);
                setError(data.error || "Failed to load dashboard data");
            }
        } catch (err) {
            console.error("[MySubmissions] [TRACE] Fetch catch block error:", err);
            setError("A network error occurred.");
        } finally {
            console.log("[MySubmissions] [TRACE] Finally block. Clearing timeout and setting loading false.");
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log("[MySubmissions] [TRACE] Root useEffect triggered. User ID:", user?.id);
        if (user) fetchDashboardData();
    }, [user?.id]); // Use primitive ID to avoid reference check issues

    const getThumbnailUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const { data } = builderSupabase.storage.from('builder-assets').getPublicUrl(path);
        return data?.publicUrl;
    };

    const getPreviewVideoUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const { data } = builderSupabase.storage.from('component-previews').getPublicUrl(path);
        return data?.publicUrl;
    };

    const handleDelete = async (submissionId) => {
        setDeletingId(submissionId);
        try {
            const token = await getAccessToken();
            const res = await fetch(`/api/community/submissions/${submissionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSubmissions(prev => prev.filter(s => s.id !== submissionId));
                setConfirmDeleteId(null);
            }
        } catch (err) {
            console.error("Failed to delete submission", err);
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const handleEdit = (sub) => {
        navigate('/builder/community/submit', {
            state: {
                editMode: true,
                submissionId: sub.id,
                name: sub.name,
                code: sub.code,
                cssCode: sub.css_code || '',
            }
        });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
                <Loader2 size={32} color="#555" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#555', fontSize: '13px' }}>Loading your dashboard...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '20px', textAlign: 'center' }}>
                <XCircleIcon size={48} color="#f87171" opacity={0.5} />
                <div style={{ maxWidth: '400px' }}>
                    <p style={{ color: '#fff', fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>Something went wrong</p>
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
                    <button 
                        onClick={fetchDashboardData}
                        style={{ padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!user) {
        return <div className={styles.loadingContainer}>Please sign in to view your dashboard.</div>;
    }

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>Author Dashboard</h1>
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Reputation</span>
                        <span className={styles.statValue}>{stats.reputation}</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Total Uses</span>
                        <span className={styles.statValue}>{stats.total_uses || 0}</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Active Components</span>
                        <span className={styles.statValue}>{stats.active_components}</span>
                    </div>
                </div>
            </div>

            <div className={styles.tabsContainer}>
                <button
                    className={`${styles.tab} ${activeTab === 'components' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('components')}
                >
                    <BoxIcon size={14} style={{ marginRight: '6px' }} /> Components
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'templates' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    <LayoutTemplateIcon size={14} style={{ marginRight: '6px' }} /> Templates
                </button>
            </div>

            {activeTab === 'components' && (
                <div className={styles.submissionsGrid}>
                    {submissions.length === 0 ? (
                        <div className={styles.emptyState}>No components submitted yet.</div>
                    ) : (
                        submissions.map(sub => (
                            <div
                                key={sub.id}
                                className={styles.submissionCard}
                                onClick={() => handleEdit(sub)}
                                onMouseEnter={() => setHoveredCardId(sub.id)}
                                onMouseLeave={() => {
                                    setHoveredCardId(null);
                                    setVideoPlayingId(null);
                                }}
                            >
                                <div className={styles.thumbnailWrapper}>
                                    {getThumbnailUrl(sub.thumbnail_url) ? (
                                        <img
                                            src={getThumbnailUrl(sub.thumbnail_url)}
                                            alt={sub.name}
                                            className={styles.thumbnailImage}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className={styles.thumbnailPlaceholder}>
                                            <ActivityIcon size={32} opacity={0.2} />
                                        </div>
                                    )}

                                    {sub.preview_video_url && hoveredCardId === sub.id && (
                                        <video
                                            src={getPreviewVideoUrl(sub.preview_video_url)}
                                            autoPlay
                                            muted
                                            loop
                                            poster={getThumbnailUrl(sub.thumbnail_url)}
                                            className={`${styles.thumbnailVideo} ${videoPlayingId === sub.id ? styles.thumbnailVideoVisible : ''}`}
                                            onPlaying={() => setVideoPlayingId(sub.id)}
                                        />
                                    )}

                                    <div className={styles.statusLabelOverlay}>
                                        <StatusBadge status={sub.status} />
                                    </div>
                                </div>

                                <div className={styles.cardContent}>
                                    <div className={styles.projectNameRow}>
                                        <h3 className={styles.projectName}>{sub.name}</h3>
                                        <div className={styles.menuContainer}>
                                            <button 
                                                className={styles.menuTrigger}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpenId(menuOpenId === sub.id ? null : sub.id);
                                                }}
                                            >
                                                <MoreHorizontal size={18} />
                                            </button>
                                            
                                            {menuOpenId === sub.id && (
                                                <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        className={styles.menuItemDanger}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmDeleteId(sub.id);
                                                            setMenuOpenId(null);
                                                        }}
                                                    >
                                                        <Trash2Icon size={14} /> Delete Component
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.projectMeta}>
                                        <div className={styles.metaLeft}>
                                            <span className={styles.lastUpdated}>
                                                Updated {formatDistanceToNow(new Date(sub.updated_at || sub.created_at), { addSuffix: true })}
                                            </span>
                                            {sub.quality_score && (
                                                <span className={styles.qualityScore}>
                                                     • Score: {sub.quality_score}/10
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className={styles.metaRight}>
                                            <div className={styles.likesCount}>
                                                <Heart size={12} fill="rgba(255,255,255,0.2)" stroke="none" />
                                                <span>{sub.likes_count || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'templates' && (
                <div className={styles.submissionsGrid}>
                    {templates.length === 0 ? (
                        <div className={styles.emptyState}>
                            <LayoutTemplateIcon size={48} opacity={0.15} style={{ marginBottom: '12px' }} />
                            <p>No templates yet.</p>
                            <p style={{ fontSize: '13px', opacity: 0.5 }}>Combine components into reusable website templates — coming in the Community tab.</p>
                        </div>
                    ) : (
                        templates.map(tmpl => (
                            <div key={tmpl.id} className={styles.submissionCard}>
                                <div className={styles.thumbnailContainer}>
                                    {(tmpl.thumbnail_url || tmpl.preview_image_url) ? (
                                        <img
                                            src={tmpl.thumbnail_url || tmpl.preview_image_url}
                                            alt={tmpl.name}
                                            className={styles.thumbnailImage}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className={styles.thumbnailPlaceholder}>
                                            <LayoutTemplateIcon size={32} opacity={0.2} />
                                        </div>
                                    )}
                                </div>

                                <div className={styles.cardInfo}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>{tmpl.name}</h3>
                                        <StatusBadge status={tmpl.status} />
                                    </div>

                                    <div className={styles.cardMeta}>
                                        <span>{new Date(tmpl.created_at).toLocaleDateString()}</span>
                                        <span>{tmpl.component_count || 0} sections</span>
                                        {tmpl.quality_score && <span>Score: {tmpl.quality_score}/10</span>}
                                        {tmpl.usage_count > 0 && <span>Uses: {tmpl.usage_count}</span>}
                                    </div>

                                    {tmpl.description && (
                                        <p style={{ color: '#999', fontSize: '12px', margin: '4px 0 0', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {tmpl.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <AnimatePresence>
                {selectedRejection && (
                    <motion.div 
                        className={styles.modalOverlay} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedRejection(null)}
                    >
                        <motion.div 
                            className={styles.modalCard} 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className={styles.modalTitle}>Rejection Feedback</h3>
                            <div className={styles.modalBody}>
                                <div className={styles.feedbackSection}>
                                    <h4>Reason</h4>
                                    <p>{selectedRejection.rejection_reason || 'Did not pass quality gate.'}</p>
                                </div>
                                <div className={styles.feedbackSection}>
                                    <h4>Suggestions</h4>
                                    <p>{selectedRejection.improvement_suggestions || 'Please improve code quality and design aesthetics.'}</p>
                                </div>
                                <div className={styles.feedbackSection}>
                                    <h4>LLM Quality Score</h4>
                                    <p>{selectedRejection.quality_score} / 10</p>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.modalBtn} onClick={() => setSelectedRejection(null)}>
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {confirmDeleteId && (
                    <motion.div 
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setConfirmDeleteId(null)}
                    >
                        <motion.div 
                            className={styles.modalCard}
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className={styles.modalTitle}>Delete Component</h3>
                            <p className={styles.modalDesc}>
                                Are you sure you want to delete this component, this cant be un done
                            </p>
                            <div className={styles.modalActions}>
                                <button 
                                    className={styles.modalBtn}
                                    onClick={() => setConfirmDeleteId(null)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className={`${styles.modalBtn} ${styles.modalBtnDanger}`}
                                    onClick={() => handleDelete(confirmDeleteId)}
                                    disabled={deletingId === confirmDeleteId}
                                >
                                    {deletingId === confirmDeleteId ? 'Deleting...' : 'Delete Component'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatusBadge({ status }) {
    let icon, colorClass, statusLabel;

    switch (status) {
        case 'active':
        case 'approved':
            return null;
        case 'rejected':
            icon = <XCircleIcon size={12} />;
            colorClass = styles.statusError;
            statusLabel = 'Rejected';
            break;
        case 'pending_review':
        case 'processing':
            icon = <ClockIcon size={12} />;
            colorClass = styles.statusWarning;
            statusLabel = status === 'processing' ? 'Processing' : 'Under Review';
            break;
        default:
            icon = <ActivityIcon size={12} />;
            colorClass = styles.statusNeutral;
            statusLabel = status;
            break;
    }

    return (
        <span className={`${styles.statusBadge} ${colorClass}`}>
            {icon} {statusLabel}
        </span>
    );
}
