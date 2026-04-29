import React, { useEffect, useState } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useFinanceBasis } from '@/contexts/FinanceBasisContext';
import FinanceBasisToggle from '@/components/finance/FinanceBasisToggle';
import { getBalanceSheet, type BalanceSheetResult, type BalanceSheetSection } from '@/services/balanceSheetService';
import { exportBalanceSheetCsv, exportBalanceSheetPdf } from '@/utils/financeReportExport';
import type { Country } from '@/services/accountingService';
import { formatDate } from '@/utils/dateFormat';
import { basisLabel } from '@/services/reportingBasisService';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SectionTable: React.FC<{ section: BalanceSheetSection }> = ({ section }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">{section.label}</CardTitle></CardHeader>
    <CardContent>
      {section.rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">No balances.</div>
      ) : (
        <table className="w-full text-xs">
          <tbody>
            {section.rows.map(r => (
              <tr key={r.account_id} className="border-b">
                <td className="py-1 pr-2 font-mono text-muted-foreground">{r.account_code}</td>
                <td className="py-1 px-2">{r.account_name}</td>
                <td className="py-1 pl-2 text-right tabular-nums">{fmt(r.balance)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td colSpan={2} className="py-2">Total {section.label}</td>
              <td className="py-2 text-right tabular-nums">{fmt(section.total)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </CardContent>
  </Card>
);

const BalanceSheet: React.FC = () => {
  const { basis } = useFinanceBasis();
  const [country, setCountry] = useState<Country>('Singapore');
  const [asOf, setAsOf] = useState(today());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BalanceSheetResult | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getBalanceSheet({ country, as_of: asOf, basis });
      setResult(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [country, asOf, basis]);

  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Balance Sheet</h1>
            <p className="text-sm text-muted-foreground">Assets, liabilities and equity as of a selected date.</p>
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
              <Label className="text-xs">As of</Label>
              <Input type="date" className="h-8" value={asOf} onChange={e => setAsOf(e.target.value)} />
            </div>
            <div className="flex items-end gap-2 col-span-2">
              <Button size="sm" variant="outline" disabled={!result} onClick={() => result && exportBalanceSheetCsv({ country, basis: basisLabel(basis) }, result)}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button size="sm" variant="outline" disabled={!result} onClick={() => result && exportBalanceSheetPdf({ country, basis: basisLabel(basis) }, result)}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">As of {formatDate(asOf)} · {country} · {basisLabel(basis)}</div>
          {result && (
            <Badge variant={result.is_balanced ? 'default' : 'destructive'}>
              {result.is_balanced ? 'A = L + E' : 'Out of balance'}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : result ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <SectionTable section={result.assets} />
            <div className="space-y-3">
              <SectionTable section={result.liabilities} />
              <SectionTable section={result.equity} />
            </div>
            <Card className="lg:col-span-2">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Assets</div>
                    <div className="font-semibold tabular-nums">{fmt(result.total_assets)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Liabilities + Equity</div>
                    <div className="font-semibold tabular-nums">{fmt(result.total_liab_equity)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Difference</div>
                    <div className={`font-semibold tabular-nums ${result.is_balanced ? '' : 'text-destructive'}`}>
                      {fmt(result.total_assets - result.total_liab_equity)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </ResponsiveLayout>
  );
};

export default BalanceSheet;
