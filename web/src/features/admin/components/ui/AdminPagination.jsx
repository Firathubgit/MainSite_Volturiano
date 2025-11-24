import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import styles from './AdminPagination.module.css';

export default function AdminPagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  className = ''
}) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`${styles.pagination} ${className}`}>
      <div className={styles.info}>
        {totalItems && pageSize ? (
          <>
            Showing <span className={styles.number}>{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to{' '}
            <span className={styles.number}>{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
            <span className={styles.number}>{totalItems}</span> results
          </>
        ) : (
          <>
            Page <span className={styles.number}>{currentPage}</span> of <span className={styles.number}>{totalPages}</span>
          </>
        )}
      </div>
      <div className={styles.controls}>
        <button
          className={styles.button}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ArrowLeft size={16} />
        </button>
        <div className={styles.pageNumbers}>
          {getPageNumbers().map((page) => (
            <button
              key={page}
              className={`${styles.pageButton} ${currentPage === page ? styles.pageButtonActive : ''}`}
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          className={styles.button}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ArrowRight size={16} />
        </button>
      </div>
      {onPageSizeChange && (
        <div className={styles.pageSize}>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={styles.select}
            aria-label="Items per page"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      )}
    </div>
  );
}






