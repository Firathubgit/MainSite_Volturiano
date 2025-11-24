import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './AdminButton.module.css';

export default function AdminButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    loading && styles.loading,
    disabled && styles.disabled,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className={styles.spinner} size={16} />
          {children}
        </>
      ) : (
        <>
          {Icon && <Icon className={styles.icon} size={16} />}
          {children}
        </>
      )}
    </button>
  );
}






