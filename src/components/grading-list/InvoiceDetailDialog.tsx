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
import { Loader2 } from 'lucide-react';
import { getPublicInvoiceFull } from '@/services/publicInvoiceService';
import { getInvoicePDFBlob } from '@/utils/invoicePDFGenerator';
import { formatDate } from '@/utils/dateFormat';

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
        const detail = await getPublicInvoiceFull(invoiceId);
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
  }, [open, invoiceId, invoiceNumber]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Invoice {number || ''}</DialogTitle>
          <DialogDescription className="text-xs">{summary || 'Invoice details'}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading invoice…
          </div>
        ) : error ? (
          <p className="py-10 text-center text-xs text-destructive">{error}</p>
        ) : url ? (
          <iframe src={url} title="Invoice preview" className="w-full h-[70vh] rounded border" />
        ) : null}
        <DialogFooter className="gap-2">
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
    </Dialog>
  );
};

export default InvoiceDetailDialog;
