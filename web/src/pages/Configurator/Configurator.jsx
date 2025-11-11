import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import PageTransition from '../../components/PageTransition/PageTransition';
import { Viewer2D } from '../../viewers/two-d/Viewer2D';
import { Viewer3D } from '../../viewers/three-d/Viewer3D';

export default function Configurator() {
  const enable3D = import.meta.env.VITE_ENABLE_R3F_MODE === 'true';
  const { t } = useTranslation('configurator');
  return (
    <PageTransition>
      <section>
        <h2>{t('title')}</h2>
        <Suspense fallback={<div className="center">{t('loading')}</div>}>
          {enable3D ? <Viewer3D /> : <Viewer2D />}
        </Suspense>
      </section>
    </PageTransition>
  );
}

