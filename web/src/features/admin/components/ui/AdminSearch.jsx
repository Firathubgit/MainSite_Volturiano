import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import styles from './AdminSearch.module.css';

export default function AdminSearch({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className = ''
}) {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={`${styles.searchWrapper} ${className}`}>
      <Search size={18} className={styles.searchIcon} />
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        aria-label="Search"
      />
      {localValue && (
        <button
          className={styles.clearButton}
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}






