/**
 * Cache Prevention Service
 * Provides utilities to prevent caching and ensure fresh data
 */

// Add cache prevention headers to fetch requests
export const createNoCacheHeaders = (): HeadersInit => ({
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'X-Requested-With': 'XMLHttpRequest'
});

// Enhanced fetch wrapper with cache prevention
export const fetchWithoutCache = async (
  url: string | URL | Request,
  options: RequestInit = {}
): Promise<Response> => {
  const noCacheHeaders = createNoCacheHeaders();
  
  // Add timestamp to prevent browser caching
  const urlWithTimestamp = typeof url === 'string' 
    ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
    : url;

  return fetch(urlWithTimestamp, {
    ...options,
    headers: {
      ...noCacheHeaders,
      ...options.headers,
    },
    cache: 'no-store',
  });
};

// Clear any browser storage (localStorage, sessionStorage, cookies)
export const clearBrowserStorage = (): void => {
  try {
    // Clear localStorage
    if (typeof Storage !== 'undefined' && localStorage) {
      localStorage.clear();
    }

    // Clear sessionStorage
    if (typeof Storage !== 'undefined' && sessionStorage) {
      sessionStorage.clear();
    }

    // Clear cookies by setting them to expire
    if (typeof document !== 'undefined') {
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      });
    }

    console.log('Browser storage cleared for security compliance');
  } catch (error) {
    console.warn('Error clearing browser storage:', error);
  }
};

// Prevent page caching on navigation
export const preventPageCache = (): void => {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearBrowserStorage();
    });

    window.addEventListener('pagehide', () => {
      clearBrowserStorage();
    });

    // Prevent back/forward cache
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    });
  }
};