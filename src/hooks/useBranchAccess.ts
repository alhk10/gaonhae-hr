/**
 * Custom hook for checking and managing branch dashboard access
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getEmployeeBranchAccess, 
  hasBranchDashboardAccess,
  getAccessibleBranches,
  BranchAccess 
} from '@/services/branchAccessService';

interface UseBranchAccessResult {
  hasAccess: boolean;
  accessibleBranches: string[];
  branchAccessList: BranchAccess[];
  isLoading: boolean;
  error: string | null;
  checkBranchAccess: (branchId: string) => Promise<boolean>;
  refreshAccess: () => Promise<void>;
}

export function useBranchAccess(): UseBranchAccessResult {
  const { user, userrole } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [accessibleBranches, setAccessibleBranches] = useState<string[]>([]);
  const [branchAccessList, setBranchAccessList] = useState<BranchAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBranchAccess = useCallback(async () => {
    if (!user?.employeeId) {
      setHasAccess(false);
      setAccessibleBranches([]);
      setBranchAccessList([]);
      setIsLoading(false);
      return;
    }

    // Superadmins have access to all branches
    if (userrole === 'superadmin') {
      setHasAccess(true);
      setAccessibleBranches([]); // Empty means all branches
      setBranchAccessList([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [accessList, branches] = await Promise.all([
        getEmployeeBranchAccess(user.employeeId),
        getAccessibleBranches(user.employeeId)
      ]);

      setBranchAccessList(accessList);
      setAccessibleBranches(branches);
      setHasAccess(branches.length > 0);
    } catch (err) {
      console.error('Error loading branch access:', err);
      setError('Failed to load branch access');
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.employeeId, userrole]);

  useEffect(() => {
    loadBranchAccess();
  }, [loadBranchAccess]);

  const checkBranchAccess = useCallback(async (branchId: string): Promise<boolean> => {
    // Superadmins have access to all branches
    if (userrole === 'superadmin') {
      return true;
    }

    if (!user?.employeeId) {
      return false;
    }

    return hasBranchDashboardAccess(user.employeeId, branchId);
  }, [user?.employeeId, userrole]);

  const refreshAccess = useCallback(async () => {
    await loadBranchAccess();
  }, [loadBranchAccess]);

  return {
    hasAccess,
    accessibleBranches,
    branchAccessList,
    isLoading,
    error,
    checkBranchAccess,
    refreshAccess
  };
}
