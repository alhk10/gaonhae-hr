import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Ban, Trash2 } from 'lucide-react';
import {
  getJournal, postJournal, voidJournal, deleteJournal, listAccounts,
  type ChartAccount, type JournalEntryWithLines,
} from '@/services/accountingService';
import { formatDate } from '@/utils/dateFormat';
import { toast } from 'sonner';

const JournalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [journal, setJournal] = useState<JournalEntryWithLines | null>(null);
  const [accounts, setAccounts] = useState<Record<string, ChartAccount>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const j = await getJournal(id);
      setJournal(j);
      const accs = await listAccounts(j.country);
      setAccounts(Object.fromEntries(accs.map(a => [a.id, a])));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading || !journal) return <ResponsiveLayout><div className="p-6 text-muted-foreground">Loading…</div></ResponsiveLayout>;

  const totalDebit = journal.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = journal.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  const doPost = async () => {
    try { await postJournal(journal.id); toast.success('Posted'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const doVoid = async () => {
    if (!confirm('Void this journal?')) return;
    try { await voidJournal(journal.id); toast.success('Voided'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const doDelete = async () => {
    if (!confirm('Permanently delete this draft?')) return;
    try { await deleteJournal(journal.id); toast.success('Deleted'); navigate('/finance/journals'); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/finance/journals"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
            </Button>
            <h1 className="text-xl font-bold">{journal.entry_number || 'Journal'}</h1>
            <Badge variant={
              journal.status === 'posted' ? 'default'
              : journal.status === 'void' ? 'secondary' : 'outline'}>{journal.status}</Badge>
          </div>
          <div className="flex gap-2">
            {journal.status === 'draft' && (
              <>
                <Button size="sm" onClick={doPost}><Send className="h-4 w-4 mr-1" />Post</Button>
                <Button size="sm" variant="outline" onClick={doDelete}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
              </>
            )}
            {journal.status === 'posted' && (
              <Button size="sm" variant="outline" onClick={doVoid}><Ban className="h-4 w-4 mr-1" />Void</Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Header</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Date</div>{formatDate(journal.entry_date)}</div>
            <div><div className="text-xs text-muted-foreground">Period</div>{journal.period}</div>
            <div><div className="text-xs text-muted-foreground">Country</div>{journal.country}</div>
            <div><div className="text-xs text-muted-foreground">Branch</div>{journal.branch_id || '—'}</div>
            <div><div className="text-xs text-muted-foreground">Source</div><span className="capitalize">{journal.source_type}</span>{journal.source_id ? ` · ${journal.source_id}` : ''}</div>
            <div><div className="text-xs text-muted-foreground">Reference</div>{journal.reference || '—'}</div>
            <div className="sm:col-span-2"><div className="text-xs text-muted-foreground">Narration</div>{journal.narration || '—'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Lines</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase">
                  <tr>
                    <th className="text-left p-2">Account</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Debit</th>
                    <th className="text-right p-2">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.lines.map(l => {
                    const a = accounts[l.account_id];
                    return (
                      <tr key={l.id} className="border-t">
                        <td className="p-2"><span className="font-mono text-xs">{a?.code}</span> {a?.name || l.account_id}</td>
                        <td className="p-2">{l.description || '—'}</td>
                        <td className="p-2 text-right">{Number(l.debit || 0).toFixed(2)}</td>
                        <td className="p-2 text-right">{Number(l.credit || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 font-medium">
                  <tr className="border-t">
                    <td colSpan={2} className="p-2 text-right">Totals</td>
                    <td className="p-2 text-right">{totalDebit.toFixed(2)}</td>
                    <td className="p-2 text-right">{totalCredit.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default JournalDetail;
