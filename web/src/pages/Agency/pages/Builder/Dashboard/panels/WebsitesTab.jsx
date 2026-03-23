import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Edit2, Trash2, Globe, Clock, Layout, Play, Plus, Loader2, MoreHorizontal, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import styles from "../ProfileSettings.module.css";
import { useRouteTransition } from "../../../../../../contexts/RouteTransitionContext";

function ProjectCard({ project, onDelete, navigate }) {
    const [showMenu, setShowMenu] = useState(false);
    const { startTransition } = useRouteTransition();
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTransitionStart = (projectId) => {
        // Elegantly drop out the dashboard UI
        const dashboardRoot = document.querySelector('[style*="min-height: 100vh"]') || document.body;
        if (dashboardRoot) {
            dashboardRoot.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            dashboardRoot.style.opacity = '0';
            dashboardRoot.style.transform = 'translateY(40px) scale(0.97)';
            dashboardRoot.style.filter = 'blur(12px)';
        }

        // Start Cinematic Transition for REVISIT
        startTransition(`/builder/generation?project=${projectId}`, {
            prompt: "I want to continue editing this project...",
            isProjectRevisit: true
        });
    };

    const handleCardClick = (e) => {
        if (showMenu) return;
        handleTransitionStart(project.id);
    };

    const toggleMenu = (e) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const handleAction = (action, e) => {
        e.stopPropagation();
        setShowMenu(false);
        if (action === 'delete') onDelete(project.id);
        if (action === 'preview') {
            if (project.published_url) {
                window.open(`/sites/${project.published_slug}/`, '_blank');
            } else {
                handleTransitionStart(project.id);
            }
        }
        if (action === 'edit') handleTransitionStart(project.id);
    };

    const isPublished = project.build_status === 'published';

    return (
        <div 
            style={{
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'pointer',
                position: 'relative',
                gap: '16px'
            }}
            onClick={handleCardClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {/* Horizontal Rectangle Project Preview Image */}
            <div style={{ 
                aspectRatio: '16/10', 
                background: '#161616', 
                position: 'relative', 
                overflow: 'hidden',
                borderRadius: '20px',
                border: '1px solid #2E2D2D',
                transition: 'border-color 0.3s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2E2D2D'; }}
            >
                {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                        <Layout size={64} color="#fff" strokeWidth={1} />
                    </div>
                )}
            </div>

            {/* Project Info - Text Outside */}
            <div style={{ padding: '0 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '85%' }}>
                        <h4 style={{ 
                            color: '#fff', 
                            fontSize: '18px', 
                            fontWeight: '600', 
                            margin: 0, 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            fontFamily: "'Inter', sans-serif"
                        }}>
                            {project.name || "Untitled Project"}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '13px', fontWeight: '500' }}>
                            <span>Updated {project.updated_at ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true }) : '---'}</span>
                        </div>
                    </div>
                    
                    {/* Three Dots Button */}
                    <div ref={menuRef} style={{ position: 'relative' }}>
                        <button 
                            onClick={toggleMenu}
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: '#555', 
                                cursor: 'pointer', 
                                padding: '8px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <MoreHorizontal size={24} />
                        </button>

                        {/* Popup Menu */}
                        {showMenu && (
                            <div style={{ 
                                position: 'absolute', 
                                bottom: '100%', 
                                right: '0', 
                                marginBottom: '12px',
                                background: '#1c1c1c', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '18px', 
                                padding: '8px', 
                                minWidth: '180px', 
                                zIndex: 100,
                                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                                animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                backdropFilter: 'blur(20px)'
                            }}>
                                {/* Status Indicator in Menu */}
                                <div style={{ 
                                    padding: '8px 14px',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    color: isPublished ? '#4ade80' : '#888',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPublished ? '#4ade80' : '#888' }} />
                                    {project.build_status || 'Preview'}
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />

                                <button 
                                    onClick={(e) => handleAction('edit', e)}
                                    style={{ 
                                        width: '100%', 
                                        textAlign: 'left', 
                                        padding: '12px 14px', 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: '#fff', 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        cursor: 'pointer',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Edit2 size={16} color="#aaa" /> Edit Website
                                </button>

                                <button 
                                    onClick={(e) => handleAction('preview', e)}
                                    style={{ 
                                        width: '100%', 
                                        textAlign: 'left', 
                                        padding: '12px 14px', 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: '#fff', 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        cursor: 'pointer',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Eye size={16} color="#aaa" /> Preview
                                </button>
                                
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 4px' }} />

                                <button 
                                    onClick={(e) => handleAction('delete', e)}
                                    style={{ 
                                        width: '100%', 
                                        textAlign: 'left', 
                                        padding: '12px 14px', 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: '#ff6b6b', 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        cursor: 'pointer',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function WebsitesTab({ websites, loading, onDelete, onCreateNew, navigate }) {
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                <Loader2 size={40} color="#444" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (websites.length === 0) {
        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '80px 40px',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '24px',
                border: '1px dashed #2E2D2D'
            }}>
                <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '20px', 
                    background: 'rgba(255,255,255,0.03)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: '24px'
                }}>
                    <Globe size={32} color="#333" />
                </div>
                <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '600', margin: '0 0 10px 0' }}>No websites found</h3>
                <p style={{ color: '#666', fontSize: '15px', margin: '0 0 30px 0', textAlign: 'center', maxWidth: '400px' }}>
                    You haven't created any websites with the builder yet. Start your first project now!
                </p>
                <button 
                    onClick={onCreateNew}
                    style={{ 
                        padding: '12px 24px', 
                        background: '#fff', 
                        color: '#000', 
                        border: 'none', 
                        borderRadius: '12px', 
                        fontSize: '15px', 
                        fontWeight: '700', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    <Plus size={18} /> Create New Website
                </button>
            </div>
        );
    }

    return (
        <>
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
                {websites.map((project) => (
                    <ProjectCard 
                        key={project.id} 
                        project={project} 
                        onDelete={onDelete} 
                        navigate={navigate} 
                    />
                ))}
            </div>
        </>
    );
}
