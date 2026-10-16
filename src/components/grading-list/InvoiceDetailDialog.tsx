/**
 * Read-only invoice card used across the public /access lists.
 * Renders the invoice PDF preview with Open / Print and Download actions.
 */
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import InvoiceDialog from '@/components/sales/InvoiceDialog';
import { deleteInvoice, cancelInvoice } from '@/services/invoiceService';
import { getPublicInvoiceFull } from '@/services/publicInvoiceService';
import { getInvoicePDFBlob } from '@/utils/invoicePDFGenerator';
import { formatDate } from '@/utils/dateFormat';
import PdfPagesPreview from '@/components/common/PdfPagesPreview';

interface Props {
  invoiceId: string | null;
  invoiceNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoiceDetailDialog: React.FC<Props> = ({
  invoiceId,
  invoiceNumber,
  open,
  onOpenChange,
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState<string | null>(invoiceNumber ?? null);
  const [summary, setSummary] = useState<string>('');
  const [detail, setDetail] = useState<any>(null);
  const [pending, setPending] = useState<{ edit_pending: boolean; delete_pending: boolean }>({ edit_pending: false, delete_pending: false });
  const [action, setAction] = useState<null | 'edit' | 'delete'>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { user, userrole } = useAuth();
  const isSuperadmin = userrole === 'superadmin';
  const signedIn = !!user;

  const loadPending = async () => {
    if (!invoiceId) return;
    const { data } = await (supabase as any).rpc('get_invoice_pending_requests', { p_invoice_id: invoiceId });
    if (data) setPending(data);
  };

  const isPaid = ['paid', 'verified', 'partially_paid'].includes(String(detail?.status || '')) || Number(detail?.amount_paid || 0) > 0;

  const handleEditClick = () => {
    if (signedIn) { setEditorOpen(true); return; }
    setText(''); setAction('edit');
  };

  const submitAction = async () => {
    if (!invoiceId || !action) return;
    if (!text.trim()) { toast.error(action === 'edit' ? 'Describe the change' : 'Enter a reason'); return; }
    setBusy(true);
    try {
      if (action === 'delete' && isSuperadmin) {
        if (isPaid) await cancelInvoice(invoiceId); else await deleteInvoice(invoiceId);
        toast.success(isPaid ? 'Invoice cancelled and refunded to credit' : 'Invoice deleted');
        setAction(null); onOpenChange(false); return;
      }
      const fn = action === 'edit' ? 'submit_access_invoice_edit_request' : 'submit_access_invoice_deletion_request';
      const args: any = action === 'edit'
        ? { p_invoice_id: invoiceId, p_note: text, p_actor: user?.email || null }
        : { p_invoice_id: invoiceId, p_reason: text, p_actor: user?.email || null };
      const { error } = await (supabase as any).rpc(fn, args);
      if (error) throw error;
      toast.success('Sent to superadmin for approval');
      setAction(null); loadPending();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    setNumber(invoiceNumber ?? null);
    setSummary('');
    if (!open || !invoiceId) return;
    setLoading(true);
    (async () => {
      try {
        loadPending();
        const detail = await getPublicInvoiceFull(invoiceId);
        if (!cancelled) setDetail(detail);
        if (!detail) throw new Error('Invoice not found');
        const blob = await getInvoicePDFBlob(detail);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setNumber(detail.invoice_number || invoiceNumber || null);
        setSummary(
          [
            detail.student?.name,
            detail.issue_date ? formatDate(new Date(detail.issue_date)) : null,
            detail.status,
          ]
            .filter(Boolean)
            .join(' · '),
        );
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load invoice');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, invoiceId, invoiceNumber, reloadKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Invoice {number || ''}</DialogTitle>
          <DialogDescription className="text-xs">{summary || 'Invoice details'}</DialogDescription>
          {(pending.edit_pending || pending.delete_pending) && (
            <div className="flex flex-wrap gap-1 pt-1">
              {pending.edit_pending && <Badge variant="secondary" className="text-[10px]">Edit pending approval</Badge>}
              {pending.delete_pending && <Badge variant="secondary" className="text-[10px]">Delete pending approval</Badge>}
            </div>
          )}
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading invoice…
          </div>
        ) : error ? (
          <p className="py-10 text-center text-xs text-destructive">{error}</p>
        ) : url ? (
          <PdfPagesPreview url={url} />
        ) : null}
        {action && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium">
              {action === 'edit' ? 'Describe the change needed' : isSuperadmin
                ? (isPaid ? `Cancel this invoice and refund $${Number(detail?.amount_paid || 0).toFixed(2)} paid to student credit?` : 'Delete this invoice with its items, entitlements, bookings and payments?')
                : 'Why should this invoice be deleted?'}
            </p>
            {detail && (
              <p className="text-[11px] text-muted-foreground">
                {detail.invoice_number} · {detail.student?.name} · Total ${Number(detail.total_amount).toFixed(2)} · Paid ${Number(detail.amount_paid).toFixed(2)}
              </p>
            )}
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="text-xs" rows={3} placeholder={action === 'edit' ? 'e.g. Change 1x Weekend to 2x Weekend' : 'Reason'} />
            {!isSuperadmin && <p className="text-[11px] text-muted-foreground">This goes to a superadmin for approval. The invoice stays unchanged until then.</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setAction(null)} disabled={busy}>Cancel</Button>
              <Button variant={action === 'delete' ? 'destructive' : 'default'} size="sm" className="text-xs" onClick={submitAction} disabled={busy}>
                {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {isSuperadmin && action === 'delete' ? (isPaid ? 'Cancel & refund' : 'Delete') : 'Send for approval'}
              </Button>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 flex-wrap">
          {detail && !action && (
            <>
              <Button variant="outline" size="sm" className="text-xs" onClick={handleEditClick} disabled={!signedIn && pending.edit_pending}>
                <Pencil className="mr-1 h-3 w-3" /> {!signedIn && pending.edit_pending ? 'Edit pending' : 'Edit'}
              </Button>
              <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => { setText(''); setAction('delete'); }} disabled={!isSuperadmin && pending.delete_pending}>
                <Trash2 className="mr-1 h-3 w-3" /> {!isSuperadmin && pending.delete_pending ? 'Delete pending' : 'Delete'}
              </Button>
            </>
          )}
          {url && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.open(url, '_blank')}
              >
                Open / Print
              </Button>
              <Button
                size="sm"
                className="text-xs"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${number || 'invoice'}.pdf`;
                  a.click();
                }}
              >
                Download PDF
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
      {editorOpen && invoiceId && (
        <InvoiceDialog
          mode="edit"
          invoiceId={invoiceId}
          open={editorOpen}
          onOpenChange={(o) => { setEditorOpen(o); if (!o) { setReloadKey((k) => k + 1); } }}
          onInvoiceUpdated={() => setReloadKey((k) => k + 1)}
        />
      )}
    </Dialog>
  );
};

export default InvoiceDetailDialog;
