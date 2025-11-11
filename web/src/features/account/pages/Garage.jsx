import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/account.module.css';

export default function Garage() {
  const { t } = useTranslation('account');
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('garage.title')}</h1>
        <p className={styles.subtitle}>
          {t('garage.subtitle')}
        </p>
      </div>
    </div>
  );
}

