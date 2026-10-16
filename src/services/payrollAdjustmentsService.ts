/**
 * Loads everything payroll needs from leave for a month, in a few parallel
 * queries: unpaid leave, excess annual leave, encashment, leave balance and
 * the month's manual overrides.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  periodBounds, leaveDaysInPeriod, excessAnnualLeaveDays, proRateSalary, unpaidLeaveDeduction,
} from '@/utils/payrollProration';

export interface MonthAdjustment {
  annualTakenMonth: number;
  annualTakenYear: number;
  annualEntitlement: number | null;
  annualBalance: number | null;
  otherLeaveMonth: number;
  unpaidLeaveDays: number;      // explicit unpaid leave
  excessAnnualDays: number;     // annual leave over entitlement
  totalUnpaidDays: number;      // effective (after override)
  unpaidOverridden: boolean;
  encashment: number;
  encashmentOverridden: boolean;
  salaryOverridden: boolean;
}

export type MonthAdjustments = Record<string, MonthAdjustment>;

const isAnnual = (t: string) => /annual/i.test(t || '');
const isUnpaid = (t: string) => /unpaid/i.test(t || '');

export const loadMonthAdjustments = async (
  period: string,
  employees: Array<{ id: string; type?: string }>,
): Promise<MonthAdjustments> => {
  const ids = employees.map((e) => e.id);
  if (!ids.length) return {};
  const { year, start, end } = periodBounds(period);
  const monthKey = `${year}-${start.slice(5, 7)}`;
  const fullTimeIds = employees.filter((e) => e.type === 'Full-Time').map((e) => e.id);

  const [leaveRes, encRes, ovRes, ...entRes] = await Promise.all([
    supabase.from('leave_requests')
      .select('employee_id, type, start_date, end_date, days_requested, status')
      .in('employee_id', ids).eq('status', 'Approved')
      .lte('start_date', end).gte('end_date', `${year}-01-01`),
    supabase.from('leave_encashment_records')
      .select('employee_id, total_encashment_amount, payroll_month, payroll_year, status')
      .in('employee_id', ids).eq('payroll_year', year),
    supabase.from('payroll_monthly_overrides')
      .select('employee_id, base_salary, unpaid_leave_days_override, encashment_override')
      .in('employee_id', ids).eq('year', year).eq('month', monthKey),
    ...fullTimeIds.map((id) => supabase.rpc('calculate_annual_leave_entitlement', { employee_id: id, reference_year: year })),
  ]);

  const entitlement: Record<string, number> = {};
  fullTimeIds.forEach((id, i) => {
    const row = (entRes[i] as any)?.data?.[0];
    if (row) entitlement[id] = Number(row.final_annual_leave ?? row.total_annual_leave ?? 0);
  });

  const overrides: Record<string, any> = {};
  (ovRes.data || []).forEach((o: any) => { overrides[o.employee_id] = o; });

  const out: MonthAdjustments = {};
  for (const id of ids) {
    const reqs = (leaveRes.data || []).filter((r: any) => r.employee_id === id);
    let annualMonth = 0, annualBefore = 0, unpaid = 0, other = 0;
    for (const r of reqs as any[]) {
      const inMonth = leaveDaysInPeriod(r, period);
      if (isAnnual(r.type)) {
        annualMonth += inMonth;
        // days of this year before the month
        if (r.start_date < start) {
          const before = leaveDaysInPeriod({ ...r, end_date: r.end_date }, `${year}-01`) * 0; // placeholder, computed below
          void before;
        }
      } else if (isUnpaid(r.type)) unpaid += inMonth;
      else other += inMonth;
    }
    // Annual leave taken this year before the month starts
    for (const r of reqs as any[]) {
      if (!isAnnual(r.type) || r.start_date >= start) continue;
      const total = Math.max(1, (Date.parse(r.end_date) - Date.parse(r.start_date)) / 86400000 + 1);
      const s = Math.max(Date.parse(r.start_date), Date.parse(`${year}-01-01`));
      const e = Math.min(Date.parse(r.end_date), Date.parse(start) - 86400000);
      if (e >= s) annualBefore += (Number(r.days_requested) || 0) * ((e - s) / 86400000 + 1) / total;
    }
    annualBefore = Math.round(annualBefore * 2) / 2;
    const ent = id in entitlement ? entitlement[id] : null;
    const excess = ent == null ? 0 : excessAnnualLeaveDays(ent, annualBefore, annualMonth);
    const ov = overrides[id];
    const unpaidOverridden = ov?.unpaid_leave_days_override != null;
    const enc = (encRes.data || [])
      .filter((x: any) => x.employee_id === id && String(x.payroll_month || '').padStart(2, '0').slice(-2) === start.slice(5, 7) && x.status !== 'cancelled')
      .reduce((s: number, x: any) => s + Number(x.total_encashment_amount || 0), 0);
    out[id] = {
      annualTakenMonth: annualMonth,
      annualTakenYear: annualBefore + annualMonth,
      annualEntitlement: ent,
      annualBalance: ent == null ? null : Math.max(0, ent - annualBefore - annualMonth),
      otherLeaveMonth: other,
      unpaidLeaveDays: unpaid,
      excessAnnualDays: excess,
      totalUnpaidDays: unpaidOverridden ? Number(ov.unpaid_leave_days_override) : unpaid + excess,
      unpaidOverridden,
      encashment: ov?.encashment_override != null ? Number(ov.encashment_override) : enc,
      encashmentOverridden: ov?.encashment_override != null,
      salaryOverridden: ov?.base_salary != null,
    };
  }
  return out;
};

/** Build the employee used for calculation: pro-rated base minus unpaid leave. */
export const applyMonthAdjustment = <T extends { baseSalary?: number; joinDate?: string | null; resignDate?: string | null; type?: string }>(
  emp: T,
  adj: MonthAdjustment | undefined,
  period: string,
) => {
  const base = Number(emp.baseSalary || 0);
  if (emp.type !== 'Full-Time') return { employee: emp, encashment: 0, proRate: null as null | ReturnType<typeof proRateSalary>, unpaidDeduction: 0, contractBase: base };
  const pr = adj?.salaryOverridden ? null : proRateSalary(base, emp.joinDate, emp.resignDate, period);
  const proBase = pr ? pr.amount : base;
  const unpaidDeduction = unpaidLeaveDeduction(base, adj?.totalUnpaidDays || 0, period);
  return {
    employee: { ...emp, baseSalary: Math.max(0, Math.round((proBase - unpaidDeduction) * 100) / 100) },
    encashment: adj?.encashment || 0,
    proRate: pr && pr.isProRated ? pr : null,
    unpaidDeduction,
    contractBase: base,
  };
};

export const saveLeaveOverride = async (
  employeeId: string, period: string,
  updates: { unpaid_leave_days_override?: number | null; encashment_override?: number | null },
) => {
  const { year, start } = periodBounds(period);
  const month = `${year}-${start.slice(5, 7)}`;
  const { data: existing } = await supabase.from('payroll_monthly_overrides')
    .select('id').eq('employee_id', employeeId).eq('year', year).eq('month', month).maybeSingle();
  const res = existing
    ? await supabase.from('payroll_monthly_overrides').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', existing.id)
    : await supabase.from('payroll_monthly_overrides').insert({ employee_id: employeeId, year, month, ...updates } as any);
  if (res.error) throw res.error;
};
