/**
 * Invoice Change Log Dialog
 * Displays the change history for an invoice in a timeline format
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, 
  FileText, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { 
  getInvoiceChangeLogs, 
  formatActionLabel, 
  getActionColor,
  type InvoiceChangeLog 
} from '@/services/invoiceChangeLogService';
import { formatCurrency } from '@/utils/currencyUtils';

interface InvoiceChangeLogDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  trigger?: React.ReactNode;
}

const InvoiceChangeLogDialog: React.FC<InvoiceChangeLogDialogProps> = ({
  invoiceId,
  invoiceNumber,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<InvoiceChangeLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open, invoiceId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getInvoiceChangeLogs(invoiceId);
      setLogs(data);
    } catch (error) {
      console.error('Error loading change logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'status_changed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'payment_added':
        return <CreditCard className="h-4 w-4" />;
      case 'payment_removed':
        return <CreditCard className="h-4 w-4" />;
      case 'item_added':
        return <Package className="h-4 w-4" />;
      case 'item_removed':
        return <Trash2 className="h-4 w-4" />;
      case 'item_updated':
      case 'field_updated':
        return <Edit className="h-4 w-4" />;
      case 'deleted':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatChangeDescription = (log: InvoiceChangeLog): string => {
    switch (log.action) {
      case 'created':
        return 'Invoice was created';
      case 'status_changed':
        return `Status changed from "${log.old_value}" to "${log.new_value}"`;
      case 'payment_added':
        if (log.changes?.amount) {
          return `Payment of ${formatCurrency(log.changes.amount, log.changes.currency || 'SGD')} added`;
        }
        return 'Payment was added';
      case 'payment_removed':
        if (log.changes?.amount) {
          return `Payment of ${formatCurrency(log.changes.amount, log.changes.currency || 'SGD')} removed`;
        }
        return 'Payment was removed';
      case 'item_added':
        return log.changes?.product_name 
          ? `Item "${log.changes.product_name}" was added`
          : 'Line item was added';
      case 'item_removed':
        return log.changes?.product_name 
          ? `Item "${log.changes.product_name}" was removed`
          : 'Line item was removed';
      case 'item_updated':
        return log.changes?.product_name 
          ? `Item "${log.changes.product_name}" was updated`
          : 'Line item was updated';
      case 'field_updated':
        if (log.field_name) {
          return `${log.field_name} changed from "${log.old_value || '-'}" to "${log.new_value || '-'}"`;
        }
        return 'Invoice was updated';
      case 'deleted':
        return 'Invoice was deleted';
      default:
        return log.action;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View History">
            <History className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Change History
          </DialogTitle>
          <DialogDescription>
            Invoice {invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No history yet</h3>
              <p className="text-muted-foreground text-sm">
                Changes to this invoice will appear here
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              
              <div className="space-y-6">
                {logs.map((log, index) => (
                  <div key={log.id} className="relative flex gap-4 pl-2">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`font-medium text-sm ${getActionColor(log.action)}`}>
                          {formatActionLabel(log.action)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-foreground mt-1">
                        {formatChangeDescription(log)}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{formatTimestamp(log.created_at)}</span>
                        {log.changed_by_email && (
                          <>
                            <span>•</span>
                            <span>by {log.changed_by_email}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Show additional details for complex changes */}
                      {log.changes && Object.keys(log.changes).length > 0 && log.action !== 'payment_added' && log.action !== 'payment_removed' && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <pre className="whitespace-pre-wrap overflow-hidden">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceChangeLogDialog;
