import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refresh attempts

/**
 * Ensures the Supabase session is valid before making database requests.
 * This handles JWT expiration by automatically refreshing the session.
 * 
 * Use this function before critical database operations to prevent 
 * "JWT expired" errors.
 * 
 * @returns Promise<boolean> - true if session is valid, false if refresh failed
 */
export const ensureValidSession = async (): Promise<boolean> => {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    logger.debug('Session refresh already in progress, waiting...');
    return refreshPromise;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // If no session or error, try to refresh
    if (error || !session) {
      logger.debug('No valid session found, attempting refresh...');
      return await refreshSession();
    }

    // Check if token is close to expiring (within 2 minutes for extra safety)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresAtMs = expiresAt * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAtMs - now;
      
      // If token expires in less than 2 minutes, proactively refresh
      if (timeUntilExpiry < 120000) {
        logger.debug(`Token expiring in ${Math.round(timeUntilExpiry / 1000)}s, proactively refreshing...`);
        return await refreshSession();
      }
    }

    return true;
  } catch (error) {
    logger.error('Error checking session:', error);
    return await refreshSession();
  }
};

/**
 * Forces a session refresh. Used when a request fails with JWT expired.
 * Includes rate limiting to prevent refresh storms.
 */
export const refreshSession = async (): Promise<boolean> => {
  // Rate limit refresh attempts
  const now = Date.now();
  if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
    logger.debug('Refresh rate limited, skipping...');
    // Even if rate limited, check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  lastRefreshTime = now;
  
  refreshPromise = (async () => {
    try {
      logger.debug('Attempting to refresh session...');
      
      // First, try to get the current session
      const { data: currentData } = await supabase.auth.getSession();
      
      // If there's no session at all, we can't refresh
      if (!currentData.session) {
        logger.warn('No session to refresh - user may need to log in again');
        return false;
      }
      
      // Attempt the refresh
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('Failed to refresh session:', error);
        // If refresh fails, try to re-authenticate using stored session
        // This can happen if the refresh token itself is expired
        return false;
      }
      
      if (!data.session) {
        logger.warn('No session returned after refresh');
        return false;
      }
      
      // Small delay to ensure the new token is propagated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the new session is valid
      const { data: verifyData, error: verifyError } = await supabase.auth.getSession();
      if (verifyError || !verifyData.session) {
        logger.error('Session verification failed after refresh');
        return false;
      }
      
      logger.info('Session refreshed and verified successfully');
      return true;
    } catch (error) {
      logger.error('Error during session refresh:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Wraps a Supabase database operation with automatic session refresh on JWT expired errors.
 * This is the preferred way to make database calls that need session refresh protection.
 * 
 * @param operation - The async operation to perform
 * @param retryCount - Number of retries (default 2)
 * @returns The result of the operation
 */
export async function withSessionRefresh<T>(
  operation: () => Promise<T>,
  retryCount: number = 2
): Promise<T> {
  try {
    // Ensure session is valid before the operation
    const sessionValid = await ensureValidSession();
    if (!sessionValid) {
      logger.warn('Session could not be validated, attempting operation anyway...');
    }
    
    return await operation();
  } catch (error: any) {
    const isJwtExpired = 
      error?.code === 'PGRST301' || 
      error?.message?.includes('JWT expired') ||
      error?.message?.includes('token is expired') ||
      error?.message?.includes('invalid JWT');

    if (isJwtExpired && retryCount > 0) {
      logger.debug(`JWT expired detected (retry ${retryCount}), refreshing and retrying...`);
      const refreshed = await refreshSession();
      
      if (refreshed) {
        // Add a small delay before retry to ensure token propagation
        await new Promise(resolve => setTimeout(resolve, 150));
        return withSessionRefresh(operation, retryCount - 1);
      } else {
        logger.error('Session refresh failed, cannot retry operation');
      }
    }
    
    throw error;
  }
}

/**
 * Force refresh the session - use when you know the token is expired
 * and need to immediately get a new one.
 */
export const forceRefreshSession = async (): Promise<boolean> => {
  // Reset rate limiting for forced refresh
  lastRefreshTime = 0;
  isRefreshing = false;
  refreshPromise = null;
  
  return await refreshSession();
};
