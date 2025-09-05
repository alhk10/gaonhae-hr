/**
 * Cache Prevention Service
 * Provides utilities to prevent caching and ensure fresh data
 */

// Add cache prevention headers for sensitive HR data requests only
export const createHRDataCacheHeaders = (): HeadersInit => ({
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'X-Requested-With': 'XMLHttpRequest'
});

// Regular headers for non-sensitive requests
export const createNormalHeaders = (): HeadersInit => ({
  'Cache-Control': 'max-age=300', // 5 minutes for non-sensitive data
  'X-Requested-With': 'XMLHttpRequest'
});

// Enhanced fetch wrapper with selective cache prevention
export const fetchWithHRSecurity = async (
  url: string | URL | Request,
  options: RequestInit = {}
): Promise<Response> => {
  const hrHeaders = createHRDataCacheHeaders();
  
  // Add timestamp only for HR data requests
  const urlWithTimestamp = typeof url === 'string' 
    ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
    : url;

  return fetch(urlWithTimestamp, {
    ...options,
    headers: {
      ...hrHeaders,
      ...options.headers,
    },
    cache: 'no-store',
  });
};

// Regular fetch for non-sensitive data
export const fetchWithNormalCache = async (
  url: string | URL | Request,
  options: RequestInit = {}
): Promise<Response> => {
  const normalHeaders = createNormalHeaders();

  return fetch(url, {
    ...options,
    headers: {
      ...normalHeaders,
      ...options.headers,
    },
  });
};

// Clear only sensitive HR data from storage, preserve auth
export const clearHRDataFromStorage = (): void => {
  try {
    // Clear only HR-specific data, preserve Supabase auth
    if (typeof Storage !== 'undefined' && localStorage) {
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes('employee') || 
        key.includes('payroll') || 
        key.includes('salary') ||
        key.includes('hr_') ||
        key.includes('filtered')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Clear non-auth cookies only
    if (typeof document !== 'undefined') {
      const hrCookies = ['hr_session', 'employee_filter', 'payroll_cache'];
      hrCookies.forEach(cookieName => {
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      });
    }

    console.log('HR data cleared from storage, auth preserved');
  } catch (error) {
    console.warn('Error clearing HR data from storage:', error);
  }
};

// Selective page cache prevention for HR pages only
export const preventHRPageCache = (): void => {
  if (typeof window !== 'undefined') {
    // Only clear HR data, not auth
    window.addEventListener('beforeunload', () => {
      clearHRDataFromStorage();
    });

    // Add meta tags to prevent HR page caching
    const addNoCacheMetaTags = () => {
      if (window.location.pathname.includes('/employees') || 
          window.location.pathname.includes('/payroll') ||
          window.location.pathname.includes('/claims')) {
        
        const metaTags = [
          { name: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
          { name: 'Pragma', content: 'no-cache' },
          { name: 'Expires', content: '0' }
        ];

        metaTags.forEach(tag => {
          let meta = document.querySelector(`meta[name="${tag.name}"]`);
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', tag.name);
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', tag.content);
        });
      }
    };

    addNoCacheMetaTags();
  }
};