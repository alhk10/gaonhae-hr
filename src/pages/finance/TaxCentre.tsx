import React, { useEffect, useMemo, useState } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Lock, Unlock, Loader2, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTaxReturn, listTaxReturns, lockTaxReturn, unlockTaxReturn,
  taxPeriodFromPreset, type TaxReturnComputed, type TaxPeriodPreset, type TaxCountry,
} from '@/services/taxService';
import { exportTaxCsv, exportTaxPdf } from '@/utils/taxExport';
import { formatDate } from '@/utils/dateFormat';

interface Branch { id: string; name: string; country: string }

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TaxCentre: React.FC = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [preset, setPreset] = useState<TaxPeriodPreset>('this_quarter');
  const initial = taxPeriodFromPreset('this_quarter');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [computed, setComputed] = useState<TaxReturnComputed | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('branches').select('id, name, country').order('name')
      .then(({ data }) => {
        const list = (data || []) as Branch[];
        setBranches(list);
        if (list.length && !branchId) setBranchId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (preset === 'custom') return;
    const p = taxPeriodFromPreset(preset);
    setFrom(p.from); setTo(p.to);
  }, [preset]);

  const branch = useMemo(() => branches.find(b => b.id === branchId), [branches, branchId]);
  const country: TaxCountry | null = useMemo(() => {
    if (!branch) return null;
    const c = (branch.country || '').toLowerCase();
    if (c.startsWith('au')) return 'Australia';
    return 'Singapore';
  }, [branch]);

  const load = async () => {
    if (!branchId || !country) return;
    setLoading(true);
    try {
      const r = await getTaxReturn({ branchId, country, from, to });
      setComputed(r);
    } catch (e: any) {
      toast.error(e.message || 'Failed to compute tax return');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!branchId) return;
    try {
      const h = await listTaxReturns(branchId);
      setHistory(h);
    } catch { /* noop */ }
  };

  useEffect(() => { load(); loadHistory(); /* eslint-disable-next-line */ }, [branchId, from, to]);

  const handleLock = async () => {
    if (!computed || !branchId || !country) return;
    try {
      await lockTaxReturn({
        country, branchId, from, to,
        totals: computed,
        lockedBy: user?.email || 'system',
      });
      toast.success('Tax return locked');
      loadHistory();
    } catch (e: any) {
      toast.error(e.message || 'Failed to lock');
    }
  };

  const handleUnlock = async (id: string) => {
    try {
      await unlockTaxReturn(id);
      toast.success('Unlocked');
      loadHistory();
    } catch (e: any) {
      toast.error(e.message || 'Failed to unlock');
    }
  };

  const branchName = branch?.name || branchId || '—';
  const lockedExisting = history.find(h =>
    h.branch_id === branchId && h.period_from === from && h.period_to === to && h.status === 'locked',
  );

  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" /> Tax Centre
              {country && <Badge variant="secondary" className="text-[10px]">{country === 'Singapore' ? 'GST F5' : 'BAS'}</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">
              Country-aware indirect tax reports built directly from posted journals.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!computed} onClick={() => computed && exportTaxCsv({ ret: computed, branchName })}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" disabled={!computed} onClick={() => computed && exportTaxPdf({ ret: computed, branchName })}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
            {lockedExisting ? (
              <Button size="sm" variant="outline" onClick={() => handleUnlock(lockedExisting.id)}>
                <Unlock className="h-4 w-4 mr-1" /> Unlock
              </Button>
            ) : (
              <Button size="sm" onClick={handleLock} disabled={!computed}>
                <Lock className="h-4 w-4 mr-1" /> Lock period
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Period</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as TaxPeriodPreset)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="last_month">Last month</SelectItem>
                  <SelectItem value="this_quarter">This quarter</SelectItem>
                  <SelectItem value="last_quarter">Last quarter</SelectItem>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {branchName} · {formatDate(from)} – {formatDate(to)}
              {lockedExisting && <Badge className="ml-2 text-[10px]" variant="secondary"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
            </CardTitle>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            {!computed ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No data — pick a branch.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pl-3 pr-2 text-left font-medium w-16">Box</th>
                      <th className="py-2 px-2 text-left font-medium">Description</th>
                      <th className="py-2 px-2 text-right font-medium w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.boxes.map(b => (
                      <tr key={b.key} className={`border-b last:border-0 hover:bg-muted/30 ${b.isTotal ? 'font-semibold bg-muted/30' : ''}`}>
                        <td className="py-2 pl-3 pr-2 text-xs tabular-nums">{b.key}</td>
                        <td className="py-2 px-2 text-xs">{b.label.replace(/^[^—]+— /, '')}</td>
                        <td className="py-2 px-2 text-right text-xs tabular-nums">{fmt(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Return history</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pl-3 pr-2 text-left font-medium">Period</th>
                      <th className="py-2 px-2 text-left font-medium">Country</th>
                      <th className="py-2 px-2 text-left font-medium">Status</th>
                      <th className="py-2 px-2 text-right font-medium">Net</th>
                      <th className="py-2 px-2 text-left font-medium">Locked at</th>
                      <th className="py-2 px-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="py-2 pl-3 pr-2 text-xs">{formatDate(h.period_from)} – {formatDate(h.period_to)}</td>
                        <td className="py-2 px-2 text-xs">{h.country}</td>
                        <td className="py-2 px-2 text-xs">
                          <Badge variant={h.status === 'locked' ? 'secondary' : 'outline'} className="text-[10px]">{h.status}</Badge>
                        </td>
                        <td className="py-2 px-2 text-xs text-right tabular-nums">
                          {h.totals?.netPayable != null ? fmt(Number(h.totals.netPayable)) : '—'}
                        </td>
                        <td className="py-2 px-2 text-xs">{h.locked_at ? formatDate(h.locked_at.slice(0, 10)) : '—'}</td>
                        <td className="py-2 px-2 text-xs text-right">
                          {h.status === 'locked' && (
                            <Button size="sm" variant="ghost" onClick={() => handleUnlock(h.id)}>
                              <Unlock className="h-3 w-3 mr-1" /> Unlock
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground">
          Auto-posting (Phase 3) tags supplies/purchases with tax codes; this report aggregates them. Locking snapshots the totals so future journal edits do not change a filed return.
        </p>
      </div>
    </ResponsiveLayout>
  );
};

export default TaxCentre;
