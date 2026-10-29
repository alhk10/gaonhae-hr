/**
 * One pending payment in the /access Summary list, with supporting details,
 * proof thumbnails and Verify / Reject acting directly on the row. Uses the
 * same verify/reject calls as the individual tabs.
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { tryAutoImport } from '@/utils/submissionAutoImport';
import { SignedImage, SignedLink } from '@/components/common/SignedMedia';
import StudentNameButton from './StudentNameButton';
import InvoiceNumberButton from './InvoiceNumberButton';
import { verifySchoolFeesSubmission, rejectSchoolFeesSubmission } from '@/services/schoolFeesSubmissionService';
import { verifyGradingSubmission, rejectGradingSubmission, importGradingSubmission } from '@/services/gradingPaymentSubmissionService';
import { verifyCompetitionSubmission, rejectCompetitionSubmission, importCompetitionSubmission } from '@/services/competitionPaymentSubmissionService';
import { verifySeminarSubmission, rejectSeminarSubmission, createSeminarInvoice } from '@/services/seminarPaymentSubmissionService';
import { setGuardsStatus } from '@/services/guardsPurchaseService';

export type PaymentApprovalType = 'school-fees' | 'grading' | 'competitions' | 'seminars' | 'guards';

interface Props {
  type: PaymentApprovalType;
  typeLabel: string;
  raw: any;
  at: string;
  name: string;
  branch: string;
  amount: number | null;
  canApprove?: boolean;
  onOpenStudent: (id: string) => void;
  onOpenInvoice: (id: string, number?: string | null) => void;
}

const money = (n: number | null | undefined) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);
const isUrl = (u?: string | null) => !!u && /^https?:\/\//.test(u);

const details = (type: PaymentApprovalType, r: any): string[] => {
  const out: string[] = [];
  if (type === 'school-fees') {
    const items = (r.items || []).map((i: any) => `${i.name || i.product_name || 'Item'}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ');
    if (items) out.push(items);
    if (r.payment_method) out.push(String(r.payment_method));
    if (r.scan_amount != null) out.push(`Scanned ${money(r.scan_amount)}`);
    if (r.reference_number) out.push(`Ref ${r.reference_number}`);
  } else if (type === 'grading') {
    if (r.slot_title) out.push(r.slot_title);
    if (r.grading_date) out.push(`${formatDate(r.grading_date)}${r.start_time ? ` ${String(r.start_time).slice(0, 5)}` : ''}`);
    if (r.current_belt || r.target_belt) out.push(`${r.current_belt || '—'} → ${r.target_belt || '—'}`);
  } else if (type === 'competitions' || type === 'seminars') {
    if (r.event_name) out.push(r.event_name);
    if (Array.isArray(r.category_names) && r.category_names.length) out.push(r.category_names.join(', '));
    if (r.current_belt) out.push(r.current_belt);
  } else if (type === 'guards') {
    const items = (Array.isArray(r.items) ? r.items : []).map((i: any) => `${i.name || i.product_name || 'Item'}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ');
    if (items) out.push(items);
  }
  const matched = r.student_id || r.matched_student_id;
  out.push(matched ? 'Matched' : 'Not matched');
  return out;
};

const proofs = (r: any): string[] => {
  const list = [r.proof_url, ...(Array.isArray(r.extra_proofs) ? r.extra_proofs.map((p: any) => p?.url) : []), r.grading_card_url, r.passport_photo_url]
    .filter((u: any) => typeof u === 'string' && u.trim() !== '') as string[];
  return Array.from(new Set(list));
};

const SummaryApprovalRow: React.FC<Props> = ({ type, typeLabel, raw, at, name, branch, amount, canApprove, onOpenStudent, onOpenInvoice }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const actor = user?.employeeId || user?.email || 'system';
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const id = type === 'school-fees' || type === 'guards' ? raw.id : raw.submission_id;
  const studentId = raw.student_id || raw.matched_student_id || null;
  const invoiceId = raw.invoice_id || raw.matched_invoice_id || null;

  const refresh = () => {
    ['school-fees-list', 'public-grading-list', 'pending-grading-submission-meta', 'public-competition-list', 'public-seminar-list', 'guards-purchases']
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  const verify = async () => {
    if (type === 'grading' && !window.confirm('Reminder: upload the grading card in the Grading tab after verifying. Verify now?')) return;
    setBusy(true);
    try {
      if (type === 'school-fees') await verifySchoolFeesSubmission(id, actor);
      else if (type === 'grading') {
        await verifyGradingSubmission(id, actor);
        const a = await tryAutoImport(() => importGradingSubmission(id, actor));
        if (a.error) toast.error(`Verified, but import failed: ${a.error}`);
      } else if (type === 'competitions') {
        await verifyCompetitionSubmission(id, actor);
        const a = await tryAutoImport(() => importCompetitionSubmission(id, actor));
        if (a.error) toast.error(`Verified, but import failed: ${a.error}`);
      } else if (type === 'seminars') {
        await verifySeminarSubmission(id, actor);
        const a = await tryAutoImport(() => createSeminarInvoice(id, actor));
        if (a.error) toast.error(`Verified, but import failed: ${a.error}`);
      } else await setGuardsStatus(id, 'verified');
      toast.success('Verified');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not verify');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    const why = reason.trim() || 'Rejected';
    try {
      if (type === 'school-fees') await rejectSchoolFeesSubmission(id, why, actor);
      else if (type === 'grading') await rejectGradingSubmission(id, why, actor);
      else if (type === 'competitions') await rejectCompetitionSubmission(id, why, actor);
      else if (type === 'seminars') await rejectSeminarSubmission(id, why, actor);
      else await setGuardsStatus(id, 'rejected');
      toast.success('Rejected');
      setRejectOpen(false);
      setReason('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not reject');
    } finally {
      setBusy(false);
    }
  };

  const imgs = proofs(raw);

  return (
    <li className="py-2 flex flex-col gap-1 text-xs sm:text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-muted-foreground w-[120px] shrink-0">{at ? formatDateTime(at) : '—'}</span>
        <Badge variant="outline" className="text-[10px] shrink-0">{typeLabel}</Badge>
        <StudentNameButton name={name} studentId={studentId} onOpen={onOpenStudent} className="font-medium flex-1 min-w-[140px] break-words" />
        <span className="text-muted-foreground">{branch}</span>
        {(invoiceId || raw.invoice_number) && (
          <InvoiceNumberButton invoiceId={invoiceId} invoiceNumber={raw.invoice_number} onOpen={onOpenInvoice} className="text-xs" />
        )}
        <span className="w-[72px] text-right">{money(amount)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:pl-[132px]">
        <span className="text-muted-foreground text-[11px] flex-1 min-w-[160px] break-words">{details(type, raw).join(' · ')}</span>
        {imgs.map((u) => (
          <button key={u} type="button" onClick={() => setPreview(u)} className="h-10 w-10 rounded border overflow-hidden shrink-0" title="View document">
            <SignedImage src={u} alt="Supporting document" className="h-full w-full object-cover" fallback={<span className="text-[9px] text-muted-foreground">…</span>} />
          </button>
        ))}
        {canApprove && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={verify}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}Verify
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" disabled={busy} onClick={() => setRejectOpen(true)}>
              <X className="h-3 w-3 mr-1" />Reject
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-auto">
          {preview && (
            <div className="space-y-2">
              <SignedImage src={preview} alt="Supporting document" className="w-full h-auto" fallback={<p className="text-sm text-muted-foreground">Loading document…</p>} onError={(e) => { (e.currentTarget as HTMLImageElement).replaceWith(Object.assign(document.createElement('p'), { textContent: 'Document unavailable', className: 'text-sm text-muted-foreground' })); }} />
              <SignedLink href={preview} target="_blank" rel="noreferrer" className="text-primary underline text-xs">Open in new tab</SignedLink>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Reject {name}?</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={reject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
};

export default SummaryApprovalRow;
