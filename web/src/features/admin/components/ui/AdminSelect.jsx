import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check, Search } from 'lucide-react';
import styles from './AdminSelect.module.css';

export default function AdminSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  error,
  helperText,
  required,
  id,
  multiple = false,
  searchable = false,
  disabled = false,
  className = '',
  ...props
}) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dropdownRef.current && focusedIndex >= 0) {
      const items = dropdownRef.current.querySelectorAll('[role="option"]');
      if (items[focusedIndex]) {
        items[focusedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValue = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const removeValue = (e, valToRemove) => {
    e.stopPropagation();
    if (Array.isArray(value)) {
      onChange(value.filter(v => v !== valToRemove));
    }
  };

  const isSelected = (val) => {
    return Array.isArray(value) ? value.includes(val) : value === val;
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex].value);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        }
        break;
      default:
        break;
    }
  };

  const getDisplayValue = () => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return <span className={styles.placeholder}>{placeholder}</span>;
    }

    if (multiple && Array.isArray(value)) {
      return (
        <div className={styles.chips}>
          {value.map(val => {
            const opt = options.find(o => o.value === val);
            return (
              <span key={val} className={styles.chip}>
                {opt?.label || val}
                <button
                  type="button"
                  className={styles.chipRemove}
                  onClick={(e) => removeValue(e, val)}
                  aria-label={`Remove ${opt?.label || val}`}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      );
    }

    const opt = options.find(o => o.value === value);
    return <span className={styles.value}>{opt?.label || value}</span>;
  };

  return (
    <div 
      className={`${styles.selectWrapper} ${className}`} 
      ref={containerRef}
    >
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.selectContainer}>
        <div
          id={selectId}
          className={`${styles.select} ${error ? styles.error : ''} ${isOpen ? styles.open : ''} ${disabled ? styles.disabled : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          tabIndex={disabled ? -1 : 0}
          {...props}
        >
          <div className={styles.selectValue}>
            {getDisplayValue()}
          </div>
          <ChevronDown 
            size={16} 
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} 
          />
        </div>

        {isOpen && (
          <div className={styles.dropdown} ref={dropdownRef} role="listbox">
            {searchable && (
              <div className={styles.searchContainer}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setFocusedIndex(-1);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              </div>
            )}
            <div className={styles.options}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, index) => {
                  const selected = isSelected(opt.value);
                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={selected}
                      className={`${styles.option} ${selected ? styles.optionSelected : ''} ${index === focusedIndex ? styles.optionFocused : ''}`}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <span>{opt.label}</span>
                      {selected && <Check size={14} className={styles.checkIcon} />}
                    </div>
                  );
                })
              ) : (
                <div className={styles.noOptions}>No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
      {helperText && !error && <p className={styles.helperText}>{helperText}</p>}
    </div>
  );
}






