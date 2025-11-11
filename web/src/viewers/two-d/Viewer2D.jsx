import React from 'react';
import { useTranslation } from 'react-i18next';
export function Viewer2D() {
  const { t } = useTranslation('configurator');
  return (
    <div style={{aspectRatio:'16/9', background:'#111', borderRadius:'10px', display:'grid', placeItems:'center'}}>
      <span>{t('viewer2dPlaceholder')}</span>
    </div>
  );
}

