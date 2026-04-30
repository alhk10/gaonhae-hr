import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Clears the React Query cache whenever the authenticated user changes.
 *
 * Without this, cached data fetched while logged in as User A (limited by
 * RLS to only their own rows) can persist into User B's session and make it
 * look like User B's data has disappeared.
 */
const AuthQueryCacheBridge = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    const identity = user?.email || user?.id || null;
    const previous = lastIdentityRef.current;

    // First run after mount: just record identity (don't wipe a fresh cache).
    if (previous === null && identity !== null) {
      lastIdentityRef.current = identity;
      return;
    }

    // Identity changed (login → different account, or logout). Wipe cache so
    // RLS-scoped data from the previous user can't leak into the new session.
    if (previous !== null && previous !== identity) {
      queryClient.clear();
    }

    lastIdentityRef.current = identity;
  }, [user, queryClient]);

  return null;
};

export default AuthQueryCacheBridge;
