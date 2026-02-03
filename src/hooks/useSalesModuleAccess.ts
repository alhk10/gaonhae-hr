/**
 * Sales Module Access Hook
 * React hook for checking sales module access throughout the app
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasSalesModuleAccess } from '@/services/salesModuleService';

export interface SalesModuleAccessState {
  hasAccess: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useSalesModuleAccess = (): SalesModuleAccessState => {
  const { user, userrole, isLoading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      // Reset state
      setError(null);
      setIsLoading(true);

      try {
        // Wait for auth to complete
        if (authLoading) {
          return;
        }

        // TESTING MODE: Grant access to all authenticated users
        if (user) {
          console.log('🧪 Sales Module: Testing mode enabled - granting access');
          setHasAccess(true);
          setIsLoading(false);
          return;
        }

        setHasAccess(false);
      } catch (err) {
        console.error('Error checking sales module access:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [user, userrole, authLoading]);

  return {
    hasAccess,
    isLoading,
    error
  };
};