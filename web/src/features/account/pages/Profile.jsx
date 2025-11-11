import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/account.module.css';

export default function Profile() {
  const { t } = useTranslation('account');
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('profile.title')}</h1>
        <p className={styles.subtitle}>
          {t('profile.subtitlePrimary')}
        </p>
        <p className={styles.subtitle}>
          {t('profile.subtitleSecondary')}
        </p>
      </div>
    </div>
  );
}

