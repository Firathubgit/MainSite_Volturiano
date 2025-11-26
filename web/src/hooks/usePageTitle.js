import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Page title configuration based on routes
 */
const PAGE_TITLES = {
  // General/default title
  default: 'Volturiano – Luxury Sports Automotive',
  
  // Route-specific titles
  '/': 'Volturiano – Redefining Performance', // Hero/landing page
  '/start': 'Volturiano – Redefining Performance', // Hero/landing page
  '/models': 'Volturiano – Luxury Sports Automotive', // Models page
  '/configurator': 'Volturiano Configurator – Build Your Car', // 3D Configurator
  '/world': 'Volturiano | Performance. Precision. Identity.', // Dark premium feel
  '/investor': 'Volturiano – Luxury Sports Automotive',
  '/garage': 'Volturiano – Customize Your Style', // Garage (material/colour selector feel)
  '/account/profile': 'Volturiano – Luxury Sports Automotive',
  '/account/login': 'Volturiano – Luxury Sports Automotive',
  '/account/signup': 'Volturiano – Luxury Sports Automotive',
  '/admin': 'Volturiano Admin – Luxury Sports Automotive',
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

