import React from 'react';
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
  emptyMessage = 'No data available'
}) {
  const handleSort = (column) => {
    if (onSort) {
      const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(column, newDirection);
    }
  };

  const handleSelectAll = (e) => {
    if (onRowSelect && e.target.checked) {
      onRowSelect(data.map((_, index) => index));
    } else if (onRowSelect) {
      onRowSelect([]);
    }
  };

  const handleSelectRow = (index) => {
    if (onRowSelect) {
      const isSelected = selectedRows.includes(index);
      if (isSelected) {
        onRowSelect(selectedRows.filter(i => i !== index));
      } else {
        onRowSelect([...selectedRows, index]);
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {onRowSelect && (
              <th className={styles.checkboxColumn}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={styles.headerCell}
                onClick={() => column.sortable && handleSort(column.key)}
                style={{ cursor: column.sortable ? 'pointer' : 'default' }}
              >
                <div className={styles.headerContent}>
                  <span>{column.label}</span>
                  {column.sortable && sortColumn === column.key && (
                    <span className={styles.sortIndicator}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`${styles.row} ${selectedRows.includes(rowIndex) ? styles.selected : ''}`}
            >
              {onRowSelect && (
                <td className={styles.checkboxColumn}>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(rowIndex)}
                    onChange={() => handleSelectRow(rowIndex)}
                  />
                </td>
              )}
              {columns.map((column) => (
                <td key={column.key} className={styles.cell}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



