import React, { Suspense } from 'react';
import PageTransition from '../../components/PageTransition/PageTransition';
import { Viewer2D } from '../../viewers/two-d/Viewer2D';
import { Viewer3D } from '../../viewers/three-d/Viewer3D';

export default function Configurator() {
  const enable3D = import.meta.env.VITE_ENABLE_R3F_MODE === 'true';
  return (
    <PageTransition>
      <section>
        <h2>Configurator</h2>
        <Suspense fallback={<div className="center">Loading viewer…</div>}>
          {enable3D ? <Viewer3D /> : <Viewer2D />}
        </Suspense>
      </section>
    </PageTransition>
  );
}

