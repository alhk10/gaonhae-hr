import { useQueries } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { classColorTint, classColorVar } from '@/utils/attendanceWeek';
import type { PayBadge } from '@/utils/paymentBadges';

export interface InvoiceDue { student_id: string; term_invoice_date: string | null; other_unpaid_total: number | null; other_unpaid_oldest: string | null }

/** Rows: student id + term being shown for that student. */
export const useInvoiceDues = (rows: { id: string; term_id?: string | null }[]) => {
  const byTerm = new Map<string, Set<string>>();
  rows.forEach((r) => { if (!r.id) return; const k = r.term_id || ''; if (!byTerm.has(k)) byTerm.set(k, new Set()); byTerm.get(k)!.add(r.id); });
  const groups = [...byTerm.entries()].map(([t, ids]) => ({ t, ids: [...ids].sort() })).sort((a, b) => a.t.localeCompare(b.t));
  const results = useQueries({
    queries: groups.map((g) => ({
      queryKey: ['student-invoice-dues', g.t, g.ids],
      staleTime: 60_000,
      queryFn: async () => {
        const { data, error } = await (supabase as any).rpc('access_student_invoice_dues', { p_student_ids: g.ids, p_term_id: g.t || null });
        if (error) throw error;
        return (data || []) as InvoiceDue[];
      },
    })),
  });
  const map = new Map<string, InvoiceDue>();
  results.forEach((r) => (r.data || []).forEach((d) => map.set(d.student_id, { ...d, other_unpaid_total: d.other_unpaid_total == null ? null : Number(d.other_unpaid_total) })));
  return map;
};

export const PayBadgeView = ({ badge }: { badge: PayBadge | null }) => badge ? (
  <Badge variant="outline" className="text-[10px]" style={{ color: classColorVar(badge.tone), borderColor: classColorVar(badge.tone), background: classColorTint(badge.tone) }}>{badge.label}</Badge>
) : null;
