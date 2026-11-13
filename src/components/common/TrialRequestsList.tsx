import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { toast } from 'sonner';

const STATUSES = ['new', 'contacted', 'booked', 'closed'] as const;

interface Props {
  /** 'access' = staff password scoped; 'superadmin' = signed-in superadmin sees all */
  mode: 'access' | 'superadmin';
  /** Access mode: limit to the currently active branch */
  branchId?: string | null;
}

const TrialRequestsList: React.FC<Props> = ({ mode, branchId }) => {
  const qc = useQueryClient();
  const pw = () => sessionStorage.getItem('access_pw_v1') || '';
  const key = ['trial-requests', mode, branchId || 'all'];
  const { data: rows = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (mode === 'access') {
        const { data, error } = await (supabase as any).rpc('access_trial_requests', { p_password: pw() });
        if (error) throw error;
        return ((data || []) as any[]).filter((r) => !branchId || r.branch_id === branchId);
      }
      const { data, error } = await (supabase as any)
        .from('trial_requests').select('*, branches(name)').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({ ...r, branch_name: r.branches?.name }));
    },
    staleTime: 30 * 1000,
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = mode === 'access'
      ? await (supabase as any).rpc('access_trial_request_set_status', { p_password: pw(), p_id: id, p_status: status })
      : await (supabase as any).from('trial_requests').update({ status }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['trial-requests'] });
  };

  const open = rows.filter((r: any) => r.status === 'new').length;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          Trial Requests {open > 0 && <Badge variant="destructive">{open} new</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <p className="text-sm text-muted-foreground">No trial requests yet.</p>
          : rows.map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-2 text-sm">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="font-medium break-words">
                  {r.participant_name}{r.participant_dob ? ` · DOB ${formatDate(r.participant_dob)}` : ''}
                  {(mode === 'superadmin' || !branchId) && <Badge variant="outline" className="ml-2">{r.branch_name || r.branch_id}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground break-words">
                  {r.contact_name} · <a className="underline" href={`tel:${r.contact_phone}`}>{r.contact_phone}</a> · <a className="underline" href={`mailto:${r.contact_email}`}>{r.contact_email}</a>
                </div>
                {r.remarks && <div className="text-xs break-words">{r.remarks}</div>}
                <div className="text-[11px] text-muted-foreground">{formatDateTime(r.created_at)}{r.source ? ` · ${r.source}` : ''}</div>
              </div>
              <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default TrialRequestsList;
