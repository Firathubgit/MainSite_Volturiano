import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLayers, FiSearch, FiMonitor, FiTablet, FiSmartphone, FiArrowRight } from 'react-icons/fi';
import styles from './CommunitySelectorPopup.module.css';
import ComponentCard from '../Community/ComponentCard';
import SandpackPreviewPopup from '../Community/SandpackPreviewPopup';
import AuthGateModal from '../../../../../components/Modals/AuthGateModal';
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
    }
];

export default function CommunitySelectorPopup({ isOpen, onClose, onConfirm, maxItems = 4, initialSelectedItems = [] }) {
    const { getAccessToken } = useBuilderAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    // Phase S26: Initialize category selection from URL params
    const [sidebarActiveItem, setSidebarActiveItem] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('communityTab') || 'Home';
        }
        return 'Home';
    });

    const [selectedCategory, setSelectedCategory] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('communityTab');
            if (tab && !['Home', 'Liked components'].includes(tab)) {
                return tab;
            }
        }
        return null;
    });

    // Sync selected tab to URL to persist across reloads
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const currentTabInUrl = params.get('communityTab');

        if (sidebarActiveItem !== 'Home' && currentTabInUrl !== sidebarActiveItem) {
            params.set('communityTab', sidebarActiveItem);
            window.history.replaceState(null, '', window.location.pathname + '?' + params.toString());
        } else if (sidebarActiveItem === 'Home' && currentTabInUrl) {
            params.delete('communityTab');
            const newSearch = params.toString();
            window.history.replaceState(null, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
        }
    }, [sidebarActiveItem]);

    const [activeTab] = useState('components');
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { isAuthenticated } = useBuilderAuth();

    // Data states
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [trendingItems, setTrendingItems] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const abortControllerRef = useRef(null);

    // Selection & Preview
    const [selectedItemsMap, setSelectedItemsMap] = useState({});
    const [previewItem, setPreviewItem] = useState(null);

    // Handle debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Data fetching
    const fetchData = useCallback(async () => {
        if (!isOpen || (page > 1 && page > totalPages)) return;

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
                url = `/api/community/browse?type=${typeQ}&page=${page}${categoryQuery}${searchQ}`;
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
            console.error('[CommunitySelectorPopup] fetch error:', err);
            if (page === 1) setError(err.message);
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    }, [page, activeTab, selectedCategory, debouncedSearch, totalPages, isOpen, sidebarActiveItem, getAccessToken]);

    // Fetch categories and trending on mount
    useEffect(() => {
        if (!isOpen) return;
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
                        setTrendingItems(trendData.items || []);
                    }
                }
            } catch (err) {
                console.error('[CommunitySelectorPopup] initial fetch error:', err);
            }
        }
        fetchInitial();
    }, [isOpen]);
    
    // Sync initial selected items
    useEffect(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        if (isOpen && (initialSelectedItems.length > 0 || isMobile)) {
            const initialMap = {};
            initialSelectedItems.forEach(item => {
                initialMap[item.id] = item;
            });
            setSelectedItemsMap(initialMap);
            // If we have items from parent or on mobile, auto-enable select mode for better UX
            setIsSelectMode(true);
        } else if (isOpen) {
            setSelectedItemsMap({});
            setIsSelectMode(false);
        }
    }, [isOpen, initialSelectedItems]);

    // Trigger fetch when any filter/sidebar item changes
    useEffect(() => {
        if (!isOpen) return;
        setItems([]); // Clear items immediately
        if (page === 1) {
            fetchData();
        } else {
            setPage(1);
        }
    }, [activeTab, selectedCategory, debouncedSearch, isOpen, sidebarActiveItem]);

    // Handle fetching for subsequent pages
    useEffect(() => {
        if (isOpen && page > 1) {
            fetchData();
        }
    }, [page, isOpen]);

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

    const handleToggleSelect = (id, itemObject) => {
        setSelectedItemsMap(prev => {
            const newMap = { ...prev };
            if (newMap[id]) {
                delete newMap[id];
            } else if (itemObject) {
                // Check limit
                if (Object.keys(prev).length >= maxItems) return prev;
                newMap[id] = itemObject;
            }
            return newMap;
        });
    };

    const handleConfirm = () => {
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        const selectedItems = Object.values(selectedItemsMap);
        if (selectedItems.length === 0) return;
        onConfirm(selectedItems);
    };

    const categoryMap = useMemo(() => {
        return categories.length > 0 ? categories : [];
    }, [categories]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <motion.div
                className={styles.popupContainer}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
                <button className={styles.topCloseBtn} onClick={onClose}>
                    <FiX size={20} />
                </button>

                <div className={styles.hubContainer}>
                    {/* ─── Sidebar ─── */}
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <div className={styles.sidebarBrandRow}>
                                <div className={styles.brandLogoBox}>
                                    <img src={tornadoLogo} alt="Logo" style={{ width: 42, height: 42, objectFit: 'contain' }} />
                                </div>
                            </div>

                            <div className={styles.searchBox}>
                                <div className={styles.searchIcon}>
                                    <FiSearch size={14} color="rgba(135,135,135,0.4)" />
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
                                    <span className={styles.categoryCount}>{cat.count || 0}</span>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* ─── Main View ─── */}
                    <div className={styles.mainGrid}>
                        {/* Category Title */}
                        <div className={styles.gridHeader}>
                            <div className={styles.gridTitle}>
                                {selectedCategory || 'Components'}
                            </div>

                            <div className={styles.gridHeaderRight}>
                                {isSelectMode && Object.keys(selectedItemsMap).length >= maxItems && (
                                    <div className={styles.limitWarning}>
                                        Max {maxItems} components reached
                                    </div>
                                )}
                                <button
                                    className={isSelectMode ? styles.exitSelectBtn : styles.chooseComponentsHeaderBtn}
                                    onClick={() => setIsSelectMode(!isSelectMode)}
                                >
                                    {isSelectMode ? (
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
                        </div>

                        {/* Trending Section */}
                        {!selectedCategory && sidebarActiveItem === 'Home' && trendingItems.length > 0 && (
                            <div className={styles.trendingSection}>
                                <div className={styles.trendingHeader}>
                                    <span className={styles.trendingTitle}>Newest</span>
                                </div>
                                <div className={styles.itemGrid}>
                                    {trendingItems.slice(0, 3).map((item, idx) => (
                                        <ComponentCard
                                            key={`trend-${item.id || idx}`}
                                            item={item}
                                            type={item.type || 'component'}
                                            onCardClick={typeof window !== 'undefined' && window.innerWidth <= 500 ? () => handleToggleSelect(item.id, item) : setPreviewItem}
                                            isSelectMode={typeof window !== 'undefined' && window.innerWidth <= 500 ? true : isSelectMode}
                                            isSelected={!!selectedItemsMap[item.id]}
                                            isLimitReached={isSelectMode && !selectedItemsMap[item.id] && Object.keys(selectedItemsMap).length >= maxItems}
                                            onToggleSelect={(id) => handleToggleSelect(id, item)}
                                        />
                                    ))}
                                </div>
                                <div className={styles.trendingHeader} style={{ marginTop: 32 }}>
                                    <span className={styles.trendingTitle}>Popular</span>
                                </div>
                                <div className={styles.itemGrid}>
                                    {trendingItems.slice(3, 6).map((item, idx) => (
                                        <ComponentCard
                                            key={`pop-${item.id || idx}`}
                                            item={item}
                                            type={item.type || 'component'}
                                            onCardClick={typeof window !== 'undefined' && window.innerWidth <= 500 ? () => handleToggleSelect(item.id, item) : setPreviewItem}
                                            isSelectMode={typeof window !== 'undefined' && window.innerWidth <= 500 ? true : isSelectMode}
                                            isSelected={!!selectedItemsMap[item.id]}
                                            onToggleSelect={(id) => handleToggleSelect(id, item)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Standard Grid if category is selected, items exist, or we are specifically in Liked view */}
                        {(selectedCategory || items.length > 0 || sidebarActiveItem === 'Liked components') && (
                            <>
                                {loading && page === 1 ? (
                                    <div className={styles.itemGrid}>
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <div key={`skel-${i}`} className={styles.skeletonPulse}>
                                                <div className={styles.shimmerEffect} />
                                            </div>
                                        ))}
                                    </div>
                                ) : error && page === 1 ? (
                                    <div className={styles.emptyState}>{error}</div>
                                ) : items.length === 0 ? (
                                    sidebarActiveItem === 'Liked components' ? (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={styles.premiumEmptyState}
                                        >
                                            <div className={styles.emptyContentWrapper}>
                                                <div className={styles.largeHeartBg}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="100" viewBox="0 -960 960 960" width="100" fill="currentColor">
                                                        <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/>
                                                    </svg>
                                                </div>
                                                <span className={styles.emptyStateText}>Like some components</span>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className={styles.emptyState}>No items found for this category.</div>
                                    )
                                ) : (
                                    <>
                                        <div className={styles.itemGrid}>
                                            {items.map((item) => (
                                                <ComponentCard
                                                    key={item.id}
                                                    item={item}
                                                    type={item.type || 'component'}
                                                    isSelectMode={typeof window !== 'undefined' && window.innerWidth <= 500 ? true : isSelectMode}
                                                    isSelected={!!selectedItemsMap[item.id]}
                                                    isLimitReached={isSelectMode && !selectedItemsMap[item.id] && Object.keys(selectedItemsMap).length >= maxItems}
                                                    onToggleSelect={(id) => handleToggleSelect(id, item)}
                                                    onCardClick={typeof window !== 'undefined' && window.innerWidth <= 500 ? () => handleToggleSelect(item.id, item) : setPreviewItem}
                                                />
                                            ))}
                                        </div>

                                        {page < totalPages && !loading && (
                                            <div ref={setObserverRefElement} style={{ height: '40px', width: '100%', marginTop: '20px' }} />
                                        )}

                                        {loading && page > 1 && (
                                            <div className={styles.itemGrid} style={{ marginTop: 20 }}>
                                                {[1, 2, 3].map((i) => (
                                                    <div key={`skel-more-${i}`} className={styles.skeletonPulse}>
                                                        <div className={styles.shimmerEffect} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    {/* Popup Sticky Bar */}
                    {isSelectMode && Object.keys(selectedItemsMap).length > 0 && (
                        <div className={styles.stickyCartBar}>
                            <div className={styles.stickyCartInfo}>
                                {Object.keys(selectedItemsMap).length} component(s) selected
                            </div>
                            <button className={styles.stickyCartButton} onClick={handleConfirm}>
                                Add to Chat
                            </button>
                        </div>
                    )}
                </div>

                {/* Preview Modal */}
                <SandpackPreviewPopup
                    isOpen={!!previewItem}
                    onClose={() => setPreviewItem(null)}
                    item={previewItem}
                    isSelectMode={isSelectMode}
                    isSelected={previewItem ? !!selectedItemsMap[previewItem.id] : false}
                    onToggleSelect={(id) => handleToggleSelect(id, previewItem)}
                />

                <AuthGateModal 
                    isOpen={showAuthModal} 
                    onClose={() => setShowAuthModal(false)} 
                />
            </motion.div>
        </div>
    );
}
