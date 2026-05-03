import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './CommunityHub.module.css';
import ComponentCard from './ComponentCard';
import SandpackPreviewPopup from './SandpackPreviewPopup';
import FeedbackModal from '../../../../../components/Modals/FeedbackModal/FeedbackModal';
import IssueModal from '../../../../../components/Modals/IssueModal/IssueModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useBuilderAuth } from '../../../../../contexts/BuilderAuthContext';
import tornadoLogo from '../../../../../assets/Logo/TornadoLogo.png';
import weirdButtonGradient from '../Dashboard/Assets/WeirdButtonGradient.png';

// Hardcoded top links extracted from SVG design
const TOP_LINKS = [
    {
        svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 14V8.66667C10 8.48986 9.92976 8.32029 9.80474 8.19526C9.67971 8.07024 9.51014 8 9.33333 8H6.66667C6.48986 8 6.32029 8.07024 6.19526 8.19526C6.07024 8.32029 6 8.48986 6 8.66667V14" stroke="currentColor" stroke-width="1.333" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 6.66892C1.99995 6.47497 2.04222 6.28334 2.12386 6.1074C2.20549 5.93146 2.32453 5.77546 2.47267 5.65026L7.13933 1.65092C7.37999 1.44753 7.6849 1.33594 8 1.33594C8.3151 1.33594 8.62001 1.44753 8.86067 1.65092L13.5273 5.65026C13.6755 5.77546 13.7945 5.93146 13.8761 6.1074C13.9578 6.28334 14 6.47497 14 6.66892V12.6689C14 13.0225 13.8595 13.3617 13.6095 13.6117C13.3594 13.8618 13.0203 14.0023 12.6667 14.0023H3.33333C2.97971 14.0023 2.64057 13.8618 2.39052 13.6117C2.14048 13.3617 2 13.0225 2 12.6689V6.66892Z" stroke="currentColor" stroke-width="1.333" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        name: "Home"
    },
    {
        svg: `<svg width="16" height="16" viewBox="0 -960 960 960" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z" fill="currentColor"/></svg>`,
        name: "Liked components"
    },
];

export default function CommunityHub() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const isBuilderSelectMode = queryParams.get('mode') === 'select' || queryParams.get('builderSelect') === 'true';
    const returnTo = queryParams.get('returnTo') || '/builder';
    const { getAccessToken } = useBuilderAuth();

    const [activeTab, setActiveTab] = useState('components');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sidebarActiveItem, setSidebarActiveItem] = useState('Home');

    // Data states
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [trendingItems, setTrendingItems] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isIssueOpen, setIsIssueOpen] = useState(false);

    const abortControllerRef = useRef(null);

    // Selection & Preview
    const [selectedForBuild, setSelectedForBuild] = useState({});
    const [previewItem, setPreviewItem] = useState(null);

    // Handle debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Data fetching
    const fetchData = useCallback(async () => {
        if (page > 1 && page > totalPages) return;

        // Abort any existing request to prevent race conditions on fast category switches
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        setLoading(true);
        if (page === 1) setError(null);
        try {
            let url;
            if (sidebarActiveItem === 'Liked components') {
                url = `/api/community/liked-components`;
            } else {
                const categoryQuery = selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : '';
                const searchQ = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
                const typeQ = activeTab === 'components' ? 'component' : 'template';
                // On Home (no category), sort by newest so recently submitted components appear first
                const sortQ = !selectedCategory && sidebarActiveItem === 'Home' ? '&sort=newest' : '';
                url = `/api/community/browse?type=${typeQ}&page=${page}${categoryQuery}${searchQ}${sortQ}`;
            }

            const token = getAccessToken();
            const res = await fetch(url, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                signal // Attach the abort signal
            });

            if (!res.ok) throw new Error('Failed to fetch components');

            const data = await res.json();
            
            // Double check we haven't been aborted
            if (signal.aborted) return;

            if (data.success) {
                if (page === 1) {
                    setItems(data.items || []);
                } else {
                    setItems(prev => {
                        const newItems = data.items || [];
                        const existingIds = new Set(prev.map(item => item.id));
                        const filtered = newItems.filter(item => !existingIds.has(item.id));
                        return [...prev, ...filtered];
                    });
                }
                setTotalPages(Math.max(1, Math.ceil((data.total || 0) / 20)));
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            if (err.name === 'AbortError') return; // Ignore abort errors quietly
            console.error('[CommunityHub] fetch error:', err);
            if (page === 1) setError(err.message);
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    }, [page, activeTab, selectedCategory, debouncedSearch, totalPages, sidebarActiveItem, getAccessToken]);

    // Fetch categories and trending on mount
    useEffect(() => {
        async function fetchInitial() {
            try {
                const [catRes, trendRes] = await Promise.all([
                    fetch('/api/community/categories'),
                    fetch('/api/community/browse/trending')
                ]);

                if (catRes.ok) {
                    const catData = await catRes.json();
                    if (catData.success) {
                        setCategories(catData.categories || []);
                    }
                }

                if (trendRes.ok) {
                    const trendData = await trendRes.json();
                    if (trendData.success) {
                        // Backend returns { components, templates } — merge them for display
                        const trendComponents = trendData.components || [];
                        const trendTemplates = (trendData.templates || []).map(t => ({ ...t, type: 'template' }));
                        setTrendingItems([...trendComponents, ...trendTemplates]);
                    }
                }
            } catch (err) {
                console.error('[CommunityHub] initial fetch error:', err);
            }
        }
        fetchInitial();
    }, []);

    // Trigger fetch when any filter/sidebar item changes
    useEffect(() => {
        setItems([]); // Clear items immediately for better UX
        if (page === 1) {
            fetchData();
        } else {
            setPage(1);
        }
    }, [activeTab, selectedCategory, debouncedSearch, sidebarActiveItem]);

    // Handle fetching for subsequent pages
    useEffect(() => {
        if (page > 1) {
            fetchData();
        }
    }, [page]);

    // Intersection Observer for infinite scroll
    const [observerRefElement, setObserverRefElement] = useState(null);
    useEffect(() => {
        if (!observerRefElement || loading || page >= totalPages) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setPage(prev => prev + 1);
                }
            },
            { root: null, rootMargin: '200px', threshold: 0.1 }
        );

        observer.observe(observerRefElement);
        return () => observer.disconnect();
    }, [observerRefElement, loading, page, totalPages]);

    const toggleSelectMode = () => {
        const params = new URLSearchParams(location.search);
        if (isBuilderSelectMode) {
            params.delete('mode');
            params.delete('builderSelect');
        } else {
            params.set('mode', 'select');
        }
        navigate(`${location.pathname}?${params.toString()}`);
    };

    const handleToggleSelect = (id, item) => {
        let activatingSelectMode = false;
        setSelectedForBuild(prev => {
            const next = { ...prev };
            if (next[id]) {
                delete next[id];
            } else {
                next[id] = item;
                activatingSelectMode = true;
            }
            return next;
        });
        
        if (activatingSelectMode && !isBuilderSelectMode) {
            const params = new URLSearchParams(location.search);
            params.set('mode', 'select');
            navigate(`${location.pathname}?${params.toString()}`);
        }
    };

    const proceedToBuilder = () => {
        const selectedItemsArray = Object.values(selectedForBuild);
        const selectedIds = selectedItemsArray.map(item => item.id);
        if (selectedIds.length === 0) return;
        const idsString = selectedIds.join(',');

        // Handle returning settings if passed
        const model = queryParams.get('model');
        const pMode = queryParams.get('premiumMode');

        // Return to the specified page (if not generation) or default to main builder
        const target = returnTo && !returnTo.includes('/builder/generation') ? returnTo : '/builder';
        const separator = target.includes('?') ? '&' : '?';
        let returnUrl = `${target}${separator}import=${encodeURIComponent(idsString)}`;
        if (model) returnUrl += `&model=${model}`;
        if (pMode) returnUrl += `&premiumMode=${pMode}`;

        navigate(returnUrl, { state: { importedComponents: selectedItemsArray } });
    };

    const categoryMap = useMemo(() => {
        return categories;
    }, [categories]);

    return (
        <div className={styles.hubContainer}>

            {/* ─── Sidebar ─── */}
            <aside className={styles.sidebar}>
                {/* Fixed Top Header within Sidebar */}
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarBrandRow}>
                        <div className={styles.brandLogoBox} onClick={() => navigate('/builder')} style={{ cursor: 'pointer' }}>
                            <img src={tornadoLogo} alt="Logo" style={{ width: 42, height: 42, objectFit: 'contain' }} />
                        </div>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ opacity: 0 }} xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4L11 11M4 11L11 4" stroke="#F4F4F5" />
                        </svg>
                    </div>

                    <div className={styles.searchBox}>
                        <div className={styles.searchIcon}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z" stroke="#878787" strokeOpacity="0.4" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12.2505 12.2505L9.74219 9.74219" stroke="#878787" strokeOpacity="0.4" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.sidebarScrollArea}>
                    {/* Top Fixed Links */}
                    {TOP_LINKS.map((link, idx) => {
                        const isActive = sidebarActiveItem === link.name;
                        return (
                            <div
                                key={idx}
                                className={`${styles.categoryItem} ${isActive ? styles.categoryItemActive : ''}`}
                                onClick={() => {
                                    setSidebarActiveItem(link.name);
                                    setSelectedCategory(null);
                                    setPage(1);
                                }}
                                style={link.name === '1Code' ? { marginTop: 10 } : {}}
                            >
                                <div className={styles.categoryItemLeft}>
                                    <div dangerouslySetInnerHTML={{ __html: link.svg }} style={{ display: 'flex', opacity: isActive ? 1 : 0.6, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }} />
                                    <span>{link.name}</span>
                                </div>
                            </div>
                        )
                    })}

                    <div className={styles.sidebarSectionHeader}>UI Components</div>
                    {categoryMap.map(cat => (
                        <div
                            key={cat.id || cat.name}
                            className={`${styles.categoryItem} ${selectedCategory === cat.name ? styles.categoryItemActive : ''}`}
                            onClick={() => { setSelectedCategory(cat.name); setSidebarActiveItem(cat.name); setPage(1); }}
                        >
                            <span>{cat.name}</span>
                            <span className={styles.categoryCount}>{cat.count || Math.floor(Math.random() * 100)}</span>
                        </div>
                    ))}

                </div>

                <div className={styles.sidebarFooter} style={{ height: '88px', alignItems: 'flex-start' }}>
                    <div className={styles.sidebarFooterInner} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                        <button className={styles.sidebarSubmitBtn} title="Submit Component" onClick={() => navigate('/community/studio')} style={{ margin: 0, flex: '1 1 calc(50% - 4px)' }}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 3V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Submit</span>
                        </button>

                        <button 
                            className={styles.sidebarSubmitBtn} 
                            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', margin: 0, flex: '1 1 calc(50% - 4px)' }} 
                            title="Provide Feedback" 
                            onClick={() => setIsFeedbackOpen(true)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            <span>Feedback</span>
                        </button>

                        <button 
                            className={styles.sidebarSubmitBtn} 
                            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', margin: 0, flex: '1 1 100%', justifyContent: 'center' }} 
                            title="Report an Issue" 
                            onClick={() => setIsIssueOpen(true)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span>Report Issue</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ─── Main View ─── */}
            <div className={styles.mainGrid}>
                {/* Category Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16 }}>
                    <div style={{ fontSize: 13, color: '#f4f4f5', fontWeight: 600 }}>
                        {selectedCategory || 'Components'}
                    </div>

                    <button
                        className={isBuilderSelectMode ? styles.exitSelectBtn : styles.chooseComponentsHeaderBtn}
                        onClick={toggleSelectMode}
                    >
                        {isBuilderSelectMode ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                <span>Exit Select Mode</span>
                            </>
                        ) : (
                            <>
                                <span>Select Components</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Standard Grid */}
                {loading && page === 1 ? (
                    <div className={styles.itemGrid}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={`skel-hub-${i}`} className={styles.skeletonPulse}>
                                <div className={styles.shimmerEffect} />
                            </div>
                        ))}
                    </div>
                ) : error && page === 1 ? (
                    <div className={styles.emptyState}>{error}</div>
                ) : items.length === 0 ? (
                    sidebarActiveItem === 'Liked components' ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={styles.premiumEmptyState}
                        >
                            <div className={styles.emptyContentWrapper}>
                                <div className={styles.largeHeartBg}>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="120" viewBox="0 -960 960 960" width="120" fill="currentColor">
                                        <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/>
                                    </svg>
                                </div>
                                <span className={styles.emptyStateText}>Like some components</span>
                            </div>
                        </motion.div>
                    ) : (
                        <div className={styles.emptyState}>
                            No items found for this category.
                        </div>
                    )
                ) : (
                    <>
                        <div className={styles.itemGrid}>
                            {items.map((item) => (
                                <ComponentCard
                                    key={item.id}
                                    item={item}
                                    type={item.type || (activeTab === 'components' ? 'component' : 'template')}
                                    isSelectMode={isBuilderSelectMode}
                                    isSelected={!!selectedForBuild[item.id]}
                                    onToggleSelect={(id) => handleToggleSelect(id, item)}
                                    onCardClick={setPreviewItem}
                                />
                            ))}
                        </div>

                        {/* Infinite Scroll Trigger element */}
                        {page < totalPages && !loading && (
                            <div ref={setObserverRefElement} style={{ height: '40px', width: '100%', marginTop: '20px' }} />
                        )}

                        {/* Loading skeletons at the bottom if fetching more */}
                        {loading && page > 1 && (
                            <div className={styles.itemGrid} style={{ marginTop: 20 }}>
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={`skel-hub-more-${i}`} className={styles.skeletonPulse}>
                                        <div className={styles.shimmerEffect} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Builder Sticky Bar (global screen bottom center just in case) */}
            {Object.keys(selectedForBuild).filter(k => selectedForBuild[k]).length > 0 && (
                <div className={styles.stickyCartBar}>
                    <div className={styles.stickyCartInfo}>
                        {Object.keys(selectedForBuild).filter(k => selectedForBuild[k]).length} component(s) selected
                    </div>
                    <button className={styles.stickyCartButton} onClick={proceedToBuilder}>
                        Add to Chat
                    </button>
                </div>
            )}

            {/* Preview Modals */}
            <SandpackPreviewPopup
                isOpen={!!previewItem}
                onClose={() => setPreviewItem(null)}
                item={previewItem}
                isSelectMode={isBuilderSelectMode}
                isSelected={previewItem ? !!selectedForBuild[previewItem.id] : false}
                onToggleSelect={handleToggleSelect}
            />

            {/* Platform Feedback Modal */}
            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
                pageSource="community" 
            />

            {/* Platform Issue Modal */}
            <IssueModal 
                isOpen={isIssueOpen} 
                onClose={() => setIsIssueOpen(false)} 
                pageSource="community" 
            />
        </div>
    );
}
