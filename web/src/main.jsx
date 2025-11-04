import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/reset.css';
import './styles/variables.css';
import './styles/base.css';
import './styles/utilities.css';
import './providers/i18n';

const App = lazy(() => import('./app/App'));

const router = createBrowserRouter([
  { path: '/*', element: (
      <Suspense fallback={<div className="center">Loading…</div>}>
        <App />
      </Suspense>
    )
  }
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

