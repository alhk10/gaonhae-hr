/**
 * Phase 5 — Tax service (GST F5 / BAS)
 * Aggregates posted journal lines tagged with tax codes into country-specific report boxes.
 *
 * Box mapping is driven by tax_code.direction + report_box hint.
 * - SG output codes (SR/ZR/ES/OS) -> supply boxes (1/2/3/4); SR amount drives Box 6 output tax.
 * - SG input codes (TX/BL/NR)     -> Box 5 (purchases) and Box 7 (input tax claimed for TX).
 * - AU output codes (GST/FRE/EXP) -> G1/G2/G3 + 1A.
 * - AU input codes  (INP/CAP)     -> G10/G11 + 1B.
 */
import { supabase } from '@/integrations/supabase/client';

export type TaxCountry = 'Singapore' | 'Australia';

export interface TaxCode {
  id: string;
  code: string;
  name: string;
  country: TaxCountry;
  rate: number;
  direction: 'output' | 'input' | 'none';
  report_box: string | null;
  is_active: boolean;
}

export interface TaxBox {
  key: string;
  label: string;
  amount: number;
  /** keys of contributing tax codes (used for drill-down) */
  contributing_tax_code_ids: string[];
  isComputed?: boolean;
  isTotal?: boolean;
}

export interface TaxReturnComputed {
  country: TaxCountry;
  branchId: string | null;
  from: string;
  to: string;
  boxes: TaxBox[];
  netPayable: number;
}

export interface TaxQuery {
  branchId: string | null;
  country: TaxCountry;
  from: string;
  to: string;
}

interface AggRow {
  tax_code_id: string;
  base: number;   // sum of tax_base_amount; falls back to (debit+credit) - tax_amount
  tax: number;    // sum of tax_amount
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function listTaxCodes(country?: TaxCountry): Promise<TaxCode[]> {
  let q = supabase.from('tax_codes').select('*').eq('is_active', true).order('code');
  if (country) q = q.eq('country', country);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as TaxCode[];
}

async function aggregate(q: TaxQuery): Promise<Map<string, AggRow>> {
  // Pull posted journal lines in date range with tax_code_id set.
  let query = supabase
    .from('journal_lines')
    .select(`
      tax_code_id, tax_amount, tax_base_amount, debit, credit, branch_id,
      journal_entries!inner(entry_date, status, branch_id)
    `)
    .not('tax_code_id', 'is', null)
    .gte('journal_entries.entry_date', q.from)
    .lte('journal_entries.entry_date', q.to)
    .eq('journal_entries.status', 'posted');

  if (q.branchId) {
    // Filter on the joined table by branch
    query = query.eq('journal_entries.branch_id', q.branchId);
  }

  const { data, error } = await query.limit(50000);
  if (error) throw error;

  const map = new Map<string, AggRow>();
  for (const row of (data || []) as any[]) {
    const id = row.tax_code_id as string;
    if (!id) continue;
    const tax = Number(row.tax_amount || 0);
    let base = Number(row.tax_base_amount || 0);
    if (base === 0) {
      base = Math.abs(Number(row.debit || 0) + Number(row.credit || 0)) - Math.abs(tax);
      if (base < 0) base = 0;
    }
    const cur = map.get(id) || { tax_code_id: id, base: 0, tax: 0 };
    cur.base += base;
    cur.tax += tax;
    map.set(id, cur);
  }
  return map;
}

export async function getTaxReturn(q: TaxQuery): Promise<TaxReturnComputed> {
  const [codes, agg] = await Promise.all([listTaxCodes(q.country), aggregate(q)]);
  const byCode = new Map(codes.map(c => [c.code, c]));
  const sumWhere = (pred: (c: TaxCode) => boolean) => {
    let base = 0, tax = 0;
    const ids: string[] = [];
    for (const c of codes) {
      if (!pred(c)) continue;
      const a = agg.get(c.id);
      if (a) { base += a.base; tax += a.tax; }
      ids.push(c.id);
    }
    return { base: r2(base), tax: r2(tax), ids };
  };

  if (q.country === 'Singapore') {
    const box1 = sumWhere(c => c.code === 'SG-SR');
    const box2 = sumWhere(c => c.code === 'SG-ZR');
    const box3 = sumWhere(c => c.code === 'SG-ES');
    const box4Total = r2(box1.base + box2.base + box3.base);
    const box5 = sumWhere(c => c.country === 'Singapore' && c.direction === 'input');
    const box6 = sumWhere(c => c.code === 'SG-SR'); // output tax
    const box7 = sumWhere(c => c.code === 'SG-TX'); // claimable input tax
    const box8 = r2(box6.tax - box7.tax);

    const boxes: TaxBox[] = [
      { key: 'box1', label: 'Box 1 — Standard-rated supplies', amount: box1.base, contributing_tax_code_ids: box1.ids },
      { key: 'box2', label: 'Box 2 — Zero-rated supplies', amount: box2.base, contributing_tax_code_ids: box2.ids },
      { key: 'box3', label: 'Box 3 — Exempt supplies', amount: box3.base, contributing_tax_code_ids: box3.ids },
      { key: 'box4', label: 'Box 4 — Total supplies (1+2+3)', amount: box4Total, contributing_tax_code_ids: [...box1.ids, ...box2.ids, ...box3.ids], isComputed: true },
      { key: 'box5', label: 'Box 5 — Total taxable purchases', amount: box5.base, contributing_tax_code_ids: box5.ids },
      { key: 'box6', label: 'Box 6 — Output tax due', amount: box6.tax, contributing_tax_code_ids: box6.ids },
      { key: 'box7', label: 'Box 7 — Input tax & refunds claimed', amount: box7.tax, contributing_tax_code_ids: box7.ids },
      { key: 'box8', label: 'Box 8 — Net GST payable / (refund)', amount: box8, contributing_tax_code_ids: [...box6.ids, ...box7.ids], isComputed: true, isTotal: true },
      { key: 'box9', label: 'Box 9 — Total value of goods imported', amount: 0, contributing_tax_code_ids: [] },
    ];
    return { country: q.country, branchId: q.branchId, from: q.from, to: q.to, boxes, netPayable: box8 };
  }

  // Australia BAS GST labels
  const g1 = sumWhere(c => c.code === 'AU-GST');
  const g2 = sumWhere(c => c.code === 'AU-EXP');
  const g3 = sumWhere(c => c.code === 'AU-FRE');
  const g10 = sumWhere(c => c.code === 'AU-CAP');
  const g11 = sumWhere(c => c.code === 'AU-INP');
  const oneA = sumWhere(c => c.code === 'AU-GST');
  const oneB = sumWhere(c => c.code === 'AU-INP' || c.code === 'AU-CAP');
  const net = r2(oneA.tax - oneB.tax);

  const boxes: TaxBox[] = [
    { key: 'G1', label: 'G1 — Total sales', amount: r2(g1.base + g1.tax + g2.base + g3.base), contributing_tax_code_ids: [...g1.ids, ...g2.ids, ...g3.ids] },
    { key: 'G2', label: 'G2 — Export sales', amount: g2.base, contributing_tax_code_ids: g2.ids },
    { key: 'G3', label: 'G3 — Other GST-free sales', amount: g3.base, contributing_tax_code_ids: g3.ids },
    { key: 'G10', label: 'G10 — Capital purchases', amount: r2(g10.base + g10.tax), contributing_tax_code_ids: g10.ids },
    { key: 'G11', label: 'G11 — Non-capital purchases', amount: r2(g11.base + g11.tax), contributing_tax_code_ids: g11.ids },
    { key: '1A', label: '1A — GST on sales', amount: oneA.tax, contributing_tax_code_ids: oneA.ids, isTotal: true },
    { key: '1B', label: '1B — GST on purchases', amount: oneB.tax, contributing_tax_code_ids: oneB.ids, isTotal: true },
    { key: 'NET', label: 'Net GST payable / (refund)', amount: net, contributing_tax_code_ids: [...oneA.ids, ...oneB.ids], isComputed: true, isTotal: true },
  ];
  return { country: q.country, branchId: q.branchId, from: q.from, to: q.to, boxes, netPayable: net };
}

export async function listTaxReturns(branchId: string | null) {
  let q = supabase.from('tax_returns').select('*').order('period_from', { ascending: false });
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function lockTaxReturn(opts: {
  country: TaxCountry; branchId: string; from: string; to: string;
  totals: TaxReturnComputed; lockedBy: string;
}) {
  const payload: any = {
    country: opts.country,
    branch_id: opts.branchId,
    period_from: opts.from,
    period_to: opts.to,
    status: 'locked',
    totals: opts.totals as any,
    locked_at: new Date().toISOString(),
    locked_by: opts.lockedBy,
    created_by: opts.lockedBy,
  };
  const { data, error } = await supabase
    .from('tax_returns')
    .upsert(payload, { onConflict: 'branch_id,period_from,period_to' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unlockTaxReturn(id: string) {
  const { error } = await supabase
    .from('tax_returns')
    .update({ status: 'draft', locked_at: null, locked_by: null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTaxReturn(id: string) {
  const { error } = await supabase.from('tax_returns').delete().eq('id', id);
  if (error) throw error;
}

/** Period helpers */
export type TaxPeriodPreset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_fy' | 'custom';

export function taxPeriodFromPreset(preset: TaxPeriodPreset, fyStartMonth = 1): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case 'last_month': {
      return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
    }
    case 'this_quarter': {
      const qs = Math.floor(m / 3) * 3;
      return { from: fmt(new Date(y, qs, 1)), to: fmt(new Date(y, qs + 3, 0)) };
    }
    case 'last_quarter': {
      const qs = Math.floor(m / 3) * 3 - 3;
      const sy = qs < 0 ? y - 1 : y;
      const sm = ((qs % 12) + 12) % 12;
      return { from: fmt(new Date(sy, sm, 1)), to: fmt(new Date(sy, sm + 3, 0)) };
    }
    case 'this_fy': {
      const startMonth = fyStartMonth - 1;
      const startYear = m >= startMonth ? y : y - 1;
      return { from: fmt(new Date(startYear, startMonth, 1)), to: fmt(now) };
    }
    case 'custom':
    case 'this_month':
    default:
      return { from: fmt(new Date(y, m, 1)), to: fmt(now) };
  }
}
