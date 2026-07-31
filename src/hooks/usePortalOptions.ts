import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { UserType } from '@/types/auth';

/**
 * Shared wiring for the Employee / Student / Branch portal switcher so every
 * dashboard surface offers the exact same options.
 */
export const usePortalOptions = () => {
  const { userrole, userType, availableUserTypes, activeUserType, setActiveUserType } = useAuth();
  const { hasAccess: hasBranchAccess } = useBranchAccess();

  // Superadmins already have a branch tab inside DashboardSwitcher
  const canUseBranch = hasBranchAccess && userrole !== 'superadmin';

  const options = React.useMemo<UserType[]>(() => {
    const base = (availableUserTypes?.length ? availableUserTypes : userType ? [userType] : []) as UserType[];
    const opts: UserType[] = base.filter((t) => t === 'employee' || t === 'student');
    if (canUseBranch) opts.push('branch');
    return opts;
  }, [availableUserTypes, userType, canUseBranch]);

  const rawType = activeUserType || userType;
  const effectiveType: UserType | null =
    rawType && options.includes(rawType) ? rawType : (options[0] || rawType);

  const isDualRole = options.includes('employee') && options.includes('student');

  return { options, effectiveType, setActiveUserType, isDualRole, canUseBranch };
};

export default usePortalOptions;
