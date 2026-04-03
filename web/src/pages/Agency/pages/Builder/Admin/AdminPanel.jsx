/**
 * AdminPanel — Builder Component Admin Dashboard
 * 
 * Accessible at /builder/Atalmoretti
 * Requires admin_role = true on the user's profile.
 * Non-admins are silently redirected to /builder.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuilderAuth } from '../../../../../contexts/BuilderAuthContext';
import { builderSupabase } from '../../../../../lib/builderSupabaseClient';
import styles from './AdminPanel.module.css';

// ═══ Tag Editor Component ═══
function TagEditor({ value, onChange, placeholder }) {
    const [inputVal, setInputVal] = useState('');
    const tags = Array.isArray(value) ? value : [];

    const addTag = (tag) => {
        const trimmed = tag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
        }
        setInputVal('');
    };

    const removeTag = (idx) => {
        onChange(tags.filter((_, i) => i !== idx));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputVal);
        } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    return (
        <div className={styles.tagEditor}>
            {tags.map((tag, idx) => (
                <span key={`${tag}-${idx}`} className={styles.tag}>
                    {tag}
                    <button className={styles.tagRemove} onClick={() => removeTag(idx)}>×</button>
                </span>
            ))}
            <input
                className={styles.tagInput}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => inputVal.trim() && addTag(inputVal)}
                placeholder={tags.length === 0 ? (placeholder || 'Type + Enter') : ''}
            />
        </div>
    );
}

// ═══ Image Upload Field ═══
function ImageUploadField({ value, onChange, componentId, label, session }) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);

        try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target.result.split(',')[1];
                const res = await fetch('/api/admin/upload-asset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileData: base64,
                        contentType: file.type,
                        componentId,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    onChange(data.url);
                }
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Upload failed:', err);
            setUploading(false);
        }
    };

    return (
        <div className={styles.imageUploadGroup}>
            <span className={styles.fieldLabel}>{label}</span>
            <div className={styles.imagePreviewRow}>
                {value && (
                    <img src={value} alt="" className={styles.imagePreviewThumb} />
                )}
                <input
                    type="file"
                    ref={fileRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <button
                    className={styles.uploadBtn}
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? '⏳ Uploading...' : '📷 Upload'}
                </button>
            </div>
        </div>
    );
}

// ═══ Video Upload Field (URL-based) ═══
function VideoField({ value, onChange, label }) {
    return (
        <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>{label}</span>
            <input
                className={styles.fieldInput}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Video URL..."
            />
        </div>
    );
}

// ═══ 2-Step Popup Modal ═══
function TextPopupModal({ isOpen, title, value, onSave, onClose, isJson }) {
    const [text, setText] = useState('');

    useEffect(() => {
        if (isOpen) {
            setText(isJson ? JSON.stringify(value || {}, null, 2) : (value || ''));
        }
    }, [isOpen, value, isJson]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (isJson) {
            try {
                onSave(JSON.parse(text));
            } catch {
                alert('Invalid JSON. Please fix and try again.');
                return;
            }
        } else {
            onSave(text);
        }
        onClose();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <span className={styles.modalTitle}>{title}</span>
                    <button className={styles.modalClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.modalBody}>
                    <textarea
                        className={isJson ? styles.modalJsonTextarea : styles.modalTextarea}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={isJson ? '{ "key": "value" }' : 'Enter text...'}
                    />
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.modalCancelBtn} onClick={onClose}>Cancel</button>
                    <button className={styles.modalSaveBtn} onClick={handleSave}>Save</button>
                </div>
            </div>
        </div>
    );
}

// ═══ Single Component Card ═══
function ComponentCard({ component, session, onUpdate }) {
    const [local, setLocal] = useState(component);
    const [popup, setPopup] = useState(null); // { field, title, isJson }
    const saveTimerRef = useRef(null);

    // Sync with parent when component changes
    useEffect(() => {
        setLocal(component);
    }, [component]);

    const updateField = useCallback((field, value) => {
        setLocal(prev => ({ ...prev, [field]: value }));

        // Debounce save
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            onUpdate(component.id, { [field]: value });
        }, 800);
    }, [component.id, onUpdate]);

    const updateFieldImmediate = useCallback((field, value) => {
        setLocal(prev => ({ ...prev, [field]: value }));
        onUpdate(component.id, { [field]: value });
    }, [component.id, onUpdate]);

    const getThumbnailUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        if (!builderSupabase) return null;
        const { data } = builderSupabase.storage.from('builder-assets').getPublicUrl(path);
        return data?.publicUrl;
    };

    const thumbUrl = getThumbnailUrl(local.thumbnail_url || local.preview_image_url);

    return (
        <>
            <div className={styles.componentCard}>
                {/* Thumbnail */}
                <div className={styles.cardThumb}>
                    {thumbUrl ? (
                        <img src={thumbUrl} alt={local.name} />
                    ) : (
                        <div className={styles.cardThumbFallback}>
                            {(local.name || '?')[0]}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className={styles.cardBody}>
                    {/* Header Row */}
                    <div className={styles.cardHeader}>
                        <span className={styles.cardName}>{local.display_name || local.name}</span>
                        <span className={styles.cardCategory}>{local.category}</span>
                        <span className={styles.cardId}>{local.component_id}</span>
                    </div>

                    {/* 1-Step Inline Fields */}
                    <div className={styles.fieldsGrid}>
                        {/* Color Mode */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Color Mode</span>
                            <select
                                className={styles.fieldSelect}
                                value={local.color_mode || ''}
                                onChange={(e) => updateField('color_mode', e.target.value || null)}
                            >
                                <option value="">—</option>
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                                <option value="mixed">Mixed</option>
                                <option value="adaptive">Adaptive</option>
                            </select>
                        </div>

                        {/* Quality Score */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Quality Score</span>
                            <input
                                type="number"
                                className={styles.numberInput}
                                value={local.quality_score ?? ''}
                                min={0}
                                max={10}
                                step={0.1}
                                onChange={(e) => updateField('quality_score', parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        {/* Is Premium */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Premium</span>
                            <div className={styles.toggleWrapper}>
                                <button
                                    className={`${styles.toggle} ${local.is_premium ? styles.toggleOn : ''}`}
                                    onClick={() => updateFieldImmediate('is_premium', !local.is_premium)}
                                />
                                <span className={styles.toggleLabel}>{local.is_premium ? 'Yes' : 'No'}</span>
                            </div>
                        </div>

                        {/* Has Animation */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Animation</span>
                            <div className={styles.toggleWrapper}>
                                <button
                                    className={`${styles.toggle} ${local.has_animation ? styles.toggleOn : ''}`}
                                    onClick={() => updateFieldImmediate('has_animation', !local.has_animation)}
                                />
                                <span className={styles.toggleLabel}>{local.has_animation ? 'Yes' : 'No'}</span>
                            </div>
                        </div>

                        {/* Status */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Status</span>
                            <select
                                className={styles.fieldSelect}
                                value={local.status || 'active'}
                                onChange={(e) => updateFieldImmediate('status', e.target.value)}
                            >
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                                <option value="deprecated">Deprecated</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>

                        {/* Usage Count */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Usage Count</span>
                            <input
                                type="number"
                                className={styles.numberInput}
                                value={local.usage_count ?? 0}
                                min={0}
                                onChange={(e) => updateField('usage_count', parseInt(e.target.value) || 0)}
                            />
                        </div>

                        {/* Rating Avg */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Rating Avg</span>
                            <input
                                type="number"
                                className={styles.numberInput}
                                value={local.rating_avg ?? 0}
                                min={0}
                                max={5}
                                step={0.1}
                                onChange={(e) => updateField('rating_avg', parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        {/* Rating Count */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Rating Count</span>
                            <input
                                type="number"
                                className={styles.numberInput}
                                value={local.rating_count ?? 0}
                                min={0}
                                onChange={(e) => updateField('rating_count', parseInt(e.target.value) || 0)}
                            />
                        </div>

                        {/* Category */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Category</span>
                            <input
                                className={styles.fieldInput}
                                value={local.category || ''}
                                onChange={(e) => updateField('category', e.target.value)}
                            />
                        </div>

                        {/* Subcategory */}
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Subcategory</span>
                            <input
                                className={styles.fieldInput}
                                value={local.subcategory || ''}
                                onChange={(e) => updateField('subcategory', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tag Editors (1-Step) */}
                    <div className={styles.fieldsGrid}>
                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Suitable For</span>
                            <TagEditor
                                value={local.suitable_for}
                                onChange={(v) => updateField('suitable_for', v)}
                                placeholder="Add tag..."
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Not Suitable For</span>
                            <TagEditor
                                value={local.not_suitable_for}
                                onChange={(v) => updateField('not_suitable_for', v)}
                                placeholder="Add tag..."
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Tags</span>
                            <TagEditor
                                value={local.tags}
                                onChange={(v) => updateField('tags', v)}
                                placeholder="Add tag..."
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <span className={styles.fieldLabel}>Industry Tags</span>
                            <TagEditor
                                value={local.industry_tags}
                                onChange={(v) => updateField('industry_tags', v)}
                                placeholder="Add tag..."
                            />
                        </div>
                    </div>

                    {/* Image / Video Upload */}
                    <div className={styles.fieldsGrid}>
                        <ImageUploadField
                            label="Image"
                            value={getThumbnailUrl(local.thumbnail_url || local.preview_image_url)}
                            onChange={(url) => {
                                updateFieldImmediate('thumbnail_url', url);
                                updateFieldImmediate('preview_image_url', url);
                            }}
                            componentId={component.id}
                            session={session}
                        />
                        <VideoField
                            label="Preview Video URL"
                            value={local.preview_video_url}
                            onChange={(url) => updateField('preview_video_url', url)}
                        />
                    </div>

                    {/* 2-Step Popup Buttons */}
                    <div className={styles.popupBtnRow}>
                        <button
                            className={`${styles.popupBtn} ${local.description ? styles.popupBtnHasContent : ''}`}
                            onClick={() => setPopup({ field: 'description', title: `Description — ${local.name}`, isJson: false })}
                        >
                            ✏️ Description
                        </button>
                        <button
                            className={`${styles.popupBtn} ${local.visual_description ? styles.popupBtnHasContent : ''}`}
                            onClick={() => setPopup({ field: 'visual_description', title: `Visual Description — ${local.name}`, isJson: false })}
                        >
                            🎨 Visual Desc
                        </button>
                        <button
                            className={`${styles.popupBtn} ${local.mood_tone ? styles.popupBtnHasContent : ''}`}
                            onClick={() => setPopup({ field: 'mood_tone', title: `Mood / Tone — ${local.name}`, isJson: false })}
                        >
                            🎭 Mood / Tone
                        </button>
                        <button
                            className={`${styles.popupBtn} ${local.design_personality ? styles.popupBtnHasContent : ''}`}
                            onClick={() => setPopup({ field: 'design_personality', title: `Design Personality — ${local.name}`, isJson: true })}
                        >
                            💎 Design Personality
                        </button>
                    </div>
                </div>
            </div>

            {/* 2-Step Popup Modal */}
            <TextPopupModal
                isOpen={!!popup}
                title={popup?.title || ''}
                value={local[popup?.field]}
                isJson={popup?.isJson || false}
                onSave={(val) => {
                    updateFieldImmediate(popup.field, val);
                }}
                onClose={() => setPopup(null)}
            />
        </>
    );
}

// ═══ Main Admin Panel ═══
export default function AdminPanel() {
    const navigate = useNavigate();
    const { session, profile, loading: authLoading, isAuthenticated } = useBuilderAuth();
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [toast, setToast] = useState(null); // { message, type }

    // ─── Access Control ───
    // The BuilderAuthContext sets loading=false BEFORE the profile finishes
    // fetching. We must wait for the profile to actually arrive before
    // making the redirect decision. The sequence is:
    //   1. authLoading=true → spinner
    //   2. authLoading=false, isAuthenticated=true, profile=null → still waiting for profile
    //   3. authLoading=false, isAuthenticated=true, profile={...} → check admin_role
    //   4. authLoading=false, isAuthenticated=false → redirect (not logged in)
    const [accessChecked, setAccessChecked] = useState(false);

    useEffect(() => {
        // Still loading auth → wait
        if (authLoading) return;

        // Not authenticated at all → redirect immediately
        if (!isAuthenticated) {
            navigate('/builder', { replace: true });
            return;
        }

        // Authenticated but profile hasn't arrived yet → keep waiting
        if (!profile) return;

        // Profile loaded — check admin_role
        if (!profile.admin_role) {
            navigate('/builder', { replace: true });
        } else {
            setAccessChecked(true);
        }
    }, [authLoading, isAuthenticated, profile, navigate]);

    // ─── Fetch Components ───
    useEffect(() => {
        if (!session?.access_token || !accessChecked) return;

        const fetchComponents = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/admin/components', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });
                const data = await res.json();
                if (data.success) {
                    setComponents(data.components);
                }
            } catch (err) {
                console.error('[Admin] Fetch failed:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchComponents();
    }, [session?.access_token, accessChecked]);

    // ─── Update Handler ───
    const handleUpdate = useCallback(async (componentId, updates) => {
        try {
            const res = await fetch('/api/admin/update-component', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ componentId, updates }),
            });
            const data = await res.json();
            if (data.success) {
                setToast({ message: '✓ Saved', type: 'success' });
                // Update local state
                setComponents(prev =>
                    prev.map(c => c.id === componentId ? { ...c, ...updates } : c)
                );
            } else {
                setToast({ message: `Error: ${data.error}`, type: 'error' });
            }
        } catch (err) {
            setToast({ message: `Save failed: ${err.message}`, type: 'error' });
        }

        // Auto-dismiss toast
        setTimeout(() => setToast(null), 2000);
    }, [session?.access_token]);

    // ─── Filtering ───
    const categories = [...new Set(components.map(c => c.category).filter(Boolean))].sort();
    const filteredComponents = components.filter(c => {
        const matchSearch = !search ||
            (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.component_id || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.category || '').toLowerCase().includes(search.toLowerCase());
        const matchCategory = !categoryFilter || c.category === categoryFilter;
        return matchSearch && matchCategory;
    });

    // Guard: show spinner until access is confirmed
    if (!accessChecked) {
        return (
            <div className={styles.adminRoot}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <span>Verifying access...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.adminRoot}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => navigate('/builder')}>
                        ←
                    </button>
                    <span className={styles.headerTitle}>Component Admin</span>
                    <span className={styles.headerBadge}>ADMIN</span>
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.componentCount}>
                        {filteredComponents.length} / {components.length} components
                    </span>
                </div>
            </div>

            {/* Toolbar */}
            <div className={styles.toolbar}>
                <input
                    className={styles.searchInput}
                    placeholder="Search by name, ID, or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className={styles.filterSelect}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Component List */}
            <div className={styles.tableWrapper}>
                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner} />
                        <span>Loading components...</span>
                    </div>
                ) : filteredComponents.length === 0 ? (
                    <div className={styles.emptyState}>
                        No components match your search.
                    </div>
                ) : (
                    filteredComponents.map(comp => (
                        <ComponentCard
                            key={comp.id}
                            component={comp}
                            session={session}
                            onUpdate={handleUpdate}
                        />
                    ))
                )}
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={toast.type === 'error' ? styles.errorIndicator : styles.savedIndicator}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
