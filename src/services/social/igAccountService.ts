import { supabase } from '@/integrations/supabase/client';

export interface IgAccount {
  id: string;
  branch_name: string;
  ig_user_id: string;
  ig_username: string | null;
  page_id: string | null;
  page_name: string | null;
  status: string;
  token_expires_at: string | null;
  last_verified_at: string | null;
}

export async function listIgAccounts(branch?: string): Promise<IgAccount[]> {
  let q = (supabase as any)
    .from('sm_ig_accounts')
    .select('id, branch_name, ig_user_id, ig_username, page_id, page_name, status, token_expires_at, last_verified_at')
    .order('branch_name');
  if (branch) q = q.eq('branch_name', branch);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as IgAccount[];
}

export async function disconnectIgAccount(id: string): Promise<void> {
  const { error } = await (supabase as any).from('sm_ig_accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function verifyIgAccount(id: string): Promise<{ ok: boolean; message?: string }> {
  const { data, error } = await supabase.functions.invoke('social-ig-verify', { body: { id } });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; message?: string };
}
