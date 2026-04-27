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

// Import template thumbnail assets (same as Builder.jsx)
import scaleIntelligenceThumbnail from '../../../../../assets/ScaleIntelegenceMocup.png';
import solarExampleThumbnail from '../../../../../assets/SolarExample.png';
import qyvoraClimateThumbnail from '../../../../../assets/87shots_so.png';
import rivelonThumbnail from '../../../../../assets/134shots_so.png';

// Template metadata mapping — mirrors Builder.jsx
const TEMPLATE_THUMBNAILS = {
    'template.agency.dark.v1': scaleIntelligenceThumbnail,
    'template.rivelon.leather.v1': rivelonThumbnail,
    'template.solar.scope.v1': solarExampleThumbnail,
    'template.qyvora.climate.v1': qyvoraClimateThumbnail,
};

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
function ImageUploadField({ value, onChange, componentId, label, session, bucket = 'builder-assets' }) {
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
                        bucket
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

// ═══ Single Template Card ═══
function TemplateCard({ template, session, onUpdate }) {
    const [local, setLocal] = useState(template);
    const [promptExpanded, setPromptExpanded] = useState(false);
    const saveTimerRef = useRef(null);

    useEffect(() => {
        setLocal(template);
    }, [template]);

    const updateField = useCallback((field, value) => {
        setLocal(prev => ({ ...prev, [field]: value }));

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            onUpdate(template.id, { [field]: value });
        }, 800);
    }, [template.id, onUpdate]);

    const updateFieldImmediate = useCallback((field, value) => {
        setLocal(prev => ({ ...prev, [field]: value }));
        onUpdate(template.id, { [field]: value });
    }, [template.id, onUpdate]);

    const getThumbnailUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        if (!builderSupabase) return null;
        const bucket = path.includes('Templates') || path.includes('template') ? 'Templates' : 'builder-assets';
        const { data } = builderSupabase.storage.from(bucket).getPublicUrl(path);
        return data?.publicUrl;
    };

    const thumbUrl = getThumbnailUrl(local.thumbnail_url) || TEMPLATE_THUMBNAILS[local.template_id] || null;
    const hasPrompt = !!(local.agent_prompt && local.agent_prompt.trim());

    return (
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
                    <span className={styles.cardName}>{local.name}</span>
                    <span className={styles.cardId}>{local.template_id}</span>
                    <span className={`${styles.cardCategory}`} style={{ background: hasPrompt ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: hasPrompt ? '#22c55e' : '#ef4444' }}>
                        {hasPrompt ? '✓ Prompt Set' : '✗ No Prompt'}
                    </span>
                </div>

                {/* Inline Fields */}
                <div className={styles.fieldsGrid}>
                    <div className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Name</span>
                        <input
                            className={styles.fieldInput}
                            value={local.name || ''}
                            onChange={(e) => updateField('name', e.target.value)}
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Description</span>
                        <input
                            className={styles.fieldInput}
                            value={local.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Status</span>
                        <select
                            className={styles.fieldSelect}
                            value={local.status || 'active'}
                            onChange={(e) => updateFieldImmediate('status', e.target.value)}
                        >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                    <div className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Priority</span>
                        <input
                            className={styles.fieldInput}
                            type="number"
                            min="0"
                            placeholder="—"
                            value={local.priority ?? ''}
                                onChange={(e) => {
                                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                updateFieldImmediate('priority', val);
                            }}
                            style={{ width: 70 }}
                    />
                </div>
                <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                    <span className={styles.fieldLabel}>Visit Site URL</span>
                    <input
                        className={styles.fieldInput}
                        placeholder="https://..."
                        value={local.visit_url || ''}
                        onChange={(e) => updateField('visit_url', e.target.value)}
                    />
                </div>

                {/* Thumbnail Upload */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <ImageUploadField 
                            label="Thumbnail"
                            value={local.thumbnail_url}
                            onChange={(url) => updateFieldImmediate('thumbnail_url', url)}
                            session={session}
                            componentId={local.template_id}
                            bucket="Templates"
                        />
                    </div>
                </div>

                {/* Agent Prompt — expandable textarea */}
                <div style={{ marginTop: 4 }}>
                    <button
                        className={`${styles.popupBtn} ${hasPrompt ? styles.popupBtnHasContent : ''}`}
                        onClick={() => setPromptExpanded(!promptExpanded)}
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        {promptExpanded ? '▼ Close Agent Prompt' : '✏️ Edit Agent Prompt'}
                    </button>
                    {promptExpanded && (
                        <textarea
                            className={styles.modalTextarea}
                            value={local.agent_prompt || ''}
                            onChange={(e) => updateField('agent_prompt', e.target.value)}
                            placeholder="Enter the prompt that the agent will receive when a user selects this template. Be descriptive about what kind of website to build..."
                            style={{ marginTop: 8, minHeight: 160 }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══ Create Template Modal ═══
function CreateTemplateModal({ isOpen, onClose, onCreate, session }) {
    const [formData, setFormData] = useState({
        template_id: '',
        name: '',
        description: '',
        agent_prompt: '',
        thumbnail_url: '',
        priority: null,
        visit_url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.template_id || !formData.name) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/create-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                onCreate(data.template);
                onClose();
                setFormData({ template_id: '', name: '', description: '', agent_prompt: '', thumbnail_url: '', priority: null, visit_url: '' });
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert(`Failed to create: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div 
                className={styles.modalContent} 
                onClick={e => e.stopPropagation()} 
                style={{ width: '100%', maxWidth: 500, background: '#0F0F0F', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.08)' }}
            >
                <h2 style={{ fontSize: '1.2rem', marginBottom: 24, opacity: 0.9 }}>Create New Template</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', tracking: '0.1em', opacity: 0.4, marginBottom: 8 }}>Template ID (System Name)</label>
                        <input 
                            className={styles.searchInput}
                            style={{ width: '100%' }}
                            placeholder="e.g. template.agency.v2"
                            value={formData.template_id}
                            onChange={e => setFormData(p => ({ ...p, template_id: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', tracking: '0.1em', opacity: 0.4, marginBottom: 8 }}>Display Name</label>
                        <input 
                            className={styles.searchInput}
                            style={{ width: '100%' }}
                            placeholder="e.g. Modern Agency Pro"
                            value={formData.name}
                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', tracking: '0.1em', opacity: 0.4, marginBottom: 8 }}>Description</label>
                        <input 
                            className={styles.searchInput}
                            style={{ width: '100%' }}
                            placeholder="Short summary for users..."
                            value={formData.description}
                            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', tracking: '0.1em', opacity: 0.4, marginBottom: 8 }}>Visit Site URL</label>
                        <input 
                            className={styles.searchInput}
                            style={{ width: '100%' }}
                            placeholder="https://demo-site.com"
                            value={formData.visit_url}
                            onChange={e => setFormData(p => ({ ...p, visit_url: e.target.value }))}
                        />
                    </div>
                    <div>
                        <ImageUploadField 
                            label="Thumbnail Image"
                            value={formData.thumbnail_url}
                            onChange={(url) => setFormData(p => ({ ...p, thumbnail_url: url }))}
                            session={session}
                            componentId={formData.template_id || 'new-template'}
                            bucket="Templates"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: 8 }}>Priority (lower = first)</label>
                        <input 
                            className={styles.searchInput}
                            style={{ width: 100 }}
                            type="number"
                            min="0"
                            placeholder="—"
                            value={formData.priority ?? ''}
                            onChange={e => {
                                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                setFormData(p => ({ ...p, priority: val }));
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', tracking: '0.1em', opacity: 0.4, marginBottom: 8 }}>Initial Agent Prompt</label>
                        <textarea 
                            className={styles.modalTextarea}
                            style={{ width: '100%', minHeight: 100 }}
                            placeholder="The instructions the AI receives..."
                            value={formData.agent_prompt}
                            onChange={e => setFormData(p => ({ ...p, agent_prompt: e.target.value }))}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                        <button type="button" className={styles.popupBtn} onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" className={styles.popupBtnHasContent} disabled={isSubmitting} style={{ flex: 1 }}>
                            {isSubmitting ? 'Creating...' : 'Create Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ═══ Main Admin Panel ═══
export default function AdminPanel() {
    const navigate = useNavigate();
    const { session, profile, loading: authLoading, isAuthenticated } = useBuilderAuth();
    const [components, setComponents] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [toast, setToast] = useState(null); // { message, type }
    const [activeTab, setActiveTab] = useState('components'); // 'components' | 'templates'
    const [showCreateTemplate, setShowCreateTemplate] = useState(false);

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

    // ─── Fetch Templates ───
    useEffect(() => {
        if (!session?.access_token || !accessChecked) return;

        const fetchTemplates = async () => {
            try {
                const res = await fetch('/api/admin/templates', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });
                const data = await res.json();
                if (data.success) {
                    setTemplates(data.templates);
                }
            } catch (err) {
                console.error('[Admin] Fetch templates failed:', err);
            }
        };

        fetchTemplates();
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

    // ─── Template Update Handler ───
    const handleTemplateUpdate = useCallback(async (templateId, updates) => {
        try {
            const res = await fetch('/api/admin/update-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ templateId, updates }),
            });
            const data = await res.json();
            if (data.success) {
                setToast({ message: '✓ Template Saved', type: 'success' });
                setTemplates(prev =>
                    prev.map(t => t.id === templateId ? { ...t, ...updates } : t)
                );
            } else {
                setToast({ message: `Error: ${data.error}`, type: 'error' });
            }
        } catch (err) {
            setToast({ message: `Save failed: ${err.message}`, type: 'error' });
        }

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
                    <span className={styles.headerTitle}>{activeTab === 'components' ? 'Component Admin' : 'Template Admin'}</span>
                    <span className={styles.headerBadge}>ADMIN</span>
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.componentCount}>
                        {activeTab === 'components'
                            ? `${filteredComponents.length} / ${components.length} components`
                            : `${templates.length} templates`
                        }
                    </span>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className={styles.toolbar} style={{ gap: 8 }}>
                <button
                    className={`${styles.popupBtn} ${activeTab === 'components' ? styles.popupBtnHasContent : ''}`}
                    onClick={() => setActiveTab('components')}
                    style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                    🧩 Components
                </button>
                <button
                    className={`${styles.popupBtn} ${activeTab === 'templates' ? styles.popupBtnHasContent : ''}`}
                    onClick={() => setActiveTab('templates')}
                    style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                    📋 Templates
                </button>
                <div style={{ flex: 1 }} />
                
                {activeTab === 'templates' && (
                    <button
                        className={styles.popupBtnHasContent}
                        onClick={() => setShowCreateTemplate(true)}
                        style={{ padding: '8px 18px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.05)' }}
                    >
                        + Add Template
                    </button>
                )}
            </div>

            {activeTab === 'components' && (
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
            )}

            <div className={styles.tableWrapper}>
                {activeTab === 'components' ? (
                    // ═══ Components Tab ═══
                    loading ? (
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
                    )
                ) : (
                    // ═══ Templates Tab ═══
                    templates.length === 0 ? (
                        <div className={styles.emptyState}>
                            No templates found.
                        </div>
                    ) : (
                        templates.map(tmpl => (
                            <TemplateCard
                                key={tmpl.id}
                                template={tmpl}
                                session={session}
                                onUpdate={handleTemplateUpdate}
                            />
                        ))
                    )
                )}
            </div>

            {/* Create Template Modal */}
            <CreateTemplateModal 
                isOpen={showCreateTemplate}
                onClose={() => setShowCreateTemplate(false)}
                onCreate={(newTmpl) => {
                    setTemplates(prev => [newTmpl, ...prev]);
                    setToast({ message: '✓ Template Created', type: 'success' });
                    setTimeout(() => setToast(null), 2000);
                }}
                session={session}
            />

            {/* Toast Notification */}
            {toast && (
                <div className={toast.type === 'error' ? styles.errorIndicator : styles.savedIndicator}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
