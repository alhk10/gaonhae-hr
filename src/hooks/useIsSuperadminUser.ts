/**
 * Lightweight superadmin check usable on public pages (/access) where the
 * visitor may or may not also be signed in to the staff app.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isSuperadmin } from '@/services/securityService';

export const useIsSuperadminUser = () => {
  const [state, setState] = useState<{ isSuperadmin: boolean; email: string | null; loading: boolean }>({
    isSuperadmin: false,
    email: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data?.user?.email || null;
        if (!email) {
          if (!cancelled) setState({ isSuperadmin: false, email: null, loading: false });
          return;
        }
        const ok = await isSuperadmin(email);
        if (!cancelled) setState({ isSuperadmin: ok, email, loading: false });
      } catch {
        if (!cancelled) setState({ isSuperadmin: false, email: null, loading: false });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
};

export default useIsSuperadminUser;
