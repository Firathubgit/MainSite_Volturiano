import React, { useState } from 'react';
import { Plus, Search, Trash2, Star, Image as ImageIcon } from 'lucide-react';
import AdminBadge from '../ui/AdminBadge';
import styles from './VariantManager.module.css';

export default function VariantManager({
  variants,
  onUpdateVariants,
  selectedVariantId,
  onSelectVariant
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = Array.from(new Set(variants.map(v => v.category)));
  const filteredVariants = variants.filter(v => {
    const matchesSearch = v.label.toLowerCase().includes(searchTerm.toLowerCase()) || v.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || v.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddVariant = () => {
    const newVariant = {
      id: `new_variant_${Date.now()}`,
      label: 'New Variant',
      category: categories[0] || 'misc',
      dependencies: [],
      incompatibilities: [],
      isDefault: false,
      assets: {}
    };
    onUpdateVariants([...variants, newVariant]);
    onSelectVariant(newVariant.id);
  };

  const handleDeleteVariant = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this variant?')) {
      const newVariants = variants.filter(v => v.id !== id);
      onUpdateVariants(newVariants);
      if (selectedVariantId === id) onSelectVariant(null);
    }
  };

  const handleToggleDefault = (e, targetId, category) => {
    e.stopPropagation();
    const newVariants = variants.map(v => {
      if (v.category !== category) return v;
      return { ...v, isDefault: v.id === targetId };
    });
    onUpdateVariants(newVariants);
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <button 
          onClick={handleAddVariant}
          className={styles.addButton}
        >
          <Plus size={14} /> Add Variant
        </button>
        
        <div className={styles.categoryLabel}>Categories</div>
        <button
          onClick={() => setActiveCategory('all')}
          className={`${styles.categoryButton} ${activeCategory === 'all' ? styles.categoryButtonActive : ''}`}
        >
          All Categories
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`${styles.categoryButton} ${activeCategory === cat ? styles.categoryButtonActive : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.searchContainer}>
            <Search size={14} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search variants..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.count}>
            {filteredVariants.length} items
          </div>
        </div>

        <div className={styles.grid}>
          {filteredVariants.length === 0 ? (
            <div className={styles.empty}>
              No variants found. Try adding one or changing filters.
            </div>
          ) : (
            filteredVariants.map(variant => (
              <div 
                key={variant.id}
                onClick={() => onSelectVariant(variant.id)}
                className={`${styles.variantCard} ${selectedVariantId === variant.id ? styles.variantCardSelected : ''}`}
              >
                <div className={styles.variantHeader}>
                  <div className={styles.variantInfo}>
                    <div className={styles.variantTitleRow}>
                      <span className={styles.variantLabel}>{variant.label}</span>
                      {variant.isDefault && (
                        <Star size={10} className={styles.starIcon} />
                      )}
                    </div>
                    <div className={styles.variantId}>{variant.id}</div>
                  </div>
                  <AdminBadge size="sm">{variant.category}</AdminBadge>
                </div>

                <div className={styles.thumbnail}>
                  {Object.values(variant.assets || {})[0] ? (
                    <img 
                      src={Object.values(variant.assets)[0]} 
                      alt="" 
                      className={styles.thumbnailImage}
                      loading="lazy"
                    />
                  ) : (
                    <ImageIcon size={16} className={styles.thumbnailPlaceholder} />
                  )}
                  <div className={styles.assetCount}>
                    {Object.keys(variant.assets || {}).length}
                  </div>
                </div>

                <div className={styles.variantActions}>
                  <button 
                    onClick={(e) => handleToggleDefault(e, variant.id, variant.category)}
                    className={`${styles.actionButton} ${variant.isDefault ? styles.actionButtonActive : ''}`}
                    title="Set Default"
                  >
                    <Star size={14} className={variant.isDefault ? styles.starFilled : ''} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteVariant(e, variant.id)}
                    className={styles.actionButton}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

