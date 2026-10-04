import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLayers, FiZap, FiSlash, FiCpu } from 'react-icons/fi';
import { PlusIcon, ArrowRight, LayoutGrid } from 'lucide-react';
import { OpenAIIcon, AnthropicIcon, GeminiIcon } from './BuilderIcons2';
import { ThemeProvider } from '../../context/ThemeContext';
import styles from './Builder.module.css';
import { useBuilderAuth } from '../../../../contexts/BuilderAuthContext';
import { useCredits } from '../../../../hooks/useCredits';
import { builderSupabase } from '../../../../lib/builderSupabaseClient';
import weirdButtonGradient from './Dashboard/Assets/WeirdButtonGradient.png';
import { OnboardingPopup } from './components/OnboardingPopup';
import GradualBlur from './GradualBlur';
import { useRouteTransition } from '../../../../contexts/RouteTransitionContext';
import CommunitySelectorPopup from './Generation/CommunitySelectorPopup';
import AuthGateModal from '../../../../components/Modals/AuthGateModal';
import CreditLimitModal from '../../../../components/Modals/CreditLimitModal';
import CongratsModal from './Dashboard/components/CongratsModal';
import gradientCornerImage from './Dashboard/Assets/GradientCornerOne.png';
import { getDefaultPublicModelId, getPublicModels, normalizePublicModelId } from './model-registry.client.js';
import { IMAGE_UPLOAD_LIMITS, formatBytes, optimizeImageFiles } from './utils/imageOptimizer.js';

// Import assets (Reference page thumbnails)
import scaleIntelligenceThumbnail from '../../../../assets/ScaleIntelegenceMocup.png';
import europaBageriThumbnail from '../../../../assets/EuropaBageriMockipadpic.png';
import furgloveThumbnail from '../../../../assets/FurGloveExample.png';
import euroTaxiThumbnail from '../../../../assets/EuroTaxiExample.png';
import solarExampleThumbnail from '../../../../assets/SolarExample.png';
import mathornanThumbnail from '../../../../assets/Mathörnan.png';
import chockladThumbnail from '../../../../assets/Chocklad.png';
import platformThumbnail from '../../../../assets/114shots_so.png';
import qyvoraClimateThumbnail from '../../../../assets/87shots_so.png';
import rivelonThumbnail from '../../../../assets/134shots_so.png';
import heroVideo from '../../../../assets/BackgroundVid.mp4';
import tornadoLogo from '../../../../assets/Logo/TornadoLogo.png';

// Template metadata mapping (Thumbnails + Demo URLs)
const TEMPLATE_METADATA = {
    'template.agency.dark.v1': {
        thumbnail: scaleIntelligenceThumbnail,
        url: 'https://wave-form-example-website.vercel.app/?'
    },
    'template.rivelon.leather.v1': {
        thumbnail: rivelonThumbnail,
        url: 'https://aura-premium-digital-experience.vercel.app/'
    },
    'template.solar.scope.v1': {
        thumbnail: solarExampleThumbnail,
        url: 'https://solar-example.vercel.app/'
    },
    'template.qyvora.climate.v1': {
        thumbnail: qyvoraClimateThumbnail,
        url: 'https://climate-nu-cyan.vercel.app/'
    },
};

const BuilderContent = () => {
    const location = useLocation();
    const navigate = useNavigate();


    // Phase S11: Handle incoming selected components from Hub
    useEffect(() => {
        const params = new URLSearchParams(location.search);

        // Handle project loading
        const projectId = params.get('project');
        if (projectId) {
            navigate(`/builder/generation?project=${projectId}`, { replace: true });
            return;
        }

        // Handle community imports -> intercept and load into input instead of routing
        const importedComponents = location.state?.importedComponents;
        const importIds = params.get('import');

        if (importedComponents && Array.isArray(importedComponents)) {
            setSelectedComponents(prev => {
                const existingIds = new Set(prev.map(c => c.id));
                const newComps = importedComponents.filter(c => !existingIds.has(c.id));
                return [...prev, ...newComps];
            });
            // Clear the URL and state so we don't keep adding them
            navigate('/builder', { replace: true, state: {} });
            return;
        }

        if (importIds) {
            const ids = importIds.split(',');
            // Cleanest approach FAKE components fallback
            const genericComps = ids.map(id => ({
                id,
                name: `Component ${id.substring(0, 4)}`, // Fallback name
                metadata: {}
            }));

            setSelectedComponents(prev => {
                const existingIds = new Set(prev.map(c => c.id));
                const newComps = genericComps.filter(c => !existingIds.has(c.id));
                return [...prev, ...newComps];
            });

            // Clear the URL so we don't keep adding them on refresh
            navigate('/builder', { replace: true, state: {} });
        }
    }, [location.search, navigate, location.state]);

    const { isAuthenticated, profile, loading: authLoading, refreshProfile, getAccessToken } = useBuilderAuth();
    const { startTransition } = useRouteTransition();
    const { refreshCredits, isOut: outOfCredits, isUnlimited } = useCredits();
    const [inputValue, setInputValue] = useState("");
    const [templates, setTemplates] = useState([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [images, setImages] = useState([]);
    const [isOptimizingImages, setIsOptimizingImages] = useState(false);
    const [notification, setNotification] = useState(null);
    const [premiumMode, setPremiumMode] = useState(
        profile?.preferred_mode || localStorage.getItem('volturiano_builder_mode') || 'hybrid'
    );

    useEffect(() => {
        if (profile?.preferred_mode) {
            setPremiumMode(profile.preferred_mode);
        } else {
            const saved = localStorage.getItem('volturiano_builder_mode');
            if (saved) setPremiumMode(saved);
        }
    }, [profile?.preferred_mode]);

    const [selectedModel, setSelectedModel] = useState(() => {
        if (typeof window === 'undefined') return getDefaultPublicModelId();
        return normalizePublicModelId(localStorage.getItem('volturiano_builder_model'));
    });
    const [placeholderText, setPlaceholderText] = useState("");

    // Phase S26: Initialize community popup state from URL to persist across reloads
    const [isCommunityOpen, setIsCommunityOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('community') === 'open';
        }
        return false;
    });

    // Sync community popup state to URL
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const currentlyOpenInUrl = params.get('community') === 'open';

        if (isCommunityOpen && !currentlyOpenInUrl) {
            params.set('community', 'open');
            window.history.replaceState(null, '', window.location.pathname + '?' + params.toString());
        } else if (!isCommunityOpen && currentlyOpenInUrl) {
            params.delete('community');
            const newSearch = params.toString();
            window.history.replaceState(null, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
        }
    }, [isCommunityOpen]);

    const [selectedComponents, setSelectedComponents] = useState([]);
    const [strictMode, setStrictMode] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [showCongrats, setShowCongrats] = useState(false);
    const [popupDismissed, setPopupDismissed] = useState(false); // Session guard
    const [selectedTemplate, setSelectedTemplate] = useState(null); // { templateId, name, thumbnail, agentPrompt }

    const premiumPhrases = [
        "design a luxury real estate site...",
        "build a premium restaurant page...",
        "craft a sleek sports club portal...",
        "create a modern brand landing...",
        "develop a high-end fashion store..."
    ];

    const getThumbnailUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        
        // If the path contains 'Templates', use that bucket, otherwise fallback to builder-assets
        const bucket = path.includes('Templates') || path.includes('template') ? 'Templates' : 'builder-assets';
        
        const { data } = builderSupabase.storage.from(bucket).getPublicUrl(path);
        return data?.publicUrl;
    };

    useEffect(() => {
        let currentPhraseIndex = 0;
        let currentCharIndex = 0;
        let isDeleting = false;
        let timeout;

        const type = () => {
            const currentPhrase = premiumPhrases[currentPhraseIndex];
            const prefix = "Ask Volturiano to ";

            if (isDeleting) {
                setPlaceholderText(prefix + currentPhrase.substring(0, currentCharIndex - 1));
                currentCharIndex--;
            } else {
                setPlaceholderText(prefix + currentPhrase.substring(0, currentCharIndex + 1));
                currentCharIndex++;
            }

            let typeSpeed = isDeleting ? 40 : 80;

            if (!isDeleting && currentCharIndex === currentPhrase.length) {
                isDeleting = true;
                typeSpeed = 2000; // Pause at end
            } else if (isDeleting && currentCharIndex === 0) {
                isDeleting = false;
                currentPhraseIndex = (currentPhraseIndex + 1) % premiumPhrases.length;
                typeSpeed = 500; // Pause before next phrase
            }

            timeout = setTimeout(type, typeSpeed);
        };

        type();
        return () => clearTimeout(timeout);
    }, []);

    // Bonus Popup Check - Check every time user lands on Builder
    useEffect(() => {
        // Sequence: Only show Congrats Bonus popup AFTER onboarding is completed
        if (isAuthenticated && profile && profile.onboarding_completed === true && profile.has_received_bonus_popup === false && !popupDismissed) {
            setShowCongrats(true);
        }
    }, [isAuthenticated, profile, popupDismissed]);

    const handleCloseCongrats = async () => {
        setShowCongrats(false);
        setPopupDismissed(true); // Immediate session guard

        if (profile?.id) {
            const { error } = await builderSupabase
                .from('profiles')
                .update({ has_received_bonus_popup: true })
                .eq('id', profile.id);

            if (!error) {
                // Force a profile refresh to sync the context state
                refreshProfile();
            } else {
                console.error("Failed to update bonus popup flag:", error);
            }
        }
    };


    useEffect(() => {
        const profileModel = profile?.preferred_model || profile?.preferred_ai_model;
        if (profileModel) {
            setSelectedModel(normalizePublicModelId(profileModel));
        }
    }, [profile?.preferred_model, profile?.preferred_ai_model]);

    useEffect(() => {
        localStorage.setItem('volturiano_builder_model', selectedModel);
    }, [selectedModel]);

    const iconForModel = (id) => {
        if (id.startsWith('openai/')) return <OpenAIIcon />;
        if (id.startsWith('anthropic/')) return <AnthropicIcon />;
        return <GeminiIcon />;
    };

    const models = getPublicModels().map((model) => ({
        ...model,
        icon: iconForModel(model.id)
    }));

    const currentModelIcon = models.find(m => m.id === selectedModel)?.icon || <OpenAIIcon />;

    const [isViewportDragging, setIsViewportDragging] = useState(false);
    const dragCounter = React.useRef(0);
    const isDraggingRef = React.useRef(false);
    const inputFormRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const textareaRef = React.useRef(null);

    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (!el) return;

        const MIN_HEIGHT = 24;
        const MAX_HEIGHT = 120; // Approx 5 lines at 1.5 line-height

        // Save scroll position to prevent jump
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Reset to minimum to recalculate scrollHeight correctly
        el.style.height = `${MIN_HEIGHT}px`;
        el.style.overflowY = 'hidden';

        const scrollHeight = el.scrollHeight;

        if (scrollHeight > MAX_HEIGHT) {
            el.style.height = `${MAX_HEIGHT}px`;
            el.style.overflowY = 'auto'; // Show scrollbar only when exceeding max
        } else {
            el.style.height = `${Math.max(scrollHeight, MIN_HEIGHT)}px`;
            el.style.overflowY = 'hidden';
        }

        window.scrollTo(0, scrollTop);
    }, [inputValue]);

    const handleInput = (e) => {
        setInputValue(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

    useEffect(() => {
        const handleTransitionCancel = () => setIsSubmitting(false);
        window.addEventListener('cinematic-transition-cancel', handleTransitionCancel);
        return () => window.removeEventListener('cinematic-transition-cancel', handleTransitionCancel);
    }, []);

    // ─── Global Drag & Drop Handler ──────────────
    useEffect(() => {
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

            if (isDraggingRef.current && inputFormRef.current) {
                const rect = inputFormRef.current.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const deltaX = e.clientX - centerX;
                const deltaY = e.clientY - centerY;

                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const maxPull = 7; // Slightly reduced for better balance

                const pullX = distance > 0 ? (deltaX / distance) * maxPull : 0;
                const pullY = distance > 0 ? (deltaY / distance) * maxPull : 0;

                inputFormRef.current.style.setProperty('--magnet-x', `${pullX}px`);
                inputFormRef.current.style.setProperty('--magnet-y', `${pullY}px`);
            }
        };

        const handleDropGlobal = (e) => {
            e.preventDefault();
            dragCounter.current = 0;
            setIsViewportDragging(false);
            isDraggingRef.current = false;
            if (inputFormRef.current) {
                inputFormRef.current.style.setProperty('--magnet-x', '0px');
                inputFormRef.current.style.setProperty('--magnet-y', '0px');
            }
            if (e.dataTransfer?.files?.length > 0) {
                processFiles(e.dataTransfer.files);
            }
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDropGlobal);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDropGlobal);
        };
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            setTemplates([]);
            setIsLoadingTemplates(false);
            return;
        }

        const controller = new AbortController();
        setIsLoadingTemplates(true);

        const fetchWithRetry = async (attempt = 0) => {
            const MAX_RETRIES = 3;
            try {
                const token = getAccessToken();
                const res = await fetch('/api/build-template?list=true', {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    signal: controller.signal
                });
                const data = await res.json();
                if (!controller.signal.aborted) {
                    if (data.success) setTemplates(data.templates || []);
                    setIsLoadingTemplates(false);
                }
            } catch (err) {
                if (controller.signal.aborted) return;
                if (attempt < MAX_RETRIES) {
                    const delay = 800 * Math.pow(2, attempt);
                    await new Promise(r => setTimeout(r, delay));
                    if (!controller.signal.aborted) return fetchWithRetry(attempt + 1);
                } else {
                    console.error('Failed to load templates after retries:', err);
                    setIsLoadingTemplates(false);
                }
            }
        };

        fetchWithRetry();
        return () => controller.abort();
    }, [authLoading, isAuthenticated, getAccessToken]);

    const showNotification = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 5000);
    };

    const addOptimizedImages = async (files) => {
        const inputFiles = Array.from(files || []);
        const imageFiles = inputFiles.filter((file) => file?.type?.startsWith('image/'));
        if (imageFiles.length === 0) return;

        if (images.length >= IMAGE_UPLOAD_LIMITS.maxImages) {
            showNotification(`Maximum of ${IMAGE_UPLOAD_LIMITS.maxImages} images allowed.`);
            return;
        }

        setIsOptimizingImages(true);
        try {
            const { images: optimizedImages, stats } = await optimizeImageFiles(imageFiles, {
                existingImages: images,
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

    const handlePaste = (e) => {
        const items = Array.from(e.clipboardData?.items || []);
        const pastedImages = items
            .filter((item) => item.type.indexOf('image') !== -1)
            .map((item) => item.getAsFile())
            .filter(Boolean);

        if (pastedImages.length > 0) {
            addOptimizedImages(pastedImages);
        }
    };

    // Phase S25: Handle Stripe redirect URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const billingStatus = params.get('billing');

        if (billingStatus === 'success') {
            showNotification("✅ Payment successful! Your credits have been added.");
            refreshCredits();

            params.delete('billing');
            params.delete('session_id');
            const newSearch = params.toString();
            window.history.replaceState(null, '', location.pathname + (newSearch ? `?${newSearch}` : ''));
        } else if (billingStatus === 'cancelled') {
            showNotification("Payment was cancelled. No charges were made.");

            params.delete('billing');
            const newSearch = params.toString();
            window.history.replaceState(null, '', location.pathname + (newSearch ? `?${newSearch}` : ''));
        }
    }, [location.search, refreshCredits]);

    const processFiles = (files) => {
        addOptimizedImages(files);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeComponent = (compId) => {
        setSelectedComponents(prev => prev.filter(c => c.id !== compId));
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        // Phase P7: Auth Gating
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }

        if (isSubmitting) return;

        if (isOptimizingImages) {
            showNotification('Finishing image optimization before sending.');
            return;
        }

        // Guided builds check credits at the final confirmation step. Templates
        // skip that step, so they open the same purchase modal here.
        if (selectedTemplate && outOfCredits && !isUnlimited) {
            setShowCreditModal(true);
            return;
        }

        if (inputValue.trim() || images.length > 0 || selectedComponents.length > 0 || selectedTemplate) {
            executeSubmit();
        }
    };

    const executeSubmit = () => {
        setIsSubmitting(true);

        // Elegantly drop out the entire Builder UI (main content)
        const builderRoot = document.querySelector(`[class*="outerWrapper"]`);
        if (builderRoot) {
            builderRoot.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            builderRoot.style.opacity = '0';
            builderRoot.style.transform = 'translateY(40px) scale(0.88)'; // Scale down from 0.9 base
            builderRoot.style.filter = 'blur(20px)';
        }

        // Dispatch an event to drop out the Header NavBar at the same time
        window.dispatchEvent(new CustomEvent('cinematic-transition-start'));

        // Dispatch an optimistic credit deduction event to animate the top right counter instantly
        if (selectedTemplate) {
            window.dispatchEvent(new CustomEvent('optimistic-credit-deduction'));
        }

        // Start Cinematic Transition
        // Wait 1.2s before actually transitioning so the user can enjoy the optimistic credit pop animation
        setTimeout(() => {
            // Map settings value → backend pipeline value:
            //   Settings 'free'    → Backend 'off'    (pure AI generation, no premium components)
            //   Settings 'hybrid'  → Backend 'hybrid' (mix of premium + AI generated)
            //   Settings 'premium' → Backend 'strict' (only premium components from Supabase)
            const modeMap = { 'free': 'off', 'hybrid': 'hybrid', 'premium': 'strict' };
            const backendMode = modeMap[premiumMode] || 'hybrid';

            startTransition('/builder/generation', {
                prompt: selectedTemplate
                    ? (inputValue.trim() || `Build using ${selectedTemplate.name} template`)
                    : (inputValue.trim() || (selectedComponents.length > 0 ? "Build from community components" : "")),
                images: images,
                premiumMode: backendMode,
                model: selectedModel,
                manualSelectionIds: selectedComponents.map(c => c.id),
                initialComponents: selectedComponents,
                strictMode: strictMode,
                guidedIntake: !selectedTemplate,
                allowCommunityComponents: backendMode !== 'off',
                templateData: selectedTemplate ? {
                    templateId: selectedTemplate.templateId,
                    name: selectedTemplate.name,
                    thumbnail: selectedTemplate.thumbnail,
                    agentPrompt: selectedTemplate.agentPrompt,
                    userAdjustment: inputValue.trim() || null
                } : null
            });
        }, 1200);
    };

    const handleTemplateSelect = (template) => {
        // Phase P7: Auth Gating
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }

        // If this template is already selected, deselect it
        if (selectedTemplate?.templateId === template.templateId) {
            setSelectedTemplate(null);
            return;
        }

        // Set the template as a visual selection in the input area
        const meta = TEMPLATE_METADATA[template.templateId];
        setSelectedTemplate({
            templateId: template.templateId,
            name: template.name,
            thumbnail: getThumbnailUrl(template.thumbnailUrl) || meta?.thumbnail || platformThumbnail,
            agentPrompt: template.agentPrompt || '',
            description: template.description
        });

        // Scroll to the input area so the user sees the template chip
        setTimeout(() => {
            const inputForm = document.querySelector(`[class*="inputForm"]`);
            if (inputForm) inputForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    return (
        <>
            <div className={styles.outerWrapper}>
                <div className={styles.pageContainer}>
                    {/* Background Video */}
                    <video
                        className={styles.heroVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                    >
                        <source src={heroVideo} type="video/mp4" />
                    </video>
                </div>

                {/* ─── Template Selector Section (outside hero) ─── */}
                {(templates.length > 0 || isLoadingTemplates) && (
                    <div className={styles.templateSection}>
                        <div className={styles.templateSectionInner}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                viewport={{ once: true }}
                                className={styles.templateSectionHeader}
                            >
                                <h2 className={styles.templateSectionTitle}>Start with a Template</h2>
                            </motion.div>

                            <div className={styles.templateGrid}>
                                {isLoadingTemplates ? (
                                    [1, 2, 3].map((skeleton) => (
                                        <div key={skeleton} className={styles.templateGridCard}>
                                            <div className={`${styles.templateGridThumb} ${styles.skeletonPulse}`}>
                                                <div className={styles.shimmerEffect} />
                                            </div>
                                            <div className={styles.templateGridInfo}>
                                                <div className={`${styles.skeletonTextLine} ${styles.skeletonTitleWidth}`}>
                                                    <div className={styles.shimmerEffect} />
                                                </div>
                                                <div className={`${styles.skeletonTextLine} ${styles.skeletonDescWidth}`}>
                                                    <div className={styles.shimmerEffect} />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    templates.map((tmpl, idx) => (
                                        <motion.div
                                            key={tmpl.templateId}
                                            initial={{ opacity: 0, y: 40 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.6, delay: idx * 0.1 }}
                                            viewport={{ once: true }}
                                            className={styles.templateGridCard}
                                        >
                                            <div className={styles.templateGridThumb}>
                                                <img
                                                    src={getThumbnailUrl(tmpl.thumbnailUrl) || TEMPLATE_METADATA[tmpl.templateId]?.thumbnail || platformThumbnail}
                                                    alt={tmpl.name}
                                                    className={styles.templateGridImage}
                                                />
                                                <div className={styles.templateGridOverlay} />

                                                <div className={styles.templateCardActions}>
                                                    <button
                                                        className={`${styles.templateActionBtn} ${styles.useTemplateBtn}`}
                                                        onClick={() => handleTemplateSelect(tmpl)}
                                                    >
                                                        Use Template
                                                    </button>
                                                    {tmpl.visitUrl && (
                                                        <button
                                                            className={`${styles.templateActionBtn} ${styles.viewSiteBtn}`}
                                                            onClick={() => window.open(tmpl.visitUrl, '_blank')}
                                                        >
                                                            View Site
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.templateGridInfo}>
                                                <h3 className={styles.templateGridName}>{tmpl.name}</h3>
                                                <span className={styles.templateGridDesc}>{tmpl.description}</span>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.ctaSection}>
                    <motion.div
                        className={styles.ctaCard}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    >
                        <div className={styles.ctaContent}>
                            <h2 className={styles.ctaTitle}>Explore what others have built</h2>
                            <p className={styles.ctaDesc}>
                                Browse community-submitted components, get inspired, and start your next project with a head-start.
                            </p>
                        </div>

                        <div className={styles.ctaButtons}>
                            <button className={styles.ctaBtnOutline} onClick={() => navigate('/community/studio')}>
                                Submit Component
                            </button>
                            <button className={styles.ctaBtnPrimary} onClick={() => navigate(`/community?returnTo=${encodeURIComponent(location.pathname)}`)}>
                                Explore Community
                                <span className={styles.ctaBtnArrow}>
                                    <ArrowRight size={16} />
                                </span>
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Title Section */}
                <div className={styles.titleWrapper}>
                    <motion.div
                        initial={{ opacity: 0, y: -18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                    >
                        <h2 className={styles.heroLabel}>Immortal 4</h2>
                        <h1 className={styles.heroTitle}>
                            PREMIUM{' '}
                            <img src={tornadoLogo} alt="Volturiano" className={styles.logoImage} />{' '}
                            WEBSITES,
                            <br />
                            ALL EXAMPLES
                        </h1>
                    </motion.div>
                </div>

                {/* Maestro Component (Marquee + Input) */}
                <motion.div
                    className={styles.maestroWrapper}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                >
                    {/* Floating Input Centered over Marquee */}
                    <div className={styles.floatingInputContainer}>
                        <form
                            ref={inputFormRef}
                            onSubmit={handleSubmit}
                            className={`${styles.inputForm} ${(images.length > 0 || selectedComponents.length > 0) ? styles.extended : ''} ${isViewportDragging ? styles.isDragging : ''}`}
                            onPaste={handlePaste}
                        >
                            <div className={styles.inputWithPreviews}>
                                {/* Community Component Previews */}
                                {selectedComponents.length > 0 && (
                                    <div className={styles.communityPreviews}>
                                        <div className={styles.communityItemsRow}>
                                            {selectedComponents.map((comp, index) => {
                                                const thumbPath = comp.thumbnail_url || comp.preview_image_url || comp.image_url || comp.image || (comp.metadata && comp.metadata.thumbnail_url);
                                                const thumb = getThumbnailUrl(thumbPath);
                                                return (
                                                    <div
                                                        key={`${comp.id}-${index}`}
                                                        className={`${styles.communityPreviewItem} ${strictMode ? styles.communityPreviewItemActive : ''}`}
                                                    >
                                                        {thumb ? (
                                                            <img src={thumb} alt={comp.name} />
                                                        ) : (
                                                            <div className={styles.compIconFallback}><FiLayers size={20} /></div>
                                                        )}
                                                        <div className={styles.compNameBadge}>{comp.name}</div>
                                                        <button
                                                            type="button"
                                                            className={styles.removeComponentBtn}
                                                            onClick={() => removeComponent(comp.id)}
                                                            title="Remove component"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className={styles.strictModeControl} onClick={() => setStrictMode(!strictMode)}>
                                            <div className={`${styles.pixelSwitch} ${strictMode ? styles.pixelActive : ''}`}>
                                                <input className={styles.pixelToggle} type="checkbox" checked={strictMode} readOnly />
                                                <span className={styles.pixelSlider}></span>
                                            </div>
                                            <span className={styles.strictModeLabel}>ONLY USE THESE COMPONENTS</span>
                                        </div>
                                    </div>
                                )}

                                {/* Template Selection Chip */}
                                {selectedTemplate && (
                                    <div className={styles.communityPreviews}>
                                        <div className={styles.communityItemsRow}>
                                            <div className={`${styles.communityPreviewItem} ${styles.communityPreviewItemActive}`}>
                                                <img src={selectedTemplate.thumbnail} alt={selectedTemplate.name} />
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
                                                <img src={img} alt="preview" />
                                                <button
                                                    type="button"
                                                    className={styles.removeImgBtn}
                                                    onClick={() => removeImage(idx)}
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
                                    onChange={handleInput}
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
                                    onChange={(e) => processFiles(e.target.files)}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className={styles.iconButton}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isSubmitting}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                </button>

                                {/* Model Selector Dropdown */}
                                <div className={styles.modelSelectorContainer}>
                                    <button
                                        type="button"
                                        className={styles.modelSelectorButton}
                                        onClick={() => !isSubmitting && setIsModelDropdownOpen(!isModelDropdownOpen)}
                                        data-active={isModelDropdownOpen}
                                        title={`Select AI Model (Current: ${selectedModel})`}
                                        disabled={isSubmitting}
                                    >
                                        <div className={styles.activeModelIconWrapper}>
                                            {currentModelIcon}
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isModelDropdownOpen && (
                                            <motion.div
                                                className={styles.modelDropdown}
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
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

                                <div className={styles.supabaseIconWrapper}>
                                    <button
                                        type="button"
                                        className={styles.iconButton}
                                        onClick={() => setIsCommunityOpen(true)}
                                        title="Browse Community Components"
                                        disabled={isSubmitting}
                                    >
                                        <LayoutGrid size={18} />
                                    </button>
                                    <div className={styles.supabaseTooltip}>Select components</div>
                                </div>

                                {/* Premium Mode Logic (Disabled UI) */}
                                {/* 
                            <button
                                type="button"
                                className={`${styles.iconButton} ${premiumMode !== 'off' ? styles.iconBtnActive : ''}`}
                                onClick={() => {
                                    const modes = ['off', 'hybrid', 'strict'];
                                    const nextMode = modes[(modes.indexOf(premiumMode) + 1) % modes.length];
                                    setPremiumMode(nextMode);
                                    showNotification(`Premium Mode: ${nextMode === 'strict' ? 'ON' : nextMode.toUpperCase()}`);
                                }}
                                title={`Premium Mode: ${premiumMode === 'strict' ? 'ON' : premiumMode.toUpperCase()}`}
                                disabled={isSubmitting}
                            >
                                {premiumMode === 'off' && <FiSlash size={16} />}
                                {premiumMode === 'hybrid' && <FiLayers size={16} />}
                                {premiumMode === 'strict' && <FiZap size={16} />}
                            </button>
                            */}

                                {/* Supabase Icon - Stage 13 */}
                                <div className={styles.supabaseIconWrapper}>
                                    <button
                                        type="button"
                                        className={styles.supabaseIconButton}
                                        onClick={() => showNotification("Supabase Integration: Available soon")}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 512 512">
                                            <linearGradient id="supabase_new_a" x1="237.109" x2="419.106" y1="223.219" y2="146.89" gradientTransform="matrix(1 0 0 -1 0 513)" gradientUnits="userSpaceOnUse">
                                                <stop offset="0" style={{ stopColor: '#249361' }} />
                                                <stop offset="1" style={{ stopColor: '#3ecf8e' }} />
                                            </linearGradient>
                                            <path d="M297.6 501c-12.9 16.3-39.2 7.4-39.5-13.4L253.6 183h204.8c37.1 0 57.8 42.8 34.7 71.9z" style={{ fill: 'url(#supabase_new_a)' }} />
                                            <linearGradient id="supabase_new_b" x1="245.829" x2="328.829" y1="411.681" y2="255.438" gradientTransform="matrix(1 0 0 -1 0 513)" gradientUnits="userSpaceOnUse">
                                                <stop offset="0" style={{ stopColor: '#000' }} />
                                                <stop offset="1" style={{ stopColor: '#000', stopOpacity: 0 }} />
                                            </linearGradient>
                                            <path d="M297.6 501c-12.9 16.3-39.2 7.4-39.5-13.4L253.6 183h204.8c37.1 0 57.8 42.8 34.7 71.9z" style={{ fill: 'url(#supabase_new_b)', fillOpacity: 0.2 }} />
                                            <path d="M214.4 11c12.9-16.3 39.2-7.4 39.5 13.4l2 304.5H53.7c-37.1 0-57.8-42.8-34.7-71.9z" style={{ fill: '#3ecf8e' }} />
                                        </svg>
                                    </button>
                                    <div className={styles.supabaseTooltip}>Available soon</div>
                                </div>



                                <div style={{ flex: 1 }} />

                                <button
                                    type="submit"
                                    className={`${styles.submitButton} ${(inputValue.trim() || selectedTemplate) ? styles.hasText : ''}`}
                                    disabled={isSubmitting}
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

            {/* Bottom Styling Blur Overlay - Ensures it covers the entire scrollable area but sits below the inputForm */}
            <GradualBlur
                preset="bottom"
                strength={2.5}
                divCount={3}
                height="8rem"
                opacity={0.8}
                zIndex={90}
                style={{ pointerEvents: 'none', position: 'fixed', bottom: 0, left: 0, right: 0 }}
            />

            {/* ─── Fixed Overlays (Outside scaled wrapper for perfect centering) ─── */}
            {((isAuthenticated && profile && profile.onboarding_completed === false) || showCongrats) && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', zIndex: 999999 }}>
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ transform: 'scale(0.95)', transformOrigin: 'center center', width: '100%', display: 'flex', justifyContent: 'center' }}>
                            {/* Onboarding Popup for First-Time Users */}
                            {isAuthenticated && profile && profile.onboarding_completed === false && (
                                <OnboardingPopup />
                            )}

                            <CongratsModal
                                isOpen={showCongrats}
                                onClose={handleCloseCongrats}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Phase P7: Auth Gating */}
            <AuthGateModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
            <CreditLimitModal
                isOpen={showCreditModal}
                onClose={() => setShowCreditModal(false)}
            />

            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={styles.notificationPopup}
                >
                    {!notification.includes('✅') && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    )}
                    {notification}
                </motion.div>
            )}

            <CommunitySelectorPopup
                isOpen={isCommunityOpen}
                onClose={() => setIsCommunityOpen(false)}
                maxItems={10}
                initialSelectedItems={selectedComponents}
                onConfirm={(items) => {
                    setSelectedComponents(items);
                    setIsCommunityOpen(false);
                }}
            />
            {/* Fixed components that should NOT be scaled go here */}
        </>
    );
};

const Builder = () => {
    return (
        <ThemeProvider>
            <BuilderContent />
        </ThemeProvider>
    );
};

export default Builder;
