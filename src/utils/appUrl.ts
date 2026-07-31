/**
 * Canonical application URL helper.
 *
 * Auth emails (password reset, email verification) must link back to the
 * production domain. Using `window.location.origin` blindly can produce links
 * to stale/unpublished hosts, which Supabase then rejects and replaces with the
 * configured Site URL — landing users on a "page not found".
 *
 * On production hosts we always build links from the canonical domain.
 * On localhost / Lovable preview sandboxes we keep the current origin so
 * testing still works.
 */

export const CANONICAL_APP_URL = 'https://gaonhae.app';

const PREVIEW_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^\[?::1\]?$/,
  /\.lovableproject\.com$/i,
  /-preview--.*\.lovable\.app$/i,
];

/**
 * Base origin to use when building auth redirect URLs.
 */
export const getAppOrigin = (): string => {
  if (typeof window === 'undefined') return CANONICAL_APP_URL;

  const host = window.location.hostname;
  if (PREVIEW_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return window.location.origin;
  }

  return CANONICAL_APP_URL;
};

/**
 * Build an absolute app URL for a given path (e.g. '/auth/reset-password').
 */
export const buildAppUrl = (path = '/'): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getAppOrigin()}${normalized}`;
};
