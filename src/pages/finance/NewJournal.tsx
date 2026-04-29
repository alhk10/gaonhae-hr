import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Send } from 'lucide-react';
import {
  listAccounts, createJournal,
  type ChartAccount, type Country, type JournalLineDraft,
} from '@/services/accountingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BranchOption { id: string; name: string; country: string | null; }

interface LineRow extends JournalLineDraft {
  _key: string;
}

const newRow = (): LineRow => ({ _key: crypto.randomUUID(), account_id: '', debit: 0, credit: 0, description: '' });

const NewJournal: React.FC = () => {
  const navigate = useNavigate();
  const [country, setCountry] = useState<Country>('Singapore');
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState<string>('');
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<LineRow[]>([newRow(), newRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [accs, br] = await Promise.all([
        listAccounts(country),
        supabase.from('branches').select('id,name,country').order('name'),
      ]);
      setAccounts(accs.filter(a => a.is_active));
      setBranches(((br.data || []) as BranchOption[]));
    })().catch((e) => toast.error(`Failed to load: ${(e as Error).message}`));
  }, [country]);

  const branchOptions = useMemo(
    () => branches.filter(b => !b.country || b.country === country),
    [branches, country],
  );

  const totals = useMemo(() => {
    const d = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const c = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    return { debit: d, credit: c, diff: Math.round((d - c) * 100) / 100 };
  }, [lines]);

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    setLines(prev => prev.map(l => l._key === key ? { ...l, ...patch } : l));
  };

  const submit = async (post: boolean) => {
    if (!entryDate) { toast.error('Pick an entry date'); return; }
    const cleaned = lines.filter(l => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (cleaned.length < 2) { toast.error('Add at least two lines (one debit, one credit)'); return; }
    if (totals.diff !== 0) { toast.error(`Journal not balanced (Dr ${totals.debit.toFixed(2)} vs Cr ${totals.credit.toFixed(2)})`); return; }
    setSaving(true);
    try {
      const created = await createJournal({
        entry_date: entryDate,
        country,
        branch_id: branchId || null,
        narration: narration || null,
        reference: reference || null,
        lines: cleaned.map(({ _key, ...rest }) => rest),
        post,
      });
      toast.success(post ? 'Journal posted' : 'Journal saved as draft');
      navigate(`/finance/journals/${created.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">New Journal Entry</h1>
            <p className="text-sm text-muted-foreground">Manual double-entry posting.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/finance/journals')}>Cancel</Button>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Header</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Country</Label>
              <Select value={country} onValueChange={(v) => setCountry(v as Country)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={branchId || 'none'} onValueChange={(v) => setBranchId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {branchOptions.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="optional" />
            </div>
            <div className="sm:col-span-4">
              <Label className="text-xs">Narration</Label>
              <Textarea rows={2} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="What is this journal for?" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Lines</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLines(p => [...p, newRow()])}>
              <Plus className="h-4 w-4 mr-1" />Add line
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2 w-[28%]">Account</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2 w-[110px]">Debit</th>
                    <th className="text-right p-2 w-[110px]">Credit</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => (
                    <tr key={l._key} className="border-t">
                      <td className="p-1">
                        <Select value={l.account_id || ''} onValueChange={(v) => updateLine(l._key, { account_id: v })}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Select account" /></SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.code} — {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-1">
                        <Input className="h-8" value={l.description || ''} onChange={(e) => updateLine(l._key, { description: e.target.value })} />
                      </td>
                      <td className="p-1">
                        <Input className="h-8 text-right" type="number" step="0.01" min="0"
                               value={l.debit ?? 0}
                               onChange={(e) => updateLine(l._key, { debit: parseFloat(e.target.value) || 0, credit: 0 })} />
                      </td>
                      <td className="p-1">
                        <Input className="h-8 text-right" type="number" step="0.01" min="0"
                               value={l.credit ?? 0}
                               onChange={(e) => updateLine(l._key, { credit: parseFloat(e.target.value) || 0, debit: 0 })} />
                      </td>
                      <td className="p-1 text-center">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => setLines(p => p.filter(x => x._key !== l._key))}
                                disabled={lines.length <= 2}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr className="border-t font-medium">
                    <td colSpan={2} className="p-2 text-right">Totals</td>
                    <td className="p-2 text-right">{totals.debit.toFixed(2)}</td>
                    <td className="p-2 text-right">{totals.credit.toFixed(2)}</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={5} className={`p-2 text-right text-xs ${totals.diff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {totals.diff === 0 ? 'Balanced' : `Out of balance by ${totals.diff.toFixed(2)}`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => submit(false)} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />Save draft
          </Button>
          <Button onClick={() => submit(true)} disabled={saving || totals.diff !== 0}>
            <Send className="h-4 w-4 mr-1" />Save & Post
          </Button>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default NewJournal;
