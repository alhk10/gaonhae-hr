/**
 * "Conversion due" / certificate dialog. Staff can either upload + scan an
 * STF / Kukkiwon certificate (auto-verified when issuer, name and Date of Issue
 * check out; otherwise approve by hand with a reason), or issue the STF
 * conversion invoice for the student's next eligible conversion.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FilePlus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import InvoiceDialog from '@/components/sales/InvoiceDialog';
import { createAccessInvoice } from '@/services/invoiceService';
import { useAuth } from '@/contexts/AuthContext';
import { uploadCertificate, reviewCertificate } from '@/services/certificateService';
import { checkConversionEligibility, conversionProductName } from '@/utils/danConversion';
import { formatDate } from '@/utils/dateFormat';

const RANKS = ['1st Poom', '2nd Poom', '3rd Poom', '4th Poom', '1st Dan', '2nd Dan', '3rd Dan', '4th Dan', '5th Dan'];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  student: { id: string; name: string; belt?: string | null; dob?: string | null; branchId?: string | null; lastConversion?: string | null; prePoom?: string | null };
  /** Existing "certificate needed" row (from a paid conversion invoice) */
  certificateId?: string | null;
  defaultRank?: string | null;
  onDone?: () => void;
}

export const ConversionDialog: React.FC<Props> = ({ open, onOpenChange, student, certificateId, defaultRank, onDone }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const check = checkConversionEligibility(student.belt, student.dob, student.lastConversion, new Date(), student.prePoom);
  const [series, setSeries] = useState<'stf' | 'kukkiwon'>('stf');
  const [rank, setRank] = useState<string>(defaultRank || student.belt || '1st Dan');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id: string; status: string; scan: any; issue_date: string | null } | null>(null);
  const [manualDate, setManualDate] = useState('');
  const [reason, setReason] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const product = student.belt ? conversionProductName(student.belt) : null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['grading-records'] });
    qc.invalidateQueries({ queryKey: ['conversion-status'] });
    qc.invalidateQueries({ queryKey: ['pending-certificates'] });
    onDone?.();
  };

  const doUpload = async () => {
    if (!file) return toast.error('Choose the certificate image');
    setBusy(true);
    try {
      const r = await uploadCertificate(student.id, file, { series, rank, certificateId });
      setResult(r);
      if (r.issue_date) setManualDate(r.issue_date.split('-').reverse().join('/'));
      if (r.status === 'verified') { toast.success('Certificate verified'); refresh(); }
      else toast.warning('Please check the scan details below');
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const approveManual = async () => {
    if (!result) return;
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(manualDate.trim());
    if (!m) return toast.error('Enter the Date of Issue as DD/MM/YYYY');
    if (!reason.trim()) return toast.error('Enter a reason');
    setBusy(true);
    try {
      await reviewCertificate(result.id, true, { series, rank, issueDate: `${m[3]}-${m[2]}-${m[1]}`, reason: reason.trim() });
      toast.success('Certificate approved'); refresh(); onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <>
      {invoiceOpen && (
        <InvoiceDialog mode="create" open onOpenChange={(o) => !o && setInvoiceOpen(false)}
          branchId={student.branchId || undefined} prefilledStudentId={student.id}
          onSubmitOverride={user ? undefined : createAccessInvoice}
          onInvoiceCreated={() => { setInvoiceOpen(false); refresh(); onOpenChange(false); }} />
      )}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{student.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Current rank {student.belt || '—'}
              {check.target && <> · next conversion <b>{check.target}</b>{check.eligible ? ' (eligible)' : check.reason ? ` - ${check.reason}` : ''}</>}
            </DialogDescription>
          </DialogHeader>

          {!certificateId && (
            <div className="rounded-md border p-2 space-y-1.5">
              <p className="text-xs font-semibold">Issue conversion invoice</p>
              {check.eligible && product ? (
                <>
                  <p className="text-[11px] text-muted-foreground">Add <b>{product}</b> from the Conversions category. After payment, upload the new certificate in Approvals. Once verified, the belt updates automatically.</p>
                  <Button size="sm" className="h-7 text-xs" onClick={() => setInvoiceOpen(true)}><FilePlus className="mr-1 h-3.5 w-3.5" />Create invoice</Button>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">{check.reason || 'Not eligible yet.'}</p>
              )}
            </div>
          )}

          <div className="rounded-md border p-2 space-y-2">
            <p className="text-xs font-semibold">{certificateId ? 'Upload the new certificate' : 'Upload existing certificate'}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Series</Label>
                <Select value={series} onValueChange={(v) => setSeries(v as any)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="stf">STF</SelectItem><SelectItem value="kukkiwon">Kukkiwon</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Rank</Label>
                <Select value={rank} onValueChange={setRank}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Input type="file" accept="image/*" className="h-8 text-xs" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <p className="text-[10px] text-muted-foreground">Images only. You can also paste with Ctrl/Cmd+V.</p>
            <Button size="sm" className="h-7 text-xs" disabled={busy || !file} onClick={doUpload}>
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}Upload &amp; scan
            </Button>

            {result && (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  {result.status === 'verified'
                    ? <><CheckCircle2 className="h-3.5 w-3.5 text-primary" /><b>Verified</b></>
                    : <><AlertTriangle className="h-3.5 w-3.5 text-destructive" /><b>Needs checking</b></>}
                </div>
                <div>Issuer: {result.scan?.issuer || '—'} {result.scan?.issuer_ok ? <Badge variant="outline" className="text-[9px]">OK</Badge> : null}</div>
                <div>Name: {result.scan?.name || '—'} {result.scan?.name_ok ? <Badge variant="outline" className="text-[9px]">OK</Badge> : null}</div>
                <div>Rank: {result.scan?.rank || '—'} · Date of Issue: {result.issue_date ? formatDate(result.issue_date) : '—'}</div>
                {(result.scan?.problems || []).map((p: string) => <div key={p} className="text-destructive">{p}</div>)}
                {result.status !== 'verified' && (
                  <div className="space-y-1.5 pt-1">
                    <Input className="h-7 text-xs" placeholder="Date of Issue DD/MM/YYYY" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                    <Input className="h-7 text-xs" placeholder="Reason for approving by hand" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={approveManual}>Approve by hand</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConversionDialog;
