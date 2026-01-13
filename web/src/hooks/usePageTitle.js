import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Page title configuration based on routes
 */
const PAGE_TITLES = {
  // General/default title
  default: 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system',
  
  // Route-specific titles - All focused on agency/webbyrå göteborg
  '/': 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system', // Agency focus
  '/start': 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system', // Agency focus
  '/models': 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system', // Updated to agency focus
  '/agency': 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system', // Agency page
  '/configurator': 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system', // Updated to agency focus
  '/world': 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system', // Updated to agency focus
  '/investor': 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system', // Updated to agency focus
  '/garage': 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system', // Updated to agency focus
  '/account/profile': 'Volturio Studios – Profil',
  '/account/login': 'Volturio Studios – Logga in',
  '/account/signup': 'Volturio Studios – Skapa konto',
  '/admin': 'Volturio Studios – Admin',
};

/**
 * Custom hook to set page title based on current route
 * 
 * @param {string} customTitle - Optional custom title to override route-based title
 * 
 * @example
 * // In a component - use default route-based title
 * usePageTitle();
 * 
 * @example
 * // In a component - override with custom title
 * usePageTitle('Volturiano – Customize Your Style');
 * 
 * @example
 * // In Configurator component when material selector is active
 * const isMaterialSelector = ...;
 * usePageTitle(isMaterialSelector ? 'Volturiano – Customize Your Style' : null);
 */
export function usePageTitle(customTitle = null) {
  const location = useLocation();

  useEffect(() => {
    // Use custom title if provided, otherwise use route-based title
    let title = customTitle;
    
    if (!title) {
      // Check for exact route match first
      title = PAGE_TITLES[location.pathname];
      
      // Check for partial matches (for dynamic routes)
      if (!title) {
        if (location.pathname.startsWith('/configurator')) {
          title = PAGE_TITLES['/configurator'];
        } else if (location.pathname.startsWith('/admin')) {
          title = PAGE_TITLES['/admin'];
        } else if (location.pathname.startsWith('/garage')) {
          title = PAGE_TITLES['/garage'];
        } else if (location.pathname.startsWith('/account')) {
          // Check specific account routes
          if (location.pathname.includes('/profile')) {
            title = PAGE_TITLES['/account/profile'];
          } else if (location.pathname.includes('/login')) {
            title = PAGE_TITLES['/account/login'];
          } else if (location.pathname.includes('/signup')) {
            title = PAGE_TITLES['/account/signup'];
          } else {
            title = PAGE_TITLES.default;
          }
        } else {
          // Use default title
          title = PAGE_TITLES.default;
        }
      }
    }
    
    // Set document title
    document.title = title;
    
    // Optional: Update meta tags for SEO
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle) {
      metaTitle.setAttribute('content', title);
    }
  }, [location.pathname, customTitle]);
}

/**
 * Set a custom page title programmatically
 * @param {string} title - The title to set
 */
export function setPageTitle(title) {
  document.title = title;
}
