/**
 * AdminPanel — Builder Component Admin Dashboard
 * 
 * Accessible at /builder/Atalmoretti
 * Requires admin_role = true on the user's profile.
 * Non-admins are silently redirected to /builder.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    SandpackProvider,
    SandpackPreview,
    SandpackLayout,
} from '@codesandbox/sandpack-react';
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

// ═══ Video Upload Field ═══
function VideoUploadField({ value, onChange, componentId, label, session, bucket = 'builder-assets' }) {
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
                    <video src={value} className={styles.imagePreviewThumb} muted playsInline />
                )}
                <input
                    type="file"
                    ref={fileRef}
                    style={{ display: 'none' }}
                    accept="video/*"
                    onChange={handleFileChange}
                />
                <button
                    className={styles.uploadBtn}
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? '⏳ Uploading...' : '🎥 Upload'}
                </button>
            </div>
            {/* Fallback to text input for manual entry */}
            <input
                className={styles.fieldInput}
                style={{ marginTop: '8px' }}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Or paste video URL..."
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
function ComponentCard({ component, session, onUpdate, onDelete, onPreview }) {
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
                                <option value="pending_review">Pending Review</option>
                                <option value="flagged">Flagged</option>
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
                        <VideoUploadField
                            label="Preview Video URL"
                            value={local.preview_video_url}
                            onChange={(url) => updateField('preview_video_url', url)}
                            session={session}
                            componentId={component.id}
                        />
                    </div>

                    {/* 2-Step Popup Buttons */}
                    <div className={styles.popupBtnRow}>
                        {/* Live Sandpack preview — same modal the review queue uses. */}
                        <button
                            className={styles.popupBtn}
                            onClick={() => onPreview && onPreview(component)}
                            title="Render this component live in a Sandpack iframe"
                        >
                            ▶ Preview
                        </button>
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

                        {/* Destructive: hard-delete the component (cascades to
                            likes/ratings/reports/template_sections, removes
                            the thumbnail/video files from storage, and
                            archives the linked submission). */}
                        <button
                            className={styles.popupBtn}
                            onClick={() => onDelete && onDelete(component.id, local.display_name || local.name || component.component_id)}
                            style={{
                                marginLeft: 'auto',
                                color: '#f87171',
                                borderColor: 'rgba(239, 68, 68, 0.35)',
                            }}
                            title="Permanently delete this component (cannot be undone)"
                        >
                            🗑️ Delete
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
function getReviewPreviewUrl(item) {
    const direct =
        item?.thumbnail_url ||
        item?.preview_image_url ||
        item?.thumbnail_base64 ||
        item?.component?.thumbnail_url ||
        item?.component?.preview_image_url ||
        item?.template?.thumbnail_url ||
        item?.template?.preview_image_url;

    if (!direct) return null;
    const source = String(direct);
    if (source.startsWith('http') || source.startsWith('data:')) return source;
    if (source.length > 500) return `data:image/png;base64,${source}`;
    if (!builderSupabase) return direct;

    const { data } = builderSupabase.storage.from('builder-assets').getPublicUrl(source);
    return data?.publicUrl || source;
}

function ReviewMeta({ label, value }) {
    return (
        <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>{label}</span>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', overflowWrap: 'anywhere' }}>
                {value || '-'}
            </span>
        </div>
    );
}

function ReviewActionButton({ children, onClick, danger, disabled }) {
    return (
        <button
            className={danger ? styles.modalCancelBtn : styles.popupBtnHasContent}
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '8px 12px',
                fontSize: '0.78rem',
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                borderColor: danger ? 'rgba(239,68,68,0.35)' : undefined,
                color: danger ? '#f87171' : undefined
            }}
        >
            {children}
        </button>
    );
}

function ReviewListCard({ title, subtitle, status, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                textAlign: 'left',
                padding: 12,
                borderRadius: 10,
                border: selected ? '1px solid rgba(34,197,94,0.45)' : '1px solid rgba(255,255,255,0.07)',
                background: selected ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.025)',
                color: '#e4e4e7',
                cursor: 'pointer'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong style={{ fontSize: '0.86rem', color: '#fff' }}>{title}</strong>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>{status}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: '0.74rem', color: 'rgba(255,255,255,0.42)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subtitle}
            </div>
        </button>
    );
}

// ═══ Submission Sandpack Modal — Admin live preview of pending submissions ═══
//
// Mirrors the dependency auto-detection logic from SandpackPreviewPopup but
// works on raw submission code (no DB component needed) so admins can
// preview a component while it's still in pending_review / flagged status.
const SAFE_BASE_DEPS = {
    'lucide-react': 'latest',
    'framer-motion': 'latest',
    'clsx': 'latest',
    'tailwind-merge': 'latest',
    'color-bits': 'latest',
    'react-router-dom': 'latest',
};
const SAFE_HEAVY_PACKAGES = new Set([
    'three', '@react-three/fiber', '@react-three/drei',
    'ogl', 'cobe', 'react-icons', '@radix-ui/react-icons',
    'recharts', 'zustand', 'react-router-dom',
]);

function detectSandpackDeps(code) {
    const deps = { ...SAFE_BASE_DEPS };
    if (typeof code !== 'string' || !code) return deps;
    const importRx = /from\s+['"]([^'"]+)['"]/g;
    let im;
    while ((im = importRx.exec(code)) !== null) {
        const raw = im[1];
        if (raw.startsWith('.') || raw.startsWith('/')) continue;
        const pkg = raw.startsWith('@') ? raw.split('/').slice(0, 2).join('/') : raw.split('/')[0];
        if (SAFE_HEAVY_PACKAGES.has(pkg)) deps[pkg] = 'latest';
    }
    return deps;
}

// Components' source lives in `bundle_code`, which can be a plain string,
// a JSON-stringified single-file object, a multi-file `{ files: [...] }`
// shape, or an `{ content: '...' }` legacy shape. This normalizes all of
// those into `{ code, cssCode }` so the same Sandpack modal can render
// both review-queue submissions AND active-catalog components.
export function extractBundleCode(bundleCode) {
    if (!bundleCode) return { code: '', cssCode: '' };
    let raw = bundleCode;
    let cssCode = '';

    if (typeof raw === 'string' && (raw.trim().startsWith('{') || raw.trim().startsWith('['))) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') raw = parsed;
        } catch { /* leave as string */ }
    }

    if (raw && typeof raw === 'object') {
        if (typeof raw.css === 'string') cssCode = raw.css;
        else if (typeof raw.cssCode === 'string') cssCode = raw.cssCode;
        else if (raw.assets && typeof raw.assets.css === 'string') cssCode = raw.assets.css;

        if (Array.isArray(raw.files)) {
            const cssFile = raw.files.find((f) => typeof f.path === 'string' && f.path.endsWith('.css'));
            if (cssFile?.content && !cssCode) cssCode = cssFile.content;
            const main =
                raw.files.find((f) =>
                    typeof f.path === 'string' &&
                    (f.path.endsWith('.jsx') || f.path.endsWith('.tsx')) &&
                    typeof f.content === 'string' &&
                    f.content.includes('export default')
                ) ||
                raw.files.find((f) => typeof f.path === 'string' && f.path.endsWith('.jsx')) ||
                raw.files[0];
            return { code: main?.content || '', cssCode };
        }

        if (typeof raw.content === 'string') return { code: raw.content, cssCode };

        return { code: JSON.stringify(raw, null, 2), cssCode };
    }

    return { code: typeof raw === 'string' ? raw : '', cssCode };
}

// Builds a normalized preview object that the modal renders directly.
// Accepts either a community_submissions row OR a components row.
//
// `options.onSave(newCode) => Promise<void>` enables the modal's edit
// mode. When omitted, the modal stays read-only (used for submissions —
// admins shouldn't rewrite a user's submission from the review queue).
export function buildPreviewItem(source, options = {}) {
    if (!source) return null;
    if ('bundle_code' in source || 'component_id' in source) {
        const { code, cssCode } = extractBundleCode(source.bundle_code);
        return {
            id: source.id,
            kind: 'component',
            title: source.display_name || source.name || 'Component',
            subtitle: `component · ${source.status || 'unknown'} · ${source.component_id || source.id}`,
            code,
            cssCode,
            onSave: typeof options.onSave === 'function' ? options.onSave : null,
        };
    }
    return {
        id: source.id,
        kind: 'submission',
        title: source.name || 'Untitled submission',
        subtitle: `${source.submission_type || 'submission'} · ${source.status || 'unknown'} · ${source.id}`,
        code: source.cleaned_code || source.code || '',
        cssCode: source.css_code || '',
        onSave: null,
    };
}

function SandpackPreviewModal({ preview, isOpen, onClose }) {
    const [themeMode, setThemeMode] = useState('dark');
    const [showCode, setShowCode] = useState(false);

    // ── Editable code state ──
    // `liveCode` is what the Sandpack actually renders. `draft` is what
    // the user is currently typing. They diverge while editing and re-
    // converge after Save (or are reset on Discard). `editVersion` bumps
    // on save to force a fresh Sandpack mount so the iframe rebuilds.
    const [liveCode, setLiveCode] = useState('');
    const [draft, setDraft] = useState('');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [editVersion, setEditVersion] = useState(0);

    const canEdit = typeof preview?.onSave === 'function';

    useEffect(() => {
        if (!isOpen) return;
        // Reset everything whenever a new preview opens.
        setLiveCode(preview?.code || '');
        setDraft(preview?.code || '');
        setEditing(false);
        setSaveError(null);
        setShowCode(false);
        setEditVersion(0);
    }, [isOpen, preview?.id]);
    // Note: deliberately keying off id, not code, so that loading the modal
    // for the same item again (e.g. after a parent state refresh) does not
    // discard an in-progress edit.

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            // Don't close on Escape mid-save or while editing — too easy
            // to lose work. The user can hit Discard or Save explicitly.
            if (e.key === 'Escape' && !editing && !saving) onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose, editing, saving]);

    const code = liveCode;
    const cssCode = preview?.cssCode || '';

    const dependencies = useMemo(() => detectSandpackDeps(code), [code]);

    const dirty = editing && draft !== liveCode;

    const handleStartEdit = () => {
        if (!canEdit) return;
        setEditing(true);
        setShowCode(true);
        setSaveError(null);
    };

    const handleDiscard = () => {
        setDraft(liveCode);
        setEditing(false);
        setSaveError(null);
    };

    const handleSave = async () => {
        if (!preview?.onSave) return;
        setSaving(true);
        setSaveError(null);
        try {
            await preview.onSave(draft);
            setLiveCode(draft);
            setEditing(false);
            setEditVersion((v) => v + 1);
        } catch (err) {
            setSaveError(err.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    // Tab/Shift-Tab insert two spaces or dedent — basic IDE-like UX.
    const handleEditorKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = e.target;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            if (e.shiftKey) {
                // Dedent the line starting at `start`.
                const before = draft.lastIndexOf('\n', start - 1) + 1;
                const lineStart = draft.slice(before, before + 2);
                if (lineStart === '  ') {
                    const next = draft.slice(0, before) + draft.slice(before + 2);
                    setDraft(next);
                    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = Math.max(before, start - 2); });
                }
            } else {
                const next = draft.slice(0, start) + '  ' + draft.slice(end);
                setDraft(next);
                requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
            }
        } else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
            // Cmd/Ctrl-S to save while editing.
            e.preventDefault();
            if (dirty && !saving) handleSave();
        }
    };

    const sandpackFiles = useMemo(() => ({
        '/App.jsx': code || '// No source code available.\nexport default function App(){return <div>No code</div>}',
        '/style.css': cssCode || '',
        '/index.js': `import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
${'react-router-dom' in dependencies ? 'import { BrowserRouter } from "react-router-dom";' : ''}
import "./style.css";
import App from "./App.jsx";

const root = createRoot(document.getElementById("root"));
document.body.style.backgroundColor = "${themeMode === 'light' ? '#ffffff' : '#000000'}";
document.body.style.color = "${themeMode === 'light' ? '#000000' : '#ffffff'}";

const isRouterNeeded = ${'react-router-dom' in dependencies ? 'true' : 'false'};
const hasOwnRouter = App.toString && (App.toString().includes('BrowserRouter') || App.toString().includes('MemoryRouter') || App.toString().includes('HashRouter') || App.toString().includes('Router>'));
const AppWrapper = (isRouterNeeded && !hasOwnRouter) ? BrowserRouter : React.Fragment;

root.render(
  <StrictMode>
    <AppWrapper>
      <div className="${themeMode === 'light' ? 'bg-white' : 'bg-transparent'} min-h-screen w-full">
        <App />
      </div>
    </AppWrapper>
  </StrictMode>
);`,
    }), [code, cssCode, dependencies, themeMode]);

    if (!isOpen || !preview) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 1280, height: '88vh',
                    background: '#0F0F0F', borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 500 }}>
                            {preview.title}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', overflowWrap: 'anywhere' }}>
                            {preview.subtitle}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {/* Editing state — Save / Discard replace the toggle. */}
                        {editing ? (
                            <>
                                <span style={{
                                    color: dirty ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                                    fontSize: '0.72rem',
                                    marginRight: 4,
                                }}>
                                    {dirty ? '● unsaved' : 'no changes'}
                                </span>
                                <button
                                    className={styles.modalCancelBtn}
                                    onClick={handleDiscard}
                                    disabled={saving}
                                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                >
                                    Discard
                                </button>
                                <button
                                    className={styles.popupBtnHasContent}
                                    onClick={handleSave}
                                    disabled={!dirty || saving}
                                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                    title="Save and re-render (⌘/Ctrl+S)"
                                >
                                    {saving ? 'Saving…' : '💾 Save'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className={styles.popupBtn}
                                    onClick={() => setShowCode((v) => !v)}
                                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                >
                                    {showCode ? 'Preview' : '{ } Code'}
                                </button>
                                {canEdit && (
                                    <button
                                        className={styles.popupBtn}
                                        onClick={handleStartEdit}
                                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                        title="Edit this component's source code"
                                    >
                                        ✏️ Edit
                                    </button>
                                )}
                                <button
                                    className={styles.popupBtn}
                                    onClick={() => setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))}
                                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                    title="Toggle theme"
                                >
                                    {themeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}
                                </button>
                                <button
                                    className={styles.modalCancelBtn}
                                    onClick={onClose}
                                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                >
                                    ✕
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {saveError && (
                    <div style={{
                        padding: '10px 20px',
                        background: 'rgba(239,68,68,0.08)',
                        borderBottom: '1px solid rgba(239,68,68,0.25)',
                        color: '#ff8a8a',
                        fontSize: '0.78rem',
                    }}>
                        Save failed: {saveError}
                    </div>
                )}

                {/* Body */}
                <div
                    className={!showCode && code && !editing ? styles.sandpackPreviewArea : ''}
                    style={{
                        flex: 1,
                        minHeight: 0,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        background: themeMode === 'dark' ? '#000' : '#fff',
                    }}
                >
                    {editing ? (
                        // Editable source. Plain textarea — light enough to keep
                        // the modal snappy, with tab-handling for code editing.
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleEditorKeyDown}
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="off"
                            style={{
                                flex: 1,
                                minHeight: 0,
                                padding: 20,
                                background: '#0b0b0d',
                                color: 'rgba(255,255,255,0.92)',
                                fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace',
                                fontSize: '0.8rem',
                                lineHeight: 1.55,
                                border: 'none',
                                outline: 'none',
                                resize: 'none',
                                whiteSpace: 'pre',
                                tabSize: 2,
                            }}
                        />
                    ) : showCode ? (
                        <pre style={{
                            margin: 0, flex: 1, minHeight: 0, overflow: 'auto',
                            padding: 20,
                            background: 'rgba(0,0,0,0.55)',
                            color: 'rgba(255,255,255,0.85)',
                            fontSize: '0.78rem', lineHeight: 1.55,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                            {code || 'No source code available.'}
                        </pre>
                    ) : code ? (
                        <SandpackProvider
                            // Include editVersion in the key so a saved edit
                            // forces a fresh Sandpack mount and the iframe
                            // re-bundles with the new files.
                            key={`${preview.id}-${themeMode}-${editVersion}`}
                            template="react"
                            files={sandpackFiles}
                            customSetup={{ dependencies }}
                            theme={themeMode}
                            options={{
                                autoRun: true,
                                externalResources: ['https://cdn.tailwindcss.com'],
                            }}
                        >
                            <SandpackLayout style={{
                                display: 'flex', flexDirection: 'column',
                                height: '100%', width: '100%',
                                border: 'none', background: 'transparent',
                            }}>
                                <SandpackPreview
                                    showNavigator={false}
                                    showRefreshButton={true}
                                    showOpenInCodeSandbox={false}
                                    style={{ flex: 1, minHeight: 0, border: 'none', background: 'transparent' }}
                                />
                            </SandpackLayout>
                        </SandpackProvider>
                    ) : (
                        <div style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem',
                        }}>
                            No source code stored for this item.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ReviewQueuePanel({ queue, selectedItem, onSelect, onSubmissionAction, onReportAction, onTakedownAction, busyId, onPreviewSubmission, filters, onFiltersChange }) {
    const allSubmissions = queue?.submissions || [];
    const reports = queue?.reports || [];
    const takedowns = queue?.takedowns || [];

    // ── Apply filters to submissions only ──
    const submissions = allSubmissions.filter((s) => {
        if (filters.status !== 'all' && s.status !== filters.status) return false;
        if (filters.type !== 'all' && s.submission_type !== filters.type) return false;
        if (filters.search) {
            const q = filters.search.toLowerCase();
            const haystack = [
                s.name, s.description, s.category_hint, s.id,
                s.author?.username, s.author?.display_name, s.user_id,
            ].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    });

    const selectedKey = selectedItem ? `${selectedItem.kind}:${selectedItem.item.id}` : '';
    const selected = selectedItem?.item || null;
    const previewUrl = selected ? getReviewPreviewUrl(selected) : null;

    const askReason = (action) => {
        if (!['reject', 'flag', 'archive', 'accept'].includes(action)) return '';
        return window.prompt('Optional moderation note:', '') || '';
    };

    const renderSubmissionDetails = (submission) => {
        const code = submission.cleaned_code || submission.code || '';
        const isBusy = busyId === `submission:${submission.id}`;
        return (
            <>
                <div className={styles.fieldsGrid}>
                    <ReviewMeta label="Type" value={submission.submission_type} />
                    <ReviewMeta label="Status" value={submission.status} />
                    <ReviewMeta label="Quality" value={submission.quality_score ?? '-'} />
                    <ReviewMeta label="Author" value={submission.author?.username || submission.author?.display_name || submission.user_id} />
                    <ReviewMeta label="IP Attested" value={submission.ip_attestation_accepted_at ? new Date(submission.ip_attestation_accepted_at).toLocaleString() : 'No'} />
                    <ReviewMeta label="License Grant" value={submission.license_grant_accepted_at ? `${submission.license_type || 'MIT'} accepted` : 'No'} />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                    <ReviewActionButton disabled={isBusy} onClick={() => onPreviewSubmission && onPreviewSubmission(submission)}>
                        ▶ Open in Sandpack
                    </ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} onClick={() => onSubmissionAction(submission, 'approve', askReason('approve'))}>Approve</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} danger onClick={() => onSubmissionAction(submission, 'reject', askReason('reject'))}>Reject</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} danger onClick={() => onSubmissionAction(submission, 'flag', askReason('flag'))}>Flag</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} danger onClick={() => onSubmissionAction(submission, 'archive', askReason('archive'))}>Archive</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} onClick={() => onSubmissionAction(submission, 'restore', askReason('restore'))}>Restore</ReviewActionButton>
                </div>

                {(submission.reports?.length > 0 || submission.takedowns?.length > 0) && (
                    <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
                        {submission.reports?.map(report => (
                            <div key={report.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.08)', fontSize: '0.78rem' }}>
                                Report: {report.reason} {report.details ? `- ${report.details}` : ''}
                            </div>
                        ))}
                        {submission.takedowns?.map(takedown => (
                            <div key={takedown.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.08)', fontSize: '0.78rem' }}>
                                Takedown: {takedown.requester_email} - {takedown.claim_summary}
                            </div>
                        ))}
                    </div>
                )}

                <pre style={{
                    marginTop: 18,
                    maxHeight: 320,
                    overflow: 'auto',
                    padding: 14,
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.42)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.76)',
                    fontSize: '0.75rem',
                    lineHeight: 1.55
                }}>{code || 'No source code stored for this submission.'}</pre>
            </>
        );
    };

    const renderReportDetails = (report) => {
        const isBusy = busyId === `report:${report.id}`;
        return (
            <>
                <div className={styles.fieldsGrid}>
                    <ReviewMeta label="Reason" value={report.reason} />
                    <ReviewMeta label="Status" value={report.status} />
                    <ReviewMeta label="Reporter" value={report.reporter?.username || report.reported_by} />
                    <ReviewMeta label="Component" value={report.component?.display_name || report.component?.name || report.component_id} />
                </div>
                <div style={{ marginTop: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
                    {report.details || 'No extra details.'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                    <ReviewActionButton disabled={isBusy} onClick={() => onReportAction(report, 'triage', askReason('triage'))}>Triage</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} onClick={() => onReportAction(report, 'resolve', askReason('resolve'))}>Resolve</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} danger onClick={() => onReportAction(report, 'reject', askReason('reject'))}>Reject Report</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} danger onClick={() => onReportAction(report, 'archive', askReason('archive'))}>Archive Component</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} onClick={() => onReportAction(report, 'restore', askReason('restore'))}>Restore Component</ReviewActionButton>
                </div>
            </>
        );
    };

    const renderTakedownDetails = (takedown) => {
        const isBusy = busyId === `takedown:${takedown.id}`;
        return (
            <>
                <div className={styles.fieldsGrid}>
                    <ReviewMeta label="Requester" value={takedown.requester_email} />
                    <ReviewMeta label="Status" value={takedown.status} />
                    <ReviewMeta label="Component" value={takedown.component?.display_name || takedown.component?.name || takedown.component_id} />
                    <ReviewMeta label="Submission" value={takedown.submission?.name || takedown.submission_id} />
                </div>
                <div style={{ marginTop: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
                    {takedown.claim_summary}
                </div>
                <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>
                    {JSON.stringify(takedown.evidence || [], null, 2)}
                </pre>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                    <ReviewActionButton disabled={isBusy} onClick={() => onTakedownAction(takedown, 'under_review', askReason('under_review'))}>Mark Reviewing</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} danger onClick={() => onTakedownAction(takedown, 'accept', askReason('accept'))}>Accept + Archive</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} danger onClick={() => onTakedownAction(takedown, 'reject', askReason('reject'))}>Reject Claim</ReviewActionButton>
                    <ReviewActionButton disabled={isBusy} onClick={() => onTakedownAction(takedown, 'restore', askReason('restore'))}>Restore Component</ReviewActionButton>
                </div>
            </>
        );
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, paddingTop: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <section style={{ display: 'grid', gap: 8 }}>
                    <span className={styles.fieldLabel}>
                        Submissions ({submissions.length}{submissions.length !== allSubmissions.length ? ` / ${allSubmissions.length}` : ''})
                    </span>

                    {/* ── Filters ── */}
                    <div style={{ display: 'grid', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <input
                            className={styles.searchInput}
                            placeholder="Search by name, author, ID..."
                            value={filters.search}
                            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                            style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                            <select
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <option value="all">All statuses</option>
                                <option value="pending_review">Pending review</option>
                                <option value="flagged">Flagged</option>
                            </select>
                            <select
                                className={styles.filterSelect}
                                value={filters.type}
                                onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <option value="all">All types</option>
                                <option value="component">Components</option>
                                <option value="template">Templates</option>
                            </select>
                        </div>
                        {(filters.status !== 'all' || filters.type !== 'all' || filters.search) && (
                            <button
                                className={styles.popupBtn}
                                onClick={() => onFiltersChange({ status: 'all', type: 'all', search: '' })}
                                style={{ padding: '6px 10px', fontSize: '0.72rem' }}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    {submissions.length === 0 ? (
                        <div className={styles.emptyState} style={{ padding: 20 }}>
                            {allSubmissions.length === 0
                                ? 'No pending submissions.'
                                : 'No submissions match the current filters.'}
                        </div>
                    ) : submissions.map(submission => (
                        <ReviewListCard
                            key={submission.id}
                            title={submission.name}
                            subtitle={`${submission.submission_type} - ${submission.author?.username || submission.user_id}`}
                            status={submission.status}
                            selected={selectedKey === `submission:${submission.id}`}
                            onClick={() => onSelect({ kind: 'submission', item: submission })}
                        />
                    ))}
                </section>
                <section style={{ display: 'grid', gap: 8 }}>
                    <span className={styles.fieldLabel}>Reports ({reports.length})</span>
                    {reports.map(report => (
                        <ReviewListCard
                            key={report.id}
                            title={report.reason}
                            subtitle={report.component?.display_name || report.component?.name || report.component_id}
                            status={report.status}
                            selected={selectedKey === `report:${report.id}`}
                            onClick={() => onSelect({ kind: 'report', item: report })}
                        />
                    ))}
                </section>
                <section style={{ display: 'grid', gap: 8 }}>
                    <span className={styles.fieldLabel}>Takedowns ({takedowns.length})</span>
                    {takedowns.map(takedown => (
                        <ReviewListCard
                            key={takedown.id}
                            title={takedown.requester_email}
                            subtitle={takedown.component?.display_name || takedown.submission?.name || takedown.component_id || takedown.submission_id}
                            status={takedown.status}
                            selected={selectedKey === `takedown:${takedown.id}`}
                            onClick={() => onSelect({ kind: 'takedown', item: takedown })}
                        />
                    ))}
                </section>
            </div>

            <div className={styles.componentCard} style={{ display: 'block', marginTop: 0, minHeight: 520 }}>
                {!selectedItem ? (
                    <div className={styles.emptyState}>Select a submission, report, or takedown.</div>
                ) : (
                    <>
                        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                            <div className={styles.cardThumb}>
                                {previewUrl ? <img src={previewUrl} alt="" /> : <div className={styles.cardThumbFallback}>{(selected.name || selected.reason || selected.requester_email || '?')[0]}</div>}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.cardName}>{selected.name || selected.reason || selected.requester_email}</span>
                                    <span className={styles.cardCategory}>{selectedItem.kind}</span>
                                    <span className={styles.cardId}>{selected.id}</span>
                                </div>
                                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
                                    {selected.description || selected.claim_summary || selected.details || 'No description.'}
                                </p>
                            </div>
                        </div>

                        <div style={{ marginTop: 20 }}>
                            {selectedItem.kind === 'submission' && renderSubmissionDetails(selected)}
                            {selectedItem.kind === 'report' && renderReportDetails(selected)}
                            {selectedItem.kind === 'takedown' && renderTakedownDetails(selected)}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function AdminPanel() {
    const navigate = useNavigate();
    const { session, profile, loading: authLoading, isAuthenticated } = useBuilderAuth();
    const [components, setComponents] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [issuesItems, setIssuesItems] = useState([]);
    const [reviewQueue, setReviewQueue] = useState({ submissions: [], reports: [], takedowns: [] });
    const [selectedReviewItem, setSelectedReviewItem] = useState(null);
    const [reviewBusyId, setReviewBusyId] = useState(null);
    const [reviewFilters, setReviewFilters] = useState({ status: 'all', type: 'all', search: '' });
    // Single preview slot — feeds the SandpackPreviewModal. Holds a
    // normalized {id, title, subtitle, code, cssCode} regardless of whether
    // the source was a community_submission row or an active component row.
    const [previewItem, setPreviewItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [toast, setToast] = useState(null); // { message, type }
    const [activeTab, setActiveTab] = useState('components'); // components | templates | review | feedback | issues
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

    const fetchReviewQueue = useCallback(async () => {
        if (!session?.access_token) return;
        const res = await fetch('/api/admin/review-queue', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const data = await res.json();
        if (data.success) {
            const nextQueue = {
                submissions: data.submissions || [],
                reports: data.reports || [],
                takedowns: data.takedowns || []
            };
            setReviewQueue(nextQueue);
            setSelectedReviewItem(prev => {
                if (!prev) return prev;
                const list = nextQueue[`${prev.kind}s`] || [];
                const refreshed = list.find(item => item.id === prev.item.id);
                return refreshed ? { kind: prev.kind, item: refreshed } : null;
            });
        }
    }, [session?.access_token]);

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

    // ─── Fetch Data ───
    useEffect(() => {
        if (!session?.access_token || !accessChecked) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const headers = { 'Authorization': `Bearer ${session.access_token}` };
                
                // Fetch all data in parallel
                const [compRes, tmplRes, feedRes, issueRes, reviewRes] = await Promise.all([
                    fetch('/api/admin/components', { headers }),
                    fetch('/api/admin/templates', { headers }),
                    fetch('/api/admin/feedback', { headers }),
                    fetch('/api/admin/issues', { headers }),
                    fetch('/api/admin/review-queue', { headers })
                ]);

                const [compData, tmplData, feedData, issueData, reviewData] = await Promise.all([
                    compRes.json(),
                    tmplRes.json(),
                    feedRes.json(),
                    issueRes.json(),
                    reviewRes.json()
                ]);

                if (compData.success) setComponents(compData.components);
                if (tmplData.success) setTemplates(tmplData.templates);
                if (feedData.success) setFeedbackItems(feedData.feedback || []);
                if (issueData.success) setIssuesItems(issueData.issues || []);
                if (reviewData.success) {
                    setReviewQueue({
                        submissions: reviewData.submissions || [],
                        reports: reviewData.reports || [],
                        takedowns: reviewData.takedowns || []
                    });
                }
            } catch (err) {
                console.error('[Admin] Fetch failed:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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

    // ─── Delete Handler ───
    // Hard-deletes a component and its assets. The backend cascades the
    // relational cleanup (likes/ratings/reports/template_sections) and
    // best-effort removes thumbnail/preview files from Supabase Storage.
    const handleDelete = useCallback(async (componentId, displayName) => {
        if (!componentId) return;
        const label = displayName || 'this component';
        const confirmed = window.confirm(
            `Permanently delete "${label}"?\n\n` +
            `This will:\n` +
            `  • Remove the component from the catalog\n` +
            `  • Delete its thumbnail, preview image, and preview video\n` +
            `  • Wipe its likes, ratings, reports, and template links\n` +
            `  • Archive the linked submission\n\n` +
            `This cannot be undone.`
        );
        if (!confirmed) return;

        try {
            const res = await fetch('/api/admin/delete-component', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ componentId }),
            });
            const data = await res.json();
            if (data.success) {
                setComponents(prev => prev.filter(c => c.id !== componentId));
                const removedFiles = (data.storageRemoved || []).filter(r => r.removed).length;
                setToast({
                    message: removedFiles > 0
                        ? `✓ Deleted (also removed ${removedFiles} file${removedFiles === 1 ? '' : 's'} from storage)`
                        : '✓ Deleted',
                    type: 'success',
                });
            } else {
                setToast({ message: `Delete failed: ${data.error}`, type: 'error' });
            }
        } catch (err) {
            setToast({ message: `Delete failed: ${err.message}`, type: 'error' });
        }

        setTimeout(() => setToast(null), 2400);
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
    const postReviewAction = useCallback(async (url, body, busyKey, successMessage) => {
        setReviewBusyId(busyKey);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!data.success) {
                setToast({ message: `Error: ${data.error}`, type: 'error' });
                return;
            }
            setToast({ message: successMessage, type: 'success' });
            await fetchReviewQueue();
        } catch (err) {
            setToast({ message: `Review action failed: ${err.message}`, type: 'error' });
        } finally {
            setReviewBusyId(null);
            setTimeout(() => setToast(null), 2200);
        }
    }, [session?.access_token, fetchReviewQueue]);

    const handleSubmissionReview = useCallback((submission, decision, reason) => {
        return postReviewAction(
            '/api/admin/review-submission',
            { submissionId: submission.id, decision, reason },
            `submission:${submission.id}`,
            `Submission ${decision} complete`
        );
    }, [postReviewAction]);

    const handleReportReview = useCallback((report, action, reason) => {
        return postReviewAction(
            '/api/admin/review-report',
            { reportId: report.id, action, reason },
            `report:${report.id}`,
            `Report ${action} complete`
        );
    }, [postReviewAction]);

    const handleTakedownReview = useCallback((takedown, action, reason) => {
        return postReviewAction(
            '/api/admin/review-takedown',
            { takedownId: takedown.id, action, reason },
            `takedown:${takedown.id}`,
            `Takedown ${action} complete`
        );
    }, [postReviewAction]);

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
    const reviewCount = (reviewQueue.submissions?.length || 0) + (reviewQueue.reports?.length || 0) + (reviewQueue.takedowns?.length || 0);
    const headerTitle = activeTab === 'components'
        ? 'Component Admin'
        : activeTab === 'templates'
            ? 'Template Admin'
            : activeTab === 'review'
                ? 'Review Queue'
                : activeTab === 'feedback'
                    ? 'Feedback'
                    : 'Issues';
    const headerCount = activeTab === 'components'
        ? `${filteredComponents.length} / ${components.length} components`
        : activeTab === 'templates'
            ? `${templates.length} templates`
            : activeTab === 'review'
                ? `${reviewCount} review items`
                : activeTab === 'feedback'
                    ? `${feedbackItems.length} feedback`
                    : `${issuesItems.length} issues`;

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
                    <span className={styles.headerTitle}>{headerTitle}</span>
                    <span className={styles.headerBadge}>ADMIN</span>
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.componentCount}>
                        {headerCount}
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
                <button
                    className={`${styles.popupBtn} ${activeTab === 'feedback' ? styles.popupBtnHasContent : ''}`}
                    onClick={() => setActiveTab('feedback')}
                    style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                    💬 Feedback
                </button>
                <button
                    className={`${styles.popupBtn} ${activeTab === 'review' ? styles.popupBtnHasContent : ''}`}
                    onClick={() => setActiveTab('review')}
                    style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                    Review ({reviewCount})
                </button>
                <button
                    className={`${styles.popupBtn} ${activeTab === 'issues' ? styles.popupBtnHasContent : ''}`}
                    onClick={() => setActiveTab('issues')}
                    style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                    🚨 Issues
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
                                onDelete={handleDelete}
                                onPreview={(c) => setPreviewItem(buildPreviewItem(c, {
                                    // The modal calls this from its Save
                                    // button. We persist via the existing
                                    // /api/admin/update-component endpoint
                                    // (now whitelists `bundle_code`) and
                                    // mirror the change into local state so
                                    // the card and any future Preview reflect
                                    // the new source without a refetch.
                                    onSave: async (newCode) => {
                                        const res = await fetch('/api/admin/update-component', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${session?.access_token}`,
                                            },
                                            body: JSON.stringify({
                                                componentId: c.id,
                                                updates: { bundle_code: newCode },
                                            }),
                                        });
                                        const data = await res.json();
                                        if (!data.success) {
                                            throw new Error(data.error || 'Save failed');
                                        }
                                        setComponents((prev) =>
                                            prev.map((row) => row.id === c.id
                                                ? { ...row, bundle_code: newCode }
                                                : row)
                                        );
                                        setToast({ message: '✓ Code saved', type: 'success' });
                                        setTimeout(() => setToast(null), 2000);
                                    },
                                }))}
                            />
                        ))
                    )
                ) : activeTab === 'templates' ? (
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
                ) : activeTab === 'review' ? (
                    loading ? (
                        <div className={styles.loadingState}>
                            <div className={styles.spinner} />
                            <span>Loading review queue...</span>
                        </div>
                    ) : (
                        <ReviewQueuePanel
                            queue={reviewQueue}
                            selectedItem={selectedReviewItem}
                            onSelect={setSelectedReviewItem}
                            onSubmissionAction={handleSubmissionReview}
                            onReportAction={handleReportReview}
                            onTakedownAction={handleTakedownReview}
                            busyId={reviewBusyId}
                            filters={reviewFilters}
                            onFiltersChange={setReviewFilters}
                            onPreviewSubmission={(submission) => setPreviewItem(buildPreviewItem(submission))}
                        />
                    )
                ) : activeTab === 'feedback' ? (
                    // ═══ Feedback Tab ═══
                    feedbackItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            No feedback found.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {feedbackItems.map(item => (
                                <div key={item.id} className={styles.componentCard} style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <span style={{ fontSize: '0.85rem', color: '#888' }}>{new Date(item.created_at).toLocaleString()}</span>
                                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>Status: {item.status || 'open'}</span>
                                    </div>
                                    <div style={{ marginBottom: 16, lineHeight: 1.6, color: '#e0e0e0', fontSize: '0.95rem' }}>{item.content}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#aaa', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                                        <span>User ID: {item.user_id}</span>
                                        {item.page_source && <span>Source: {item.page_source}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    // ═══ Issues Tab ═══
                    issuesItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            No issues reported.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {issuesItems.map(item => (
                                <div key={item.id} className={styles.componentCard} style={{ padding: 16, borderLeft: '4px solid #ef4444' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <span style={{ fontSize: '0.85rem', color: '#888' }}>{new Date(item.created_at).toLocaleString()}</span>
                                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Status: {item.status || 'open'}</span>
                                    </div>
                                    <div style={{ marginBottom: 16, lineHeight: 1.6, color: '#e0e0e0', fontSize: '0.95rem' }}>{item.content}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#aaa', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                                        <span>User ID: {item.user_id}</span>
                                        {item.page_source && <span>Source: {item.page_source}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
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

            {/* Live Sandpack preview — handles both pending submissions
                (Review tab) and active library components (Components tab). */}
            <SandpackPreviewModal
                preview={previewItem}
                isOpen={!!previewItem}
                onClose={() => setPreviewItem(null)}
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
