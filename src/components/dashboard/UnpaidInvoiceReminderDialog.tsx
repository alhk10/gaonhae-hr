import React from 'react';
import { formatDate } from '@/utils/dateFormat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CreditCard, FileText } from 'lucide-react';

import CreatePaymentDialog from '@/components/sales/CreatePaymentDialog';
import { useQueryClient } from '@tanstack/react-query';

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  balance_due: number;
  status: string | null;
  created_at: string;
  due_date: string | null;
}

interface UnpaidInvoiceReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unpaidInvoices: UnpaidInvoice[];
  studentId: string;
  onGoToInvoices: () => void;
}

const UnpaidInvoiceReminderDialog: React.FC<UnpaidInvoiceReminderDialogProps> = ({
  open,
  onOpenChange,
  unpaidInvoices,
  studentId,
  onGoToInvoices,
}) => {
  const queryClient = useQueryClient();
  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-destructive/10 p-2 rounded-full">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-lg">Outstanding Invoice{unpaidInvoices.length > 1 ? 's' : ''}</DialogTitle>
          </div>
          <DialogDescription>
            You have {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length > 1 ? 's' : ''} totalling{' '}
            <span className="font-semibold text-foreground">${totalOutstanding.toFixed(2)}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
          {unpaidInvoices.map((invoice) => {
            const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date();
            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{invoice.invoice_number}</p>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">Overdue</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {invoice.due_date
                      ? `Due: ${formatDate(new Date(invoice.due_date))}`
                      : `Issued: ${formatDate(new Date(invoice.created_at))}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-semibold text-sm">${invoice.balance_due.toFixed(2)}</span>
                  <CreatePaymentDialog
                    trigger={
                      <Button size="sm" variant="default">
                        <CreditCard className="w-3 h-3 mr-1" />
                        Pay
                      </Button>
                    }
                    preSelectedInvoiceId={invoice.id}
                    onPaymentCreated={() => {
                      queryClient.invalidateQueries({ queryKey: ['student-invoices', studentId] });
                      onOpenChange(false);
                    }}
                    isStudentPortal={true}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              onGoToInvoices();
            }}
          >
            <FileText className="w-4 h-4 mr-1" />
            View All Invoices
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnpaidInvoiceReminderDialog;
