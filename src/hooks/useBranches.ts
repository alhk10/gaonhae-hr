/**
 * Custom hook for fetching and managing branch data
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Branch {
  id: string;
  name: string;
}

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('branches')
          .select('id, name')
          .not('name', 'in', '("Competition","Headquarters")')
          .order('name');

        if (error) throw error;
        setBranches(data || []);
      } catch (err) {
        console.error('Error fetching branches:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch branches');
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  return { branches, loading, error };
}