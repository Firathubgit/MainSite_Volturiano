import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OpenAIIcon, AnthropicIcon, GeminiIcon } from './ProviderIcons';
import styles from './PromptPage.module.css';
import { useRouteTransition } from '../contexts/RouteTransitionContext';
import { getDefaultPublicModelId, getPublicModels, normalizePublicModelId } from './model-registry.client.js';
import { IMAGE_UPLOAD_LIMITS, formatBytes, optimizeImageFiles } from './imageOptimizer.js';

const MODEL_STORAGE_KEY = 'volturiano_builder_model';
const PLACEHOLDER_PREFIX = 'Ask the agent to ';
const PLACEHOLDER_PHRASES = [
    'design a real estate site...',
    'build a restaurant landing page...',
    'create a sports club portal...',
    'make a product launch page...',
    'build a portfolio with a contact form...',
];

function iconForModel(id) {
    if (id.startsWith('openai/')) return <OpenAIIcon />;
    if (id.startsWith('anthropic/')) return <AnthropicIcon />;
    return <GeminiIcon />;
}

export default function PromptPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { startTransition } = useRouteTransition();

    const [inputValue, setInputValue] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [images, setImages] = useState([]);
    const [isOptimizingImages, setIsOptimizingImages] = useState(false);
    const [notification, setNotification] = useState(null);
    const [placeholderText, setPlaceholderText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const [isViewportDragging, setIsViewportDragging] = useState(false);
    const [selectedModel, setSelectedModel] = useState(() => {
        if (typeof window === 'undefined') return getDefaultPublicModelId();
        return normalizePublicModelId(localStorage.getItem(MODEL_STORAGE_KEY));
    });

    const dragCounter = useRef(0);
    const isDraggingRef = useRef(false);
    const inputFormRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const imagesRef = useRef(images);
    imagesRef.current = images;

    // `/?project=<id>` reopens an existing project.
    useEffect(() => {
        const projectId = new URLSearchParams(location.search).get('project');
        if (projectId) navigate(`/generation?project=${projectId}`, { replace: true });
    }, [location.search, navigate]);

    // Typewriter placeholder.
    useEffect(() => {
        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let timeout;

        const type = () => {
            const phrase = PLACEHOLDER_PHRASES[phraseIndex];
            charIndex += isDeleting ? -1 : 1;
            setPlaceholderText(PLACEHOLDER_PREFIX + phrase.substring(0, charIndex));

            let delay = isDeleting ? 40 : 80;
            if (!isDeleting && charIndex === phrase.length) {
                isDeleting = true;
                delay = 2000;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % PLACEHOLDER_PHRASES.length;
                delay = 500;
            }
            timeout = setTimeout(type, delay);
        };

        type();
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
    }, [selectedModel]);

    // Grow the textarea with its content, up to about five lines.
    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        const MIN_HEIGHT = 24;
        const MAX_HEIGHT = 120;
        el.style.height = `${MIN_HEIGHT}px`;
        const scrollHeight = el.scrollHeight;
        el.style.height = `${Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT)}px`;
        el.style.overflowY = scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
    }, [inputValue]);

    useEffect(() => {
        const handleTransitionCancel = () => setIsSubmitting(false);
        window.addEventListener('cinematic-transition-cancel', handleTransitionCancel);
        return () => window.removeEventListener('cinematic-transition-cancel', handleTransitionCancel);
    }, []);

    // Templates are optional: the section stays hidden when the registry has none.
    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/build-template?list=true', { signal: controller.signal })
            .then((res) => res.json())
            .then((data) => {
                if (data?.success) setTemplates(data.templates || []);
            })
            .catch(() => {});
        return () => controller.abort();
    }, []);

    const showNotification = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 5000);
    };

    const addOptimizedImages = async (files) => {
        const imageFiles = Array.from(files || []).filter((file) => file?.type?.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const existing = imagesRef.current;
        if (existing.length >= IMAGE_UPLOAD_LIMITS.maxImages) {
            showNotification(`Maximum of ${IMAGE_UPLOAD_LIMITS.maxImages} images allowed.`);
            return;
        }

        setIsOptimizingImages(true);
        try {
            const { images: optimizedImages, stats } = await optimizeImageFiles(imageFiles, {
                existingImages: existing,
            });

            if (optimizedImages.length > 0) {
                setImages((prev) => [...prev, ...optimizedImages].slice(0, IMAGE_UPLOAD_LIMITS.maxImages));
            }

            if (stats.optimizedCount > 0) {
                showNotification(
                    `Optimized ${stats.optimizedCount} image${stats.optimizedCount === 1 ? '' : 's'} for upload (${formatBytes(stats.originalBytes)} -> ${formatBytes(stats.optimizedBytes)}).`
                );
            } else if (stats.skippedForCount > 0) {
                showNotification(`Maximum of ${IMAGE_UPLOAD_LIMITS.maxImages} images allowed.`);
            } else if (stats.skippedForBudget > 0 || stats.failedCount > 0) {
                showNotification('Some images were too large to prepare. Try fewer images or a smaller screenshot.');
            }
        } finally {
            setIsOptimizingImages(false);
        }
    };

    // Drop images anywhere on the page. The input leans toward the cursor while dragging.
    useEffect(() => {
        const resetMagnet = () => {
            inputFormRef.current?.style.setProperty('--magnet-x', '0px');
            inputFormRef.current?.style.setProperty('--magnet-y', '0px');
        };

        const handleDragEnter = (e) => {
            e.preventDefault();
            if (e.dataTransfer.types.includes('Files')) {
                dragCounter.current++;
                setIsViewportDragging(true);
                isDraggingRef.current = true;
            }
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            dragCounter.current--;
            if (dragCounter.current === 0) {
                setIsViewportDragging(false);
                isDraggingRef.current = false;
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            if (!isDraggingRef.current || !inputFormRef.current) return;
            const rect = inputFormRef.current.getBoundingClientRect();
            const deltaX = e.clientX - (rect.left + rect.width / 2);
            const deltaY = e.clientY - (rect.top + rect.height / 2);
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxPull = 7;
            inputFormRef.current.style.setProperty('--magnet-x', `${distance > 0 ? (deltaX / distance) * maxPull : 0}px`);
            inputFormRef.current.style.setProperty('--magnet-y', `${distance > 0 ? (deltaY / distance) * maxPull : 0}px`);
        };

        const handleDrop = (e) => {
            e.preventDefault();
            dragCounter.current = 0;
            setIsViewportDragging(false);
            isDraggingRef.current = false;
            resetMagnet();
            if (e.dataTransfer?.files?.length > 0) addOptimizedImages(e.dataTransfer.files);
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);
        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePaste = (e) => {
        const pastedImages = Array.from(e.clipboardData?.items || [])
            .filter((item) => item.type.indexOf('image') !== -1)
            .map((item) => item.getAsFile())
            .filter(Boolean);
        if (pastedImages.length > 0) addOptimizedImages(pastedImages);
    };

    const executeSubmit = () => {
        setIsSubmitting(true);

        // Fade the prompt page out before the transition overlay covers it.
        const pageRoot = document.querySelector('[class*="outerWrapper"]');
        if (pageRoot) {
            pageRoot.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            pageRoot.style.opacity = '0';
            pageRoot.style.transform = 'translateY(40px) scale(0.88)';
            pageRoot.style.filter = 'blur(20px)';
        }
        window.dispatchEvent(new CustomEvent('cinematic-transition-start'));

        startTransition('/generation', {
            prompt: inputValue.trim() || (selectedTemplate ? `Build using ${selectedTemplate.name} template` : ''),
            images,
            premiumMode: 'hybrid',
            model: selectedModel,
            manualSelectionIds: [],
            initialComponents: [],
            strictMode: false,
            guidedIntake: !selectedTemplate,
            allowCommunityComponents: true,
            templateData: selectedTemplate
                ? {
                    templateId: selectedTemplate.templateId,
                    name: selectedTemplate.name,
                    thumbnail: selectedTemplate.thumbnail,
                    agentPrompt: selectedTemplate.agentPrompt,
                    userAdjustment: inputValue.trim() || null,
                }
                : null,
        });
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (isSubmitting) return;
        if (isOptimizingImages) {
            showNotification('Finishing image optimization before sending.');
            return;
        }
        if (inputValue.trim() || images.length > 0 || selectedTemplate) executeSubmit();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleTemplateSelect = (template) => {
        if (selectedTemplate?.templateId === template.templateId) {
            setSelectedTemplate(null);
            return;
        }
        setSelectedTemplate({
            templateId: template.templateId,
            name: template.name,
            thumbnail: template.thumbnailUrl || null,
            agentPrompt: template.agentPrompt || '',
            description: template.description,
        });
        inputFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const models = getPublicModels().map((model) => ({ ...model, icon: iconForModel(model.id) }));
    const currentModelIcon = models.find((m) => m.id === selectedModel)?.icon || <GeminiIcon />;

    return (
        <>
            <div className={styles.outerWrapper}>
                <div className={styles.pageContainer} />

                {templates.length > 0 && (
                    <div className={styles.templateSection}>
                        <div className={styles.templateSectionInner}>
                            <div className={styles.templateSectionHeader}>
                                <h2 className={styles.templateSectionTitle}>Start with a template</h2>
                            </div>
                            <div className={styles.templateGrid}>
                                {templates.map((tmpl) => (
                                    <div key={tmpl.templateId} className={styles.templateGridCard}>
                                        <div className={styles.templateGridThumb}>
                                            {tmpl.thumbnailUrl && (
                                                <img src={tmpl.thumbnailUrl} alt={tmpl.name} className={styles.templateGridImage} />
                                            )}
                                            <div className={styles.templateGridOverlay} />
                                            <div className={styles.templateCardActions}>
                                                <button
                                                    className={`${styles.templateActionBtn} ${styles.useTemplateBtn}`}
                                                    onClick={() => handleTemplateSelect(tmpl)}
                                                >
                                                    Use template
                                                </button>
                                            </div>
                                        </div>
                                        <div className={styles.templateGridInfo}>
                                            <h3 className={styles.templateGridName}>{tmpl.name}</h3>
                                            <span className={styles.templateGridDesc}>{tmpl.description}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.titleWrapper}>
                    <motion.div
                        initial={{ opacity: 0, y: -18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className={styles.heroLabel}>Volturiano Agent</h2>
                        <h1 className={styles.heroTitle}>
                            Describe a website.
                            <br />
                            Watch it get built.
                        </h1>
                    </motion.div>
                </div>

                <motion.div
                    className={styles.maestroWrapper}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div className={styles.floatingInputContainer}>
                        <form
                            ref={inputFormRef}
                            onSubmit={handleSubmit}
                            className={`${styles.inputForm} ${images.length > 0 || selectedTemplate ? styles.extended : ''} ${isViewportDragging ? styles.isDragging : ''}`}
                            onPaste={handlePaste}
                        >
                            <div className={styles.inputWithPreviews}>
                                {selectedTemplate && (
                                    <div className={styles.communityPreviews}>
                                        <div className={styles.communityItemsRow}>
                                            <div className={`${styles.communityPreviewItem} ${styles.communityPreviewItemActive}`}>
                                                {selectedTemplate.thumbnail && (
                                                    <img src={selectedTemplate.thumbnail} alt={selectedTemplate.name} />
                                                )}
                                                <div className={styles.compNameBadge}>{selectedTemplate.name}</div>
                                                <button
                                                    type="button"
                                                    className={styles.removeComponentBtn}
                                                    onClick={() => setSelectedTemplate(null)}
                                                    title="Remove template"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {images.length > 0 && (
                                    <div className={styles.imagePreviews} data-count={images.length}>
                                        {images.map((img, idx) => (
                                            <div key={idx} className={styles.previewItem}>
                                                <img src={img} alt="Attached reference" />
                                                <button
                                                    type="button"
                                                    className={styles.removeImgBtn}
                                                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={placeholderText}
                                    className={styles.textInput}
                                    disabled={isSubmitting}
                                    rows={1}
                                />
                            </div>

                            <div className={styles.actionButtons}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => addOptimizedImages(e.target.files)}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className={styles.iconButton}
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Attach reference images"
                                    disabled={isSubmitting}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                </button>

                                <div className={styles.modelSelectorContainer}>
                                    <button
                                        type="button"
                                        className={styles.modelSelectorButton}
                                        onClick={() => !isSubmitting && setIsModelDropdownOpen(!isModelDropdownOpen)}
                                        data-active={isModelDropdownOpen}
                                        title={`Model: ${selectedModel}`}
                                        disabled={isSubmitting}
                                    >
                                        <div className={styles.activeModelIconWrapper}>{currentModelIcon}</div>
                                    </button>

                                    <AnimatePresence>
                                        {isModelDropdownOpen && (
                                            <motion.div
                                                className={styles.modelDropdown}
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                            >
                                                {models.map((model) => (
                                                    <button
                                                        key={model.id}
                                                        type="button"
                                                        className={`${styles.modelOption} ${selectedModel === model.id ? styles.modelOptionActive : ''}`}
                                                        onClick={() => {
                                                            setSelectedModel(model.id);
                                                            setIsModelDropdownOpen(false);
                                                        }}
                                                    >
                                                        <span className={styles.modelOptionLeft}>
                                                            <span className={styles.modelOptionIcon}>{model.icon}</span>
                                                            <span className={styles.modelOptionLabel}>{model.label}</span>
                                                        </span>
                                                        {selectedModel === model.id && (
                                                            <svg className={styles.modelCheck} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        )}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div style={{ flex: 1 }} />

                                <button
                                    type="submit"
                                    className={`${styles.submitButton} ${inputValue.trim() || selectedTemplate ? styles.hasText : ''}`}
                                    disabled={isSubmitting}
                                    title="Build"
                                >
                                    {isSubmitting ? (
                                        <div className={styles.suspenseDot} />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>

            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={styles.notificationPopup}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {notification}
                </motion.div>
            )}
        </>
    );
}
