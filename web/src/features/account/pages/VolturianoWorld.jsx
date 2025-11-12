import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/account.module.css';

export default function VolturianoWorld() {
  const { t } = useTranslation('account');

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('volturianoWorld.title')}</h1>
        <p className={styles.subtitle}>{t('volturianoWorld.subtitle')}</p>
      </div>
    </div>
  );
}


