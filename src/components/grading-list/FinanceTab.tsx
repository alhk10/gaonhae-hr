import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Download, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { openSignedUrl } from '@/components/common/SignedMedia';
import { formatBranchCurrency } from '@/utils/branchCurrency';
import { formatDate, toISODate } from '@/utils/dateFormat';
import DateField from '@/components/attendance/DateField';
import { withRunningBalance, JournalRow, JournalLine } from '@/utils/branchJournal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const rpc = ((fn: string, args?: any) => (supabase.rpc as any).call(supabase, fn, args)) as any;
const accessPw = () => { try { return sessionStorage.getItem('access_pw_v1') || ''; } catch { return ''; } };

const CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Supplies', 'Inventory', 'Marketing', 'Equipment', 'Transport', 'Other expense', 'Other income'];

interface Props { branches: { id: string; name: string }[] }

const monthStart = () => { const d = new Date(); return toISODate(new Date(d.getFullYear(), d.getMonth(), 1)); };
const monthEnd = () => { const d = new Date(); return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };

interface Draft { id?: string; entry_date: string; direction: 'in' | 'out'; category: string; description: string; amount: string; remark: string; file: File | null }
const emptyDraft = (): Draft => ({ entry_date: toISODate(new Date()), direction: 'out', category: 'Other expense', description: '', amount: '', remark: '', file: null });

const FinanceTab: React.FC<Props> = ({ branches }) => {
  const qc = useQueryClient();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());
  const [draft, setDraft] = useState<Draft | null>(null);
  const branchName = branches.find((b) => b.id === branchId)?.name ?? '';
  const money = (n: number) => formatBranchCurrency(n, branchId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['branch-journal', branchId, from, to],
    enabled: !!branchId && !!from && !!to,
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('access_branch_journal', { p_password: accessPw(), p_branch_id: branchId, p_from: from, p_to: to });
      if (error) throw error;
      return data as { opening_balance: number; rows: JournalRow[] };
    },
  });
  const j = useMemo(() => withRunningBalance(data?.opening_balance ?? 0, data?.rows ?? []), [data]);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const amt = Number(d.amount);
      if (!(amt > 0)) throw new Error('Enter an amount above zero');
      if (!d.description.trim()) throw new Error('Enter a description');
      let receipt: string | null = null;
      if (d.file) {
        if (!d.file.type.startsWith('image/')) throw new Error('Receipt must be an image (PDF not accepted)');
        const ext = (d.file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `branch-journal/${branchId}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const up = await supabase.storage.from('payment-proofs').upload(path, d.file, { upsert: false, contentType: d.file.type });
        if (up.error) throw new Error('Could not upload the receipt, please try again.');
        receipt = `payment-proofs/${path}`;
      }
      const { error } = await rpc('access_branch_journal_upsert', { p_password: accessPw(), p_entry: {
        id: d.id ?? null, branch_id: branchId, entry_date: d.entry_date, direction: d.direction, category: d.category,
        description: d.description.trim(), amount: amt, remark: d.remark.trim(), receipt_path: receipt,
      } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Saved'); setDraft(null); qc.invalidateQueries({ queryKey: ['branch-journal'] }); },
    onError: (e: any) => toast.error(e?.message || 'Could not save'),
  });

  const remove = async (l: JournalLine) => {
    if (!window.confirm(`Delete "${l.description}"?`)) return;
    const { error } = await rpc('access_branch_journal_delete', { p_password: accessPw(), p_id: l.id });
    if (error) return toast.error(error.message);
    toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['branch-journal'] });
  };

  const exportRows = () => [
    ['', '', 'Opening balance', '', '', '', j.opening.toFixed(2), ''],
    ...j.lines.map((l) => [formatDate(l.date), l.kind === 'auto' ? 'Auto' : 'Manual', `${l.category ? l.category + ' — ' : ''}${l.description}`, l.reference ?? '',
      l.direction === 'in' ? l.amount.toFixed(2) : '', l.direction === 'out' ? l.amount.toFixed(2) : '', l.balance.toFixed(2), l.remark ?? '']),
  ];
  const head = ['Date', 'Type', 'Description', 'Reference', 'In', 'Out', 'Balance', 'Remark'];
  const fileBase = `journal-${branchName.replace(/\s+/g, '-')}-${from}-${to}`;
  const exportCsv = () => {
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [head, ...exportRows()].map((r) => r.map(esc).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${fileBase}.csv`; a.click();
  };
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12); doc.text(`${branchName} running journal  ${formatDate(from)} – ${formatDate(to)}`, 14, 14);
    autoTable(doc, { startY: 20, head: [head], body: exportRows(), styles: { fontSize: 7 },
      foot: [['', '', 'Totals', '', j.totalIn.toFixed(2), j.totalOut.toFixed(2), j.closing.toFixed(2), '']] });
    doc.save(`${fileBase}.pdf`);
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3 flex flex-wrap items-end gap-2">
        <div className="space-y-1"><Label className="text-xs">Branch</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1"><Label className="text-xs">From</Label><DateField value={from} onChange={setFrom} /></div>
        <div className="space-y-1"><Label className="text-xs">To</Label><DateField value={to} onChange={setTo} /></div>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!j.lines.length}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={!data}><Download className="h-3.5 w-3.5 mr-1" />PDF</Button>
          <Button size="sm" onClick={() => setDraft(emptyDraft())} disabled={!branchId}><Plus className="h-3.5 w-3.5 mr-1" />Add entry</Button>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[['Opening', j.opening], ['Money in', j.totalIn], ['Money out', j.totalOut], ['Net', j.net], ['Closing', j.closing]].map(([k, v]) => (
          <Card key={k as string}><CardContent className="p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="font-semibold">{money(v as number)}</div></CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        {error ? <p className="p-4 text-sm text-destructive">{(error as any).message}</p> : isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Reference</TableHead>
              <TableHead className="text-right">In</TableHead><TableHead className="text-right">Out</TableHead><TableHead className="text-right">Balance</TableHead>
              <TableHead>Remark</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              <TableRow className="bg-muted/40"><TableCell colSpan={6} className="text-xs font-medium">Opening balance</TableCell>
                <TableCell className="text-right text-xs font-medium">{money(j.opening)}</TableCell><TableCell colSpan={2} /></TableRow>
              {j.lines.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">No entries in this period</TableCell></TableRow>}
              {j.lines.map((l) => (
                <TableRow key={`${l.kind}-${l.id}`} className="text-xs">
                  <TableCell className="whitespace-nowrap">{formatDate(l.date)}</TableCell>
                  <TableCell><Badge variant={l.kind === 'auto' ? 'secondary' : 'outline'}>{l.kind === 'auto' ? 'Auto' : 'Manual'}</Badge></TableCell>
                  <TableCell className="min-w-[180px]">{l.category && <span className="text-muted-foreground">{l.category} — </span>}{l.description}</TableCell>
                  <TableCell>{l.reference ?? ''}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{l.direction === 'in' ? money(l.amount) : ''}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-destructive">{l.direction === 'out' ? money(l.amount) : ''}</TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium">{money(l.balance)}</TableCell>
                  <TableCell className="max-w-[200px] break-words">{l.remark ?? ''}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {l.receipt_path && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openSignedUrl(l.receipt_path!)}><ImageIcon className="h-3.5 w-3.5" /></Button>}
                    {l.kind === 'manual' && <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDraft({ id: l.id, entry_date: l.date, direction: l.direction, category: l.category ?? 'Other expense', description: l.description, amount: String(l.amount), remark: l.remark ?? '', file: null })}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>{draft?.id ? 'Edit entry' : 'Add entry'} — {branchName}</DialogTitle></DialogHeader>
          {draft && <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Date</Label><DateField value={draft.entry_date} onChange={(v) => setDraft({ ...draft, entry_date: v })} /></div>
              <div className="space-y-1"><Label className="text-xs">Type</Label>
                <Select value={draft.direction} onValueChange={(v: any) => setDraft({ ...draft, direction: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="out">Money out (expense)</SelectItem><SelectItem value="in">Money in (income)</SelectItem></SelectContent>
                </Select></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{[...new Set([...CATEGORIES, draft.category])].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs">Description</Label><Input className="h-8 text-xs" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Amount</Label><Input className="h-8 text-xs" type="number" step="0.01" min="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Receipt image (optional, Ctrl/Cmd+V to paste)</Label><Input className="h-8 text-xs" type="file" accept="image/*" onChange={(e) => setDraft({ ...draft, file: e.target.files?.[0] ?? null })} /></div>
            <div className="space-y-1"><Label className="text-xs">Remark</Label><Input className="h-8 text-xs" value={draft.remark} onChange={(e) => setDraft({ ...draft, remark: e.target.value })} /></div>
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button disabled={save.isPending} onClick={() => draft && save.mutate(draft)}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceTab;
