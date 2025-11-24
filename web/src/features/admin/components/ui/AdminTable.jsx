import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import styles from './AdminTable.module.css';

export default function AdminTable({ 
  columns, 
  data, 
  onSort, 
  sortColumn, 
  sortDirection,
  onRowSelect,
  selectedRows = [],
  loading = false,
  emptyMessage = 'No data available',
  keyField = 'id',
  pagination
}) {
  const [internalSortConfig, setInternalSortConfig] = useState(null);

  const handleSort = (column) => {
    if (!column.sortable) return;
    
    let direction = 'asc';
    const currentSort = sortColumn || internalSortConfig?.key;
    const currentDirection = sortDirection || internalSortConfig?.direction;
    
    if (currentSort === column.key && currentDirection === 'asc') {
      direction = 'desc';
    }
    
    setInternalSortConfig({ key: column.key, direction });
    if (onSort) {
      onSort(column.key, direction);
    }
  };

  const handleSelectAll = (e) => {
    if (onRowSelect && e.target.checked) {
      onRowSelect(data.map(item => item[keyField]));
    } else if (onRowSelect) {
      onRowSelect([]);
    }
  };

  const handleSelectRow = (id) => {
    if (onRowSelect) {
      const isSelected = selectedRows.includes(id);
      if (isSelected) {
        onRowSelect(selectedRows.filter(rowId => rowId !== id));
      } else {
        onRowSelect([...selectedRows, id]);
      }
    }
  };

  const currentSortKey = sortColumn || internalSortConfig?.key;
  const currentSortDirection = sortDirection || internalSortConfig?.direction;
  const allSelected = data.length > 0 && data.every(item => selectedRows.includes(item[keyField]));

  if (loading) {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {onRowSelect && <th className={styles.checkboxColumn}></th>}
              {columns.map((column) => (
                <th key={column.key} className={styles.headerCell}>
                  <div className={styles.headerContent}>
                    <span>{column.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className={styles.skeletonRow}>
                {onRowSelect && (
                  <td className={styles.checkboxColumn}>
                    <div className={styles.skeleton}></div>
                  </td>
                )}
                {columns.map((col, j) => (
                  <td key={j} className={styles.cell}>
                    <div className={styles.skeleton}></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.tableWrapper}>
        <div className={styles.empty}>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {onRowSelect && (
                <th className={styles.checkboxColumn}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${styles.headerCell} ${column.sortable ? styles.sortable : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className={styles.headerContent}>
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className={styles.sortIcon}>
                        {currentSortKey === column.key ? (
                          currentSortDirection === 'asc' ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )
                        ) : (
                          <ChevronsUpDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const rowId = row[keyField];
              const isSelected = selectedRows.includes(rowId);
              return (
                <tr
                  key={rowId}
                  className={`${styles.row} ${isSelected ? styles.selected : ''}`}
                >
                  {onRowSelect && (
                    <td className={styles.checkboxColumn}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowId)}
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const cellValue = row[column.key];
                    return (
                      <td key={column.key} className={styles.cell}>
                        {column.render ? column.render(cellValue, row) : cellValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Showing <span className={styles.paginationNumber}>{Math.min((pagination.currentPage - 1) * pagination.pageSize + 1, pagination.totalItems)}</span> to{' '}
            <span className={styles.paginationNumber}>{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)}</span> of{' '}
            <span className={styles.paginationNumber}>{pagination.totalItems}</span> results
          </div>
          <div className={styles.paginationControls}>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className={styles.paginationButton}
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (pagination.totalPages > 5 && pagination.currentPage > 3) {
                pageNum = pagination.currentPage - 2 + i;
              }
              if (pageNum > pagination.totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={`${styles.paginationButton} ${pagination.currentPage === pageNum ? styles.paginationButtonActive : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className={styles.paginationButton}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}






