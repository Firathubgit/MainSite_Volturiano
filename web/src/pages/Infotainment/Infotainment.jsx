/**
 * Infotainment Page Component
 * Wrapper for the Infotainment OS showcase
 */
import React, { Suspense, lazy } from 'react';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';

const InfotainmentApp = lazy(() =>
  import('../../features/infotainment/components/InfotainmentApp/InfotainmentApp')
);

export default function Infotainment() {
  return (
    <Suspense fallback={<LoadingOverlay />}>
      <InfotainmentApp />
    </Suspense>
  );
}

