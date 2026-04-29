import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  listAccounts, listJournalLines,
  type ChartAccount, type Country, type JournalEntry, type JournalLine,
} from '@/services/accountingService';
import { formatDate } from '@/utils/dateFormat';
import { toast } from 'sonner';

type LineWithEntry = JournalLine & { entry: JournalEntry };

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

const GeneralLedger: React.FC = () => {
  const [country, setCountry] = useState<Country>('Singapore');
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<LineWithEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listAccounts(country)
      .then(a => { setAccounts(a.filter(x => x.is_active)); setAccountId(prev => prev || a[0]?.id || ''); })
      .catch((e) => toast.error((e as Error).message));
  }, [country]);

  const load = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await listJournalLines({
        account_id: accountId, from, to, status: 'posted', limit: 1000,
      });
      setRows(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [accountId, from, to]);

  const totals = useMemo(() => {
    const d = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
    const c = rows.reduce((s, r) => s + Number(r.credit || 0), 0);
    return { debit: d, credit: c, net: d - c };
  }, [rows]);

  const account = accounts.find(a => a.id === accountId);

  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">General Ledger</h1>
          <p className="text-sm text-muted-foreground">Account drill-down across posted journals.</p>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Country</Label>
              <Select value={country} onValueChange={(v) => { setCountry(v as Country); setAccountId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {account ? `${account.code} — ${account.name}` : 'Account transactions'}
            </CardTitle>
            <Badge variant="outline" className="capitalize">{account?.type || ''}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Journal</th>
                    <th className="text-left p-2">Source</th>
                    <th className="text-left p-2">Branch</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Debit</th>
                    <th className="text-right p-2">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No posted lines for this account in range.</td></tr>
                  )}
                  {rows.map(r => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 whitespace-nowrap">{formatDate(r.entry.entry_date)}</td>
                      <td className="p-2 font-mono text-xs">
                        <Link to={`/finance/journals/${r.journal_id}`} className="underline">
                          {r.entry.entry_number || r.journal_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="p-2 capitalize">{r.entry.source_type}</td>
                      <td className="p-2 text-xs">{r.branch_id || r.entry.branch_id || '—'}</td>
                      <td className="p-2 max-w-[280px] truncate">{r.description || r.entry.narration || '—'}</td>
                      <td className="p-2 text-right">{Number(r.debit || 0) ? Number(r.debit).toFixed(2) : ''}</td>
                      <td className="p-2 text-right">{Number(r.credit || 0) ? Number(r.credit).toFixed(2) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 font-medium">
                  <tr className="border-t">
                    <td colSpan={5} className="p-2 text-right">Totals</td>
                    <td className="p-2 text-right">{totals.debit.toFixed(2)}</td>
                    <td className="p-2 text-right">{totals.credit.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="p-2 text-right">Net (Dr − Cr)</td>
                    <td colSpan={2} className={`p-2 text-right ${totals.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {totals.net.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm"><Link to="/finance">Back to Finance</Link></Button>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default GeneralLedger;
