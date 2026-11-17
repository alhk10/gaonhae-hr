import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/utils/dateFormat';
import { toast } from 'sonner';

interface Props { mode: 'access' | 'superadmin' }

/** Staff discount overrides log. Access mode only renders for the all-branch password (RPC refuses others). */
const DiscountOverridesList: React.FC<Props> = ({ mode }) => {
  const qc = useQueryClient();
  const pw = () => sessionStorage.getItem('access_pw_v1') || '';
  const { data: rows, isError } = useQuery({
    queryKey: ['discount-overrides', mode],
    retry: false,
    queryFn: async () => {
      if (mode === 'access') {
        const { data, error } = await (supabase as any).rpc('access_discount_overrides', { p_password: pw() });
        if (error) throw error;
        return (data || []) as any[];
      }
      const { data, error } = await (supabase as any).from('invoice_discount_override_log')
        .select('*, students(first_name,last_name), branches(name), term_calendars(name)')
        .order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        ...r,
        student_name: `${r.students?.first_name || ''} ${r.students?.last_name || ''}`.trim(),
        branch_name: r.branches?.name, term_name: r.term_calendars?.name,
      }));
    },
    staleTime: 30 * 1000,
  });

  if (isError || !rows) return null;

  const markSeen = async (id: string) => {
    const { error } = mode === 'access'
      ? await (supabase as any).rpc('access_discount_override_mark_seen', { p_password: pw(), p_id: id })
      : await (supabase as any).from('invoice_discount_override_log').update({ seen_at: new Date().toISOString(), seen_by: 'superadmin' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['discount-overrides'] });
  };

  const unseen = rows.filter((r) => !r.seen_at).length;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          Discount overrides {unseen > 0 && <Badge variant="destructive">{unseen} new</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No overrides yet.</p>
          : rows.map((r) => (
            <div key={r.id} className={`flex flex-wrap items-start justify-between gap-2 rounded-md border p-2 text-sm ${r.seen_at ? 'opacity-70' : ''}`}>
              <div className="min-w-0">
                <div className="font-medium break-words">
                  {r.student_name || 'Student not chosen'} · ${Number(r.discount_amount || 0).toFixed(2)} off {r.product_name}
                </div>
                <div className="text-xs text-muted-foreground break-words">
                  {[r.branch_name, r.term_name].filter(Boolean).join(' · ')} · by {r.password_label || 'staff'} · {formatDateTime(r.created_at)}
                  <div className="break-words">{r.reason}</div>
                </div>
              </div>
              {!r.seen_at
                ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markSeen(r.id)}>Mark seen</Button>
                : <span className="text-xs text-muted-foreground">Seen</span>}
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default DiscountOverridesList;
