import React from 'react';
import { useTranslation } from 'react-i18next';
import PageTransition from '../../components/PageTransition/PageTransition';

export default function Models() {
  const { t } = useTranslation('models');
  return (
    <PageTransition>
      <section>
        <h2>{t('title')}</h2>
        <p>{t('description')}</p>
      </section>
    </PageTransition>
  );
}

