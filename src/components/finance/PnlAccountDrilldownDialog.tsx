import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/dateFormat';
import { toast } from 'sonner';

export interface DrilldownTxn {
  date: string;
  invoice_id: string | null;
  invoice_number: string | null;
  student_name: string | null;
  amount: number;
  source_type: string | null;
  narration: string | null;
  journal_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  accountId: string | null;
  accountCode?: string;
  accountName?: string;
  branchId: string | null; // null = all
  from: string;
  to: string;
  expectedTotal?: number;
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PnlAccountDrilldownDialog: React.FC<Props> = ({
  open, onClose, accountId, accountCode, accountName, branchId, from, to, expectedTotal,
}) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DrilldownTxn[]>([]);

  useEffect(() => {
    if (!open || !accountId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accountId, branchId, from, to]);

  const load = async () => {
    setLoading(true);
    try {
      // 1. Fetch journal lines for this account in range
      let q = supabase
        .from('journal_lines')
        .select('id, journal_id, debit, credit, description, account_id, branch_id, journal_entries!inner(id, entry_date, status, source_type, source_id, narration, branch_id)')
        .eq('account_id', accountId!)
        .gte('journal_entries.entry_date', from)
        .lte('journal_entries.entry_date', to)
        .neq('journal_entries.status', 'void');
      if (branchId) q = q.eq('journal_entries.branch_id', branchId);
      const { data, error } = await q.limit(5000);
      if (error) throw error;

      const lines = (data || []) as any[];

      // Determine sign by account type — use signed_amount logic: income = credit-debit, expense = debit-credit.
      // We don't know type here, so fetch account type once.
      let isIncome = false;
      if (lines.length) {
        const { data: acc } = await supabase.from('chart_of_accounts')
          .select('account_type').eq('id', accountId!).maybeSingle();
        isIncome = (acc as any)?.account_type === 'income';
      }
      const signed = (l: any) => {
        const d = Number(l.debit || 0), c = Number(l.credit || 0);
        return isIncome ? c - d : d - c;
      };

      // Collect invoice ids to resolve
      const invoiceIds = new Set<string>();
      const paymentIds = new Set<string>();
      for (const l of lines) {
        const je = l.journal_entries;
        if (je?.source_type === 'invoice' && je.source_id) invoiceIds.add(je.source_id);
        if (je?.source_type === 'payment' && je.source_id) paymentIds.add(je.source_id);
      }

      const paymentMap = new Map<string, { invoice_id: string | null }>();
      if (paymentIds.size) {
        const { data: pays } = await supabase.from('payments')
          .select('id, invoice_id').in('id', [...paymentIds]);
        for (const p of pays || []) paymentMap.set((p as any).id, { invoice_id: (p as any).invoice_id });
        for (const p of pays || []) if ((p as any).invoice_id) invoiceIds.add((p as any).invoice_id);
      }

      const invoiceMap = new Map<string, { invoice_number: string; student_id: string | null }>();
      if (invoiceIds.size) {
        const { data: invs } = await supabase.from('invoices')
          .select('id, invoice_number, student_id').in('id', [...invoiceIds]);
        for (const inv of invs || []) invoiceMap.set((inv as any).id, {
          invoice_number: (inv as any).invoice_number,
          student_id: (inv as any).student_id,
        });
      }

      const studentIds = new Set<string>();
      for (const inv of invoiceMap.values()) if (inv.student_id) studentIds.add(inv.student_id);
      const studentMap = new Map<string, string>();
      if (studentIds.size) {
        const { data: studs } = await supabase.from('students')
          .select('id, first_name, last_name').in('id', [...studentIds]);
        for (const s of studs || []) {
          const name = [(s as any).first_name, (s as any).last_name].filter(Boolean).join(' ').trim();
          studentMap.set((s as any).id, name);
        }
      }

      const out: DrilldownTxn[] = lines.map((l) => {
        const je = l.journal_entries;
        let invoiceId: string | null = null;
        if (je?.source_type === 'invoice') invoiceId = je.source_id;
        else if (je?.source_type === 'payment') invoiceId = paymentMap.get(je.source_id)?.invoice_id || null;
        const inv = invoiceId ? invoiceMap.get(invoiceId) : null;
        const studentName = inv?.student_id ? (studentMap.get(inv.student_id) || null) : null;
        return {
          date: je?.entry_date,
          invoice_id: invoiceId,
          invoice_number: inv?.invoice_number || null,
          student_name: studentName,
          amount: signed(l),
          source_type: je?.source_type || null,
          narration: je?.narration || l.description || null,
          journal_id: je?.id,
        };
      })
      .filter(r => r.amount !== 0)
      .sort((a, b) => (a.date < b.date ? 1 : -1));

      setRows(out);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {accountCode} — {accountName}
            <span className="block text-xs font-normal text-muted-foreground mt-1">
              {formatDate(from)} – {formatDate(to)}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No transactions.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b">
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-2 text-left font-medium">Date</th>
                  <th className="py-2 px-2 text-left font-medium">Invoice #</th>
                  <th className="py-2 px-2 text-left font-medium">Student</th>
                  <th className="py-2 px-2 text-left font-medium">Detail</th>
                  <th className="py-2 px-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-1.5 px-2 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="py-1.5 px-2">
                      {r.invoice_number ? (
                        <Link to={`/sales/invoices?invoice=${r.invoice_id}`} className="text-primary hover:underline">
                          {r.invoice_number}
                        </Link>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-1.5 px-2">{r.student_name || <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-1.5 px-2 text-muted-foreground truncate max-w-[220px]" title={r.narration || ''}>
                      {r.source_type === 'payment' ? 'Payment' : r.source_type === 'invoice' ? 'Invoice' : r.source_type === 'claim' ? 'Claim' : (r.narration || '—')}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-background border-t font-semibold">
                <tr>
                  <td colSpan={4} className="py-2 px-2 text-right">Total</td>
                  <td className="py-2 px-2 text-right tabular-nums">{fmt(total)}</td>
                </tr>
                {expectedTotal !== undefined && Math.abs(expectedTotal - total) > 0.01 && (
                  <tr className="text-[10px] text-muted-foreground font-normal">
                    <td colSpan={5} className="py-1 px-2 text-right">P&L row total: {fmt(expectedTotal)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PnlAccountDrilldownDialog;
