import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { I18nextProvider, useTranslation } from 'react-i18next';
import './styles/reset.css';
import './styles/variables.css';
import './styles/base.css';
import './styles/utilities.css';
import i18n from './providers/i18n';

const App = lazy(() => import('./app/App'));

function LoadingFallback() {
  const { t } = useTranslation('common');
  return <div className="center">{t('loading')}</div>;
}

const router = createBrowserRouter([
  {
    path: '/*',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <App />
      </Suspense>
    ),
  },
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <RouterProvider
        router={router}
        future={{ v7_startTransition: true }}
      />
    </I18nextProvider>
  </React.StrictMode>
);

