const r2 = (n: number) => Math.round(n * 100) / 100;

/** Casual net pay: slot pay + claims − employee CPF. */
export const casualNet = (slotPay: number, claims: number, employeeCPF: number) =>
  r2((slotPay || 0) + (claims || 0) - (employeeCPF || 0));

/** Month totals shared by every payroll step. */
export const payrollTotals = (rows: { gross: number; cpf: number; claims: number; net: number }[]) => ({
  gross: r2(rows.reduce((s, r) => s + r.gross, 0)),
  cpf: r2(rows.reduce((s, r) => s + r.cpf, 0)),
  claims: r2(rows.reduce((s, r) => s + r.claims, 0)),
  net: r2(rows.reduce((s, r) => s + r.net, 0)),
});

/** Recalculation merges fresh defaults with saved monthly overrides; overrides always win. */
export const mergeMonthOverride = <T extends Record<string, any>>(fresh: T, override?: Partial<T> | null): T => {
  if (!override) return fresh;
  const out: any = { ...fresh };
  for (const [k, v] of Object.entries(override)) if (v !== null && v !== undefined) out[k] = v;
  return out;
};
