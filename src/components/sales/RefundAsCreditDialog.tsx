/**
 * Refund as Credit Dialog
 * Shared dialog used across transaction lists (superadmin dashboard, /access tabs)
 * to refund one or several lines of an invoice as student credit.
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currencyUtils';
import { getInvoiceById } from '@/services/invoiceService';
import { refundLineItems, submitRefundRequest } from '@/services/invoiceRefundService';
import { useInvoiceAccess } from '@/hooks/useInvoiceAccess';
import { useAuth } from '@/contexts/AuthContext';

interface RefundAsCreditDialogProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefunded?: () => void;
  /** Optionally preselect a single line (used by the invoice dialog icon) */
  initialItemId?: string | null;
}

const RefundAsCreditDialog: React.FC<RefundAsCreditDialogProps> = ({
  invoiceId, open, onOpenChange, onRefunded, initialItemId,
}) => {
  const { isSuperadmin } = useInvoiceAccess();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['refund-invoice', invoiceId],
    queryFn: () => (invoiceId ? getInvoiceById(invoiceId) : null),
    enabled: open && !!invoiceId,
  });

  // Reset state whenever a different invoice is opened
  if (open && invoiceId !== lastInvoiceId) {
    setLastInvoiceId(invoiceId);
    setSelected(initialItemId ? [initialItemId] : []);
    setReason('');
  }

  const items = useMemo(() => (invoice?.items || []).filter(Boolean), [invoice]);
  const isRefunded = (item: any) => (item?.metadata as any)?.refunded === true;

  const isPaidOrVerified = invoice
    ? ['paid', 'verified', 'partially_paid'].includes(String(invoice.status))
    : false;
  const isCancelled = String(invoice?.status) === 'cancelled';
  const canRefund = isPaidOrVerified && !isCancelled;

  const selectedTotal = items
    .filter(i => selected.includes(i.id))
    .reduce((sum, i) => sum + Number(i.total_amount || 0) + Number(i.tax_amount || 0), 0);

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleConfirm = async () => {
    if (!invoice || selected.length === 0 || !reason.trim()) return;
    try {
      setIsSubmitting(true);
      if (isSuperadmin) {
        await refundLineItems(selected, reason.trim());
        toast.success(
          selected.length > 1
            ? `${selected.length} items refunded as student credit`
            : 'Item refunded as student credit'
        );
      } else {
        await submitRefundRequest(
          invoice.id,
          selected,
          reason.trim(),
          invoice.invoice_number,
          (invoice as any).student_name || '',
          user?.email || ''
        );
        toast.success('Refund request submitted for superadmin approval');
      }
      onOpenChange(false);
      onRefunded?.();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Refund as Credit</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            {isSuperadmin
              ? 'Select the lines to refund. The amount is issued as student credit.'
              : 'Select the lines to refund. The request will be sent for superadmin approval.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : !invoice ? (
          <p className="text-xs text-muted-foreground py-4">Invoice not found.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <div className="font-mono font-medium">{invoice.invoice_number}</div>
                <div className="text-muted-foreground">{(invoice as any).student_name}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(Number(invoice.total_amount || 0))}</div>
                <Badge variant="secondary" className="text-[10px] capitalize">{String(invoice.status).replace('_', ' ')}</Badge>
              </div>
            </div>

            {!canRefund && (
              <p className="text-xs text-destructive">
                Only paid or verified invoices can be refunded.
              </p>
            )}

            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground">This invoice has no items.</p>
              )}
              {items.map((item: any) => {
                const refunded = isRefunded(item);
                const disabled = refunded || !canRefund;
                return (
                  <label
                    key={item.id}
                    className={cn(
                      'flex items-start gap-2 border rounded-lg p-2 cursor-pointer',
                      disabled && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <Checkbox
                      checked={selected.includes(item.id)}
                      disabled={disabled}
                      onCheckedChange={() => !disabled && toggle(item.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-xs font-medium', refunded && 'line-through')}>
                        {item.product_name || item.description}
                      </div>
                      {item.description && item.product_name && (
                        <div className="text-[11px] text-muted-foreground truncate">{item.description}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn('text-xs font-semibold', refunded && 'line-through')}>
                        {formatCurrency(Number(item.total_amount || 0) + Number(item.tax_amount || 0))}
                      </div>
                      {refunded && <Badge variant="secondary" className="text-[10px]">Refunded</Badge>}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <span>Credit to issue</span>
              <span className="text-green-600">{formatCurrency(selectedTotal)}</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reason for refund</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs md:h-10">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || !canRefund || selected.length === 0 || !reason.trim()}
            className="h-8 text-xs md:h-10"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            {isSuperadmin ? 'Refund Now' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundAsCreditDialog;
