import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

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
    return refreshPromise;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // If no session or error, try to refresh
    if (error || !session) {
      logger.debug('No valid session found, attempting refresh...');
      return await refreshSession();
    }

    // Check if token is close to expiring (within 60 seconds)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresAtMs = expiresAt * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAtMs - now;
      
      // If token expires in less than 60 seconds, proactively refresh
      if (timeUntilExpiry < 60000) {
        logger.debug('Token expiring soon, proactively refreshing...');
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
 */
export const refreshSession = async (): Promise<boolean> => {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      logger.debug('Attempting to refresh session...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('Failed to refresh session:', error);
        return false;
      }
      
      if (!data.session) {
        logger.warn('No session returned after refresh');
        return false;
      }
      
      logger.info('Session refreshed successfully');
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
 * 
 * @param operation - The async operation to perform
 * @param retryCount - Number of retries (default 1)
 * @returns The result of the operation
 */
export async function withSessionRefresh<T>(
  operation: () => Promise<T>,
  retryCount: number = 1
): Promise<T> {
  try {
    // Ensure session is valid before the operation
    await ensureValidSession();
    return await operation();
  } catch (error: any) {
    const isJwtExpired = 
      error?.code === 'PGRST301' || 
      error?.message?.includes('JWT expired') ||
      error?.message?.includes('token is expired');

    if (isJwtExpired && retryCount > 0) {
      logger.debug('JWT expired detected, refreshing and retrying...');
      const refreshed = await refreshSession();
      
      if (refreshed) {
        return withSessionRefresh(operation, retryCount - 1);
      }
    }
    
    throw error;
  }
}
