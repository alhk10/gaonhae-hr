/**
 * Read-only invoice lookup for the public /access pages.
 * Backed by the SECURITY DEFINER RPC get_public_invoice_full.
 */
import { supabase } from '@/integrations/supabase/client';
import type { InvoiceData } from '@/utils/invoicePDFGenerator';

export async function getPublicInvoiceFull(invoiceId: string): Promise<InvoiceData | null> {
  const { data, error } = await (supabase as any).rpc('get_public_invoice_full', {
    p_invoice_id: invoiceId,
  });
  if (error) throw error;
  if (!data) return null;
  const raw = data as any;
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    id: raw.id,
    invoice_number: raw.invoice_number,
    issue_date: raw.issue_date,
    due_date: raw.due_date,
    subtotal: Number(raw.subtotal || 0),
    tax_amount: Number(raw.tax_amount || 0),
    discount_amount: Number(raw.discount_amount || 0),
    total_amount: Number(raw.total_amount || 0),
    amount_paid: Number(raw.amount_paid || 0),
    balance_due: Number(raw.balance_due || 0),
    notes: raw.notes ?? null,
    status: raw.status ?? null,
    student: {
      name: raw.student?.name || '',
      address: raw.student?.address ?? null,
      phone: raw.student?.phone ?? null,
      email: raw.student?.email ?? null,
    },
    branch: {
      name: raw.branch?.name || '',
      address: raw.branch?.address ?? undefined,
    },
    items: items.map((it: any, idx: number) => ({
      id: String(idx),
      description: it.description || '',
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.unit_price || 0),
      total_amount: Number(it.total_price || 0),
      tax_rate: 0,
      tax_amount: 0,
    })),
  };
}
