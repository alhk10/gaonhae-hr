import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Activity, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getBranchPnl, periodFromPreset, shiftPriorPeriod, subscribePnlChanges,
  type PnlResult, type PnlRow, type PnlPeriodPreset,
} from '@/services/branchPnlLiveService';
import { exportPnlCsv, exportPnlPdf } from '@/utils/pnlExport';
import { formatDate } from '@/utils/dateFormat';
import PnlAccountDrilldownDialog from '@/components/finance/PnlAccountDrilldownDialog';

interface Branch { id: string; name: string; country: string }

const fmtAmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BranchPnlLive: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>('all');
  const [preset, setPreset] = useState<PnlPeriodPreset>('this_month');
  const initial = periodFromPreset('this_month');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [compare, setCompare] = useState<'none' | 'prior_period' | 'prior_year'>('prior_period');

  const [current, setCurrent] = useState<PnlResult | null>(null);
  const [prior, setPrior] = useState<PnlResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [drill, setDrill] = useState<{ accountId: string; code: string; name: string; amount: number } | null>(null);

  useEffect(() => {
    supabase.from('branches').select('id, name, country').order('name')
      .then(({ data }) => setBranches((data || []) as Branch[]));
  }, []);

  useEffect(() => {
    if (preset === 'custom') return;
    const p = periodFromPreset(preset);
    setFrom(p.from); setTo(p.to);
  }, [preset]);

  const load = async () => {
    setLoading(true);
    try {
      const branchArg = branchId === 'all' ? null : branchId;
      const cur = await getBranchPnl({ branchId: branchArg, from, to });
      setCurrent(cur);
      if (compare !== 'none') {
        const range = shiftPriorPeriod(from, to, compare);
        const p = await getBranchPnl({ branchId: branchArg, from: range.from, to: range.to });
        setPrior(p);
      } else {
        setPrior(null);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load P&L');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [branchId, from, to, compare, liveTick]);

  // Realtime
  useEffect(() => {
    const unsub = subscribePnlChanges(() => setLiveTick((t) => t + 1));
    return unsub;
  }, []);

  const branchName = branchId === 'all' ? 'All branches' : (branches.find(b => b.id === branchId)?.name || branchId);

  const renderRow = (r: PnlRow, section: 'income' | 'cogs' | 'expenses') => {
    const p = prior ? prior[section].find(x => x.account_id === r.account_id) : null;
    return (
      <tr key={r.account_id} className="border-b last:border-0 hover:bg-muted/30">
        <td className="py-1.5 pl-6 pr-2">
          <Link to={`/finance/general-ledger?account=${r.account_id}&from=${from}&to=${to}`}
                className="text-xs hover:underline">
            <span className="text-muted-foreground mr-1.5">{r.account_code}</span>
            {r.account_name}
          </Link>
        </td>
        <td className="py-1.5 px-2 text-right text-xs tabular-nums">
          <button
            type="button"
            className="hover:underline hover:text-primary"
            onClick={() => setDrill({ accountId: r.account_id, code: r.account_code, name: r.account_name, amount: r.amount })}
          >
            {fmtAmt(r.amount)}
          </button>
        </td>
        {prior && <td className="py-1.5 px-2 text-right text-xs tabular-nums text-muted-foreground">{p ? fmtAmt(p.amount) : '—'}</td>}
      </tr>
    );
  };

  const sectionHeader = (label: string) => (
    <tr className="bg-muted/40">
      <td colSpan={prior ? 3 : 2} className="py-1.5 px-2 text-[11px] font-bold uppercase tracking-wide">
        {label}
      </td>
    </tr>
  );
  const totalRow = (label: string, val: number, priorVal: number | undefined, highlight = false) => (
    <tr className={`border-t font-semibold ${highlight ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}`}>
      <td className="py-1.5 pl-6 pr-2 text-xs">{label}</td>
      <td className="py-1.5 px-2 text-right text-xs tabular-nums">{fmtAmt(val)}</td>
      {prior && <td className="py-1.5 px-2 text-right text-xs tabular-nums text-muted-foreground">{priorVal !== undefined ? fmtAmt(priorVal) : '—'}</td>}
    </tr>
  );

  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Branch P&L (Live)
              <Badge variant="secondary" className="gap-1 text-[10px]"><Activity className="h-3 w-3" /> Realtime</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Built directly from posted journals — updates as new transactions are booked.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!current} onClick={() => current && exportPnlCsv({ current, prior, branchName, from, to })}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" disabled={!current} onClick={() => current && exportPnlPdf({ current, prior, branchName, from, to })}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Period</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as PnlPeriodPreset)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="last_month">Last month</SelectItem>
                  <SelectItem value="this_quarter">This quarter</SelectItem>
                  <SelectItem value="last_quarter">Last quarter</SelectItem>
                  <SelectItem value="q1">Q1 (Jan – Mar)</SelectItem>
                  <SelectItem value="q2">Q2 (Apr – Jun)</SelectItem>
                  <SelectItem value="q3">Q3 (Jul – Sep)</SelectItem>
                  <SelectItem value="q4">Q4 (Oct – Dec)</SelectItem>
                  <SelectItem value="this_fy">This FY</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" className="h-9" value={from} onChange={(e) => { setPreset('custom'); setFrom(e.target.value); }} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" className="h-9" value={to} onChange={(e) => { setPreset('custom'); setTo(e.target.value); }} />
            </div>
            <div>
              <Label className="text-xs">Compare to</Label>
              <Select value={compare} onValueChange={(v) => setCompare(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="prior_period">Prior period</SelectItem>
                  <SelectItem value="prior_year">Prior year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {branchName} · {formatDate(from)} – {formatDate(to)}
            </CardTitle>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            {!current ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pl-6 pr-2 text-left font-medium">Account</th>
                      <th className="py-2 px-2 text-right font-medium">This period</th>
                      {prior && <th className="py-2 px-2 text-right font-medium">Prior</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionHeader('Income')}
                    {current.income.length === 0 && (
                      <tr><td colSpan={prior ? 3 : 2} className="py-2 pl-6 text-xs text-muted-foreground">No income posted.</td></tr>
                    )}
                    {current.income.map(r => renderRow(r, 'income'))}
                    {totalRow('Total Income', current.totals.income, prior?.totals.income)}

                    {current.cogs.length > 0 && (
                      <>
                        {sectionHeader('Cost of Sales')}
                        {current.cogs.map(r => renderRow(r, 'cogs'))}
                      </>
                    )}
                    {totalRow('Gross Profit', current.totals.grossProfit, prior?.totals.grossProfit)}

                    {sectionHeader('Expenses')}
                    {current.expenses.length === 0 && (
                      <tr><td colSpan={prior ? 3 : 2} className="py-2 pl-6 text-xs text-muted-foreground">No expenses posted.</td></tr>
                    )}
                    {current.expenses.map(r => renderRow(r, 'expenses'))}
                    {totalRow('Total Expenses', current.totals.expenses, prior?.totals.expenses)}

                    {totalRow('Net Profit', current.totals.netProfit, prior?.totals.netProfit, true)}
                    <tr className="text-[11px] text-muted-foreground">
                      <td className="py-1 pl-6 pr-2">Margin</td>
                      <td className="py-1 px-2 text-right tabular-nums">{current.totals.margin.toFixed(1)}%</td>
                      {prior && <td className="py-1 px-2 text-right tabular-nums">{prior.totals.margin.toFixed(1)}%</td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground">
          Sourced from posted journals (Phase 4). The legacy Branch P&L page remains available until reconciliation in Phase 10.
        </p>

        <PnlAccountDrilldownDialog
          open={!!drill}
          onClose={() => setDrill(null)}
          accountId={drill?.accountId || null}
          accountCode={drill?.code}
          accountName={drill?.name}
          branchId={branchId === 'all' ? null : branchId}
          from={from}
          to={to}
          expectedTotal={drill?.amount}
        />
      </div>
    </ResponsiveLayout>
  );
};

export default BranchPnlLive;
