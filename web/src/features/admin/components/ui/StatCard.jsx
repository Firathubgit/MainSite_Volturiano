import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import styles from './StatCard.module.css';

export default function StatCard({ label, value, trend, icon: Icon }) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.label}>{label}</p>
          <h3 className={styles.value}>{value}</h3>
        </div>
        {Icon && (
          <div className={styles.iconContainer}>
            <Icon size={20} />
          </div>
        )}
      </div>
      
      {trend !== undefined && (
        <div className={styles.trend}>
          <span className={`${styles.trendValue} ${isPositive ? styles.positive : styles.negative}`}>
            {isPositive ? <ArrowUpRight size={16} className={styles.trendIcon} /> : <ArrowDownRight size={16} className={styles.trendIcon} />}
            {Math.abs(trend)}%
          </span>
          <span className={styles.trendLabel}>from last month</span>
        </div>
      )}
    </div>
  );
}

