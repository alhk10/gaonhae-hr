import { supabase } from '@/integrations/supabase/client';
import { currencyForCountry, formatCurrency } from './currencyUtils';

// Cached branch id/name → country, loaded once so invoice lists can show S$ / A$.
const countries = new Map<string, string>();
let loaded = false;
const load = async () => {
  if (loaded) return; loaded = true;
  const { data } = await supabase.from('branches').select('id,name,country');
  (data ?? []).forEach((b: any) => { countries.set(String(b.id), b.country); countries.set(String(b.name).toLowerCase(), b.country); });
};
void load();

export const currencyOfBranch = (key?: string | null): string =>
  currencyForCountry(key ? countries.get(key) ?? countries.get(key.toLowerCase()) : null);

export const formatBranchCurrency = (amount: number, branchKey?: string | null) =>
  formatCurrency(amount, currencyOfBranch(branchKey));
