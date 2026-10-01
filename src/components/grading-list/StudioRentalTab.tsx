import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, FileText, Settings, Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import StatusBadge from '@/components/grading-list/StatusBadge';
import { SignedImage } from '@/components/common/SignedMedia';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import {
  getRentalAgreement, getRentalList, getRentalSettings, reviewRental, saveRentalSettings,
  type RentalRow, type RentalSettings,
} from '@/services/studioRentalService';

interface Props {
  branchFilter?: string;
  lockedBranchId?: string;
  canEdit: boolean;
  isAllBranch: boolean;
}

const StudioRentalTab: React.FC<Props> = ({ branchFilter, lockedBranchId, canEdit, isAllBranch }) => {
  const qc = useQueryClient();
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['studio-rentals', lockedBranchId ?? null],
    queryFn: () => getRentalList(lockedBranchId ?? null),
  });
  const visible = useMemo(() => rows.filter(r =>
    !branchFilter || branchFilter === 'all' || lockedBranchId || r.branch_name === branchFilter), [rows, branchFilter, lockedBranchId]);

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'verified' | 'rejected' }) => reviewRental(id, status),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['studio-rentals'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const cur = (r: RentalRow) => (/morley|perth|au/i.test(r.branch_name) ? 'AUD' : 'SGD');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Studio Rental ({visible.length})</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.open('/rental', '_blank')}>Open form</Button>
          {canEdit && isAllBranch && (
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}><Settings className="h-4 w-4 mr-1" />Rates</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rental bookings yet.</p>
        ) : (
          <Table className="access-list-table">
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead><TableHead>Renter</TableHead><TableHead>Branch</TableHead>
                <TableHead>Sessions</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead>Proof</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(r => (
                <TableRow key={r.id}>
                  <TableCell data-label="Submitted" className="text-xs">{formatDateTime(r.created_at)}<div className="font-mono text-muted-foreground">{r.reference_number}</div></TableCell>
                  <TableCell data-label="Renter" className="text-xs">
                    <div className="font-medium">{r.renter_name}</div>
                    <div className="text-muted-foreground">{r.nric_uen} · {r.contact_number}</div>
                    <div className="text-muted-foreground break-all">{r.email}</div>
                  </TableCell>
                  <TableCell data-label="Branch" className="text-xs">{r.branch_name}</TableCell>
                  <TableCell data-label="Sessions" className="text-xs">
                    {r.sessions.map((s, i) => <div key={i}>{formatDate(s.date)} {s.start}–{s.end}</div>)}
                    <div className="text-muted-foreground">{Number(r.total_hours)}h</div>
                  </TableCell>
                  <TableCell data-label="Amount" className="text-xs text-right">
                    <div className="font-medium">{formatCurrency(Number(r.total_amount), cur(r))}</div>
                    {Number(r.deposit_amount) > 0 && <div className="text-muted-foreground">incl. {formatCurrency(Number(r.deposit_amount), cur(r))} deposit</div>}
                  </TableCell>
                  <TableCell data-label="Proof">
                    {r.proof_url ? <SignedImage src={r.proof_url} alt="Proof" className="h-12 w-12 object-cover rounded border" /> : '—'}
                  </TableCell>
                  <TableCell data-label="Status"><StatusBadge status={r.status} /></TableCell>
                  <TableCell data-label="Actions" data-field="actions">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" title="Signed agreement" onClick={() => setAgreementId(r.id)}><FileText className="h-4 w-4" /></Button>
                      {canEdit && r.status === 'pending_verification' && (<>
                        <Button size="icon" variant="ghost" title="Verify" onClick={() => review.mutate({ id: r.id, status: 'verified' })}><CheckCircle className="h-4 w-4 text-primary" /></Button>
                        <Button size="icon" variant="ghost" title="Reject" onClick={() => { if (confirm('Reject this rental payment?')) review.mutate({ id: r.id, status: 'rejected' }); }}><XCircle className="h-4 w-4 text-destructive" /></Button>
                      </>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <AgreementDialog id={agreementId} onClose={() => setAgreementId(null)} />
      {settingsOpen && <RatesDialog onClose={() => setSettingsOpen(false)} />}
    </Card>
  );
};

const AgreementDialog: React.FC<{ id: string | null; onClose: () => void }> = ({ id, onClose }) => {
  const { data } = useQuery({ queryKey: ['studio-rental-agreement', id], queryFn: () => getRentalAgreement(id!), enabled: !!id });
  const downloadPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(data.agreement_text, 180);
    let y = 15;
    lines.forEach((l: string) => { if (y > 280) { doc.addPage(); y = 15; } doc.text(l, 15, y); y += 4.5; });
    if (y > 240) { doc.addPage(); y = 15; }
    y += 6; doc.text('Renter signature:', 15, y);
    doc.addImage(data.signature_data, 'PNG', 15, y + 2, 70, 25);
    doc.text(`Signed: ${formatDateTime(data.signed_at)}  ·  ${data.renter_name}`, 15, y + 32);
    doc.save(`Studio-Rental-Agreement-${data.reference_number}.pdf`);
  };
  return (
    <Dialog open={!!id} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Signed agreement {data?.reference_number}</DialogTitle></DialogHeader>
        {!data ? <p className="text-sm">Loading…</p> : (
          <div className="space-y-3">
            <div className="text-xs whitespace-pre-wrap border rounded p-3 bg-muted/30">{data.agreement_text}</div>
            <img src={data.signature_data} alt="Renter signature" className="h-24 border rounded bg-background" />
            <p className="text-xs text-muted-foreground">Signed {formatDateTime(data.signed_at)} by {data.renter_name}</p>
            <Button size="sm" onClick={downloadPdf}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const RatesDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['studio-rental-settings'], queryFn: getRentalSettings });
  const [edits, setEdits] = useState<Record<string, RentalSettings>>({});
  const get = (s: RentalSettings) => edits[s.branch_id] ?? s;
  const set = (s: RentalSettings, patch: Partial<RentalSettings>) => setEdits(e => ({ ...e, [s.branch_id]: { ...get(s), ...patch } }));
  const save = async () => {
    try {
      await Promise.all(Object.values(edits).map(saveRentalSettings));
      toast.success('Rental rates saved');
      qc.invalidateQueries({ queryKey: ['studio-rental-settings'] });
      onClose();
    } catch (e: any) { toast.error(e.message); }
  };
  const num = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Studio rental rates by branch</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-[1.4fr_auto_1fr_1fr_1fr_1fr] gap-2 text-xs text-muted-foreground">
            <span>Branch</span><span>On</span><span>$/hour</span><span>Discounted $/hour</span><span>Threshold (h/month)</span><span>Deposit</span>
          </div>
          {data.map(s => { const v = get(s); return (
            <div key={s.branch_id} className="grid grid-cols-2 sm:grid-cols-[1.4fr_auto_1fr_1fr_1fr_1fr] gap-2 items-center border-b pb-2">
              <span className="text-sm font-medium">{s.branch_name}</span>
              <Switch checked={v.enabled} onCheckedChange={c => set(s, { enabled: c })} />
              <Input className="h-8" type="number" value={v.hourly_rate} onChange={e => set(s, { hourly_rate: num(e.target.value) })} aria-label="Hourly rate" />
              <Input className="h-8" type="number" value={v.discounted_rate} onChange={e => set(s, { discounted_rate: num(e.target.value) })} aria-label="Discounted rate" />
              <Input className="h-8" type="number" value={v.monthly_threshold_hours} onChange={e => set(s, { monthly_threshold_hours: num(e.target.value) })} aria-label="Threshold" />
              <Input className="h-8" type="number" value={v.deposit_amount} onChange={e => set(s, { deposit_amount: num(e.target.value) })} aria-label="Deposit" />
            </div>
          ); })}
          <Button onClick={save} disabled={Object.keys(edits).length === 0}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudioRentalTab;
