/**
 * useBranchCountry
 *
 * Lightweight helper that resolves a branch_id → country (Singapore / Australia / etc.)
 * by querying the cached branches table. Used by belt selectors so they can render
 * the correct list (SG: Foundation 1/2/3 …, AU: single Foundation …).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BranchWithCountry {
  id: string;
  country: string | null;
}

const fetchBranchesWithCountry = async (): Promise<BranchWithCountry[]> => {
  const { data, error } = await supabase
    .from('branches')
    .select('id, country');

  if (error) {
    console.error('Error fetching branches for country lookup:', error);
    return [];
  }
  return (data || []) as BranchWithCountry[];
};

/**
 * Returns the country string for a branch_id (or null when unknown).
 * Cached for 10 minutes since branch country changes are extremely rare.
 */
export function useBranchCountry(branchId?: string | null): string | null {
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-country-lookup'],
    queryFn: fetchBranchesWithCountry,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (!branchId) return null;
  const branch = branches.find(b => b.id === branchId);
  return branch?.country ?? null;
}
