/**
 * Hook for checking current user's invoice access permissions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessibleBranches, type BranchInvoiceAccess } from '@/services/invoiceAccessService';

export interface InvoiceAccessState {
  hasAccess: boolean;
  accessibleBranches: BranchInvoiceAccess[];
  canCreate: (branchId: string) => boolean;
  canEdit: (branchId: string) => boolean;
  canDelete: (branchId: string) => boolean;
  isLoading: boolean;
  isSuperadmin: boolean;
  refetch: () => Promise<void>;
}

export const useInvoiceAccess = (): InvoiceAccessState => {
  const { userrole, isLoading: authLoading } = useAuth();
  const [accessibleBranches, setAccessibleBranches] = useState<BranchInvoiceAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isSuperadmin = userrole === 'superadmin';

  const fetchAccess = useCallback(async () => {
    if (authLoading) return;
    
    setIsLoading(true);
    try {
      const branches = await getAccessibleBranches();
      setAccessibleBranches(branches);
    } catch (error) {
      console.error('Error fetching invoice access:', error);
      setAccessibleBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const canCreate = useCallback((branchId: string): boolean => {
    if (isSuperadmin) return true;
    const access = accessibleBranches.find(b => b.branch_id === branchId);
    return access?.can_create ?? false;
  }, [accessibleBranches, isSuperadmin]);

  const canEdit = useCallback((branchId: string): boolean => {
    if (isSuperadmin) return true;
    const access = accessibleBranches.find(b => b.branch_id === branchId);
    return access?.can_edit ?? false;
  }, [accessibleBranches, isSuperadmin]);

  const canDelete = useCallback((branchId: string): boolean => {
    if (isSuperadmin) return true;
    const access = accessibleBranches.find(b => b.branch_id === branchId);
    return access?.can_delete ?? false;
  }, [accessibleBranches, isSuperadmin]);

  return {
    hasAccess: isSuperadmin || accessibleBranches.length > 0,
    accessibleBranches,
    canCreate,
    canEdit,
    canDelete,
    isLoading: authLoading || isLoading,
    isSuperadmin,
    refetch: fetchAccess
  };
};

export default useInvoiceAccess;
