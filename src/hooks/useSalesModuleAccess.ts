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

        // Quick checks first
        if (!user) {
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        if (userrole !== 'superadmin') {
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        // Check with backend
        const access = await hasSalesModuleAccess();
        setHasAccess(access);
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