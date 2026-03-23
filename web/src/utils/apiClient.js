/**
 * Universal API Client for Volturiano
 * 
 * In development (localhost): Uses the Vite proxy so requests go to `/api/...` and bypass CORS.
 * In production (Vercel): Vercel handles the `/api/...` proxy automatically via `vercel.json` routing.
 * 
 * However, if you ever need to bypass Vercel routing and call the Railway API directly,
 * this utility automatically prepends `VITE_API_URL`.
 * 
 * Usage:
 * import { apiFetch } from '@/utils/apiClient';
 * const res = await apiFetch('/api/projects');
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiFetch = async (endpoint, options = {}) => {
  // Ensure the endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // In development, or if VITE_API_URL is missing, it just uses the relative path (e.g., '/api/...')
  // This gracefully falls back to the Vite Proxy or Vercel edge rewrite
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return response;
  } catch (error) {
    console.error(`[API Client Error] Fetch to ${url} failed:`, error);
    throw error;
  }
};
