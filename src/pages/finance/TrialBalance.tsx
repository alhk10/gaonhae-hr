import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useFinanceBasis } from '@/contexts/FinanceBasisContext';
import FinanceBasisToggle from '@/components/finance/FinanceBasisToggle';
import { getTrialBalance, type TrialBalanceResult } from '@/services/trialBalanceService';
import { exportTrialBalanceCsv, exportTrialBalancePdf } from '@/utils/financeReportExport';
import type { Country } from '@/services/accountingService';
import { formatDate } from '@/utils/dateFormat';
import { basisLabel } from '@/services/reportingBasisService';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TrialBalance: React.FC = () => {
  const { basis } = useFinanceBasis();
  const [country, setCountry] = useState<Country>('Singapore');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrialBalanceResult | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getTrialBalance({ country, from, to, basis });
      setResult(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [country, from, to, basis]);

  const grouped = useMemo(() => {
    if (!result) return [];
    const order: Array<TrialBalanceResult['rows'][number]['account_type']> = ['asset', 'liability', 'equity', 'income', 'expense'];
    return order.map(t => ({
      type: t,
      rows: result.rows.filter(r => r.account_type === t),
    })).filter(g => g.rows.length > 0);
  }, [result]);

  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Trial Balance</h1>
            <p className="text-sm text-muted-foreground">All accounts with debit/credit totals for the period.</p>
          </div>
          <FinanceBasisToggle />
        </div>

        <Card>
          <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Country</Label>
              <Select value={country} onValueChange={(v) => setCountry(v as Country)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" className="h-8" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" className="h-8" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" variant="outline" disabled={!result} onClick={() => result && exportTrialBalanceCsv({ country, from, to, basis: basisLabel(basis) }, result)}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button size="sm" variant="outline" disabled={!result} onClick={() => result && exportTrialBalancePdf({ country, from, to, basis: basisLabel(basis) }, result)}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              {formatDate(from)} – {formatDate(to)} · {country}
            </CardTitle>
            {result && (
              <Badge variant={result.is_balanced ? 'default' : 'destructive'}>
                {result.is_balanced ? 'Balanced' : 'Out of balance'}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : !result || result.rows.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No posted journal activity in this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-1 px-2">Code</th>
                      <th className="text-left py-1 px-2">Account</th>
                      <th className="text-right py-1 px-2">Debit</th>
                      <th className="text-right py-1 px-2">Credit</th>
                      <th className="text-right py-1 px-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(g => (
                      <React.Fragment key={g.type}>
                        <tr className="bg-muted/40">
                          <td colSpan={5} className="py-1 px-2 font-semibold uppercase text-[11px]">{g.type}</td>
                        </tr>
                        {g.rows.map(r => (
                          <tr key={r.account_id} className="border-b hover:bg-muted/30">
                            <td className="py-1 px-2 font-mono">{r.account_code}</td>
                            <td className="py-1 px-2">
                              <Link to={`/finance/general-ledger?account=${r.account_id}&from=${from}&to=${to}`} className="text-primary hover:underline">
                                {r.account_name}
                              </Link>
                            </td>
                            <td className="py-1 px-2 text-right tabular-nums">{r.debit ? fmt(r.debit) : '-'}</td>
                            <td className="py-1 px-2 text-right tabular-nums">{r.credit ? fmt(r.credit) : '-'}</td>
                            <td className="py-1 px-2 text-right tabular-nums">{fmt(r.net)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    <tr className="border-t-2 font-semibold">
                      <td colSpan={2} className="py-2 px-2">Totals</td>
                      <td className="py-2 px-2 text-right tabular-nums">{fmt(result.total_debit)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{fmt(result.total_credit)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{fmt(result.total_debit - result.total_credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default TrialBalance;
