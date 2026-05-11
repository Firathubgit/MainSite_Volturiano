import React, { useState, useEffect } from 'react';
import { FiSearch, FiX, FiCheck, FiLayers, FiZap, FiPackage } from 'react-icons/fi';
import styles from './ComponentSelector.module.css';
import { useBuilderAuth } from '../../../../../contexts/BuilderAuthContext';
import AuthGateModal from '../../../../../components/Modals/AuthGateModal';

export default function ComponentSelector({ isOpen, onClose, onConfirm }) {
    const { isAuthenticated, getAccessToken } = useBuilderAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    
    const [catalog, setCatalog] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        if (isOpen) {
            if (!isAuthenticated) {
                setShowAuthModal(true);
                setLoading(false);
                return;
            }
            setLoading(true);
            const token = getAccessToken();
            fetch('/api/component-catalog', {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            })
                .then(res => res.json())
                .then(data => {
                    setCatalog(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch catalog:', err);
                    setLoading(false);
                });
        }
    }, [isOpen, isAuthenticated, getAccessToken]);

    const toggleSelection = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleConfirm = () => {
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        onConfirm(Array.from(selectedIds));
    };

    if (!isOpen) return null;

    const filteredComponents = catalog?.components.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeCategory === 'All' || c.category === activeCategory;
        return matchesSearch && matchesCategory;
    }) || [];

    const categories = ['All', ...(catalog?.categories || [])];

    return (
        <>
            <div className={styles.overlay}>
                <div className={styles.modal}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.titleGroup}>
                            <h2>
                                <FiLayers className={styles.iconLayer} />
                                Manual Selection Mode
                            </h2>
                            <p className={styles.subtitle}>Override AI logic and pick specific components to inject into the sandbox.</p>
                        </div>
                        <button onClick={onClose} className={styles.closeBtn}>
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Filters */}
                    <div className={styles.filters}>
                        <div className={styles.searchWrapper}>
                            <FiSearch className={styles.searchIcon} size={14} />
                            <input
                                type="text"
                                placeholder="Search components..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.categoryGroup}>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`${styles.categoryBtn} ${activeCategory === cat ? styles.categoryBtnActive : styles.categoryBtnDefault}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Component Grid */}
                    <div className={styles.grid}>
                        {loading ? (
                            <div className={styles.centeredState}>
                                <div className={styles.spinner} />
                                Loading component catalog...
                            </div>
                        ) : filteredComponents.length === 0 ? (
                            <div className={styles.centeredState}>
                                <FiPackage size={32} style={{ opacity: 0.2 }} />
                                <span>No components found matching your filters.</span>
                            </div>
                        ) : (
                            filteredComponents.map(comp => {
                                const isSelected = selectedIds.has(comp.id);
                                return (
                                    <div
                                        key={comp.id}
                                        onClick={() => toggleSelection(comp.id)}
                                        className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                                    >
                                        <div className={styles.cardHeader}>
                                            <span className={styles.badge}>{comp.category}</span>
                                            <div className={`${styles.checkCircle} ${isSelected ? styles.checkCircleSelected : ''}`}>
                                                {isSelected && <FiCheck size={12} strokeWidth={3} />}
                                            </div>
                                        </div>
                                        <h3 className={styles.cardTitle}>{comp.name}</h3>
                                        <p className={styles.cardDesc}>{comp.description}</p>
                                        {comp.preview?.notes && (
                                            <div className={styles.cardFooter}>
                                                <FiZap size={10} />
                                                {comp.preview.notes}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className={styles.footer}>
                        <div className={styles.selectionCount}>
                            <span className={styles.countVal}>{selectedIds.size}</span> components selected
                        </div>
                        <div className={styles.actions}>
                            <button onClick={onClose} className={styles.cancelBtn}>
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={selectedIds.size === 0}
                                className={styles.confirmBtn}
                            >
                                Generate Selection
                                <FiZap />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <AuthGateModal 
                isOpen={showAuthModal} 
                onClose={() => setShowAuthModal(false)} 
            />
        </>
    );
}
