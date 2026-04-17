/**
 * Student Invoices Component
 * Displays student invoice and payment history
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/dateFormat';
import { 
  Receipt, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Download
} from 'lucide-react';


interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  notes?: string;
  invoice_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string;
  }>;
}

interface StudentInvoicesProps {
  invoices: Invoice[];
  loading?: boolean;
}

export const StudentInvoices: React.FC<StudentInvoicesProps> = ({
  invoices,
  loading = false
}) => {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
      case 'sent':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'draft':
        return <Receipt className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Receipt className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      paid: { variant: "default", className: "bg-green-100 text-green-800 border-green-200" },
      overdue: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200" },
      pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      sent: { variant: "outline", className: "bg-blue-100 text-blue-800 border-blue-200" },
      draft: { variant: "secondary", className: "bg-gray-100 text-gray-800 border-gray-200" }
    };

    const config = variants[status.toLowerCase()] || variants.draft;
    
    return (
      <Badge variant={config.variant} className={`${config.className} capitalize`}>
        {status}
      </Badge>
    );
  };

  const calculateTotals = () => {
    return invoices.reduce((acc, invoice) => ({
      totalAmount: acc.totalAmount + Number(invoice.total_amount),
      totalPaid: acc.totalPaid + Number(invoice.amount_paid),
      totalOutstanding: acc.totalOutstanding + Number(invoice.balance_due)
    }), { totalAmount: 0, totalPaid: 0, totalOutstanding: 0 });
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Invoices & Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse text-center p-3 bg-muted/50 rounded-lg">
                  <div className="h-6 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              ))}
            </div>
            
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse border border-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="h-5 bg-muted rounded w-1/3"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Invoices & Payments
          <Badge variant="outline" className="ml-auto">
            {invoices.length} invoices
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-lg text-foreground">
                ${totals.totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Total Invoiced</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-lg text-green-700">
                ${totals.totalPaid.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-green-600">Total Paid</div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-lg text-red-700">
                ${totals.totalOutstanding.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-red-600">Outstanding</div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Invoice #{invoice.invoice_number}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        Issued: {formatDate(new Date(invoice.issue_date))}
                        {invoice.due_date && (
                          <span className="ml-2">
                            • Due: {formatDate(new Date(invoice.due_date))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(invoice.status)}
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        ${Number(invoice.total_amount).toFixed(2)}
                      </div>
                      {Number(invoice.balance_due) > 0 && (
                        <div className="text-sm text-red-600">
                          ${Number(invoice.balance_due).toFixed(2)} due
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Items Preview */}
                {invoice.invoice_items && invoice.invoice_items.length > 0 && (
                  <div className="mb-3 p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm font-medium text-foreground mb-2">Items:</div>
                    <div className="space-y-1">
                      {invoice.invoice_items.slice(0, 3).map((item, index) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.description}
                          </span>
                          <span className="text-foreground">
                            ${Number(item.total_amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {invoice.invoice_items.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          +{invoice.invoice_items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment History */}
                {invoice.payments && invoice.payments.length > 0 && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      Payments ({invoice.payments.length}):
                    </div>
                    <div className="space-y-1">
                      {invoice.payments.slice(0, 2).map((payment) => (
                        <div key={payment.id} className="flex justify-between text-sm">
                          <span className="text-green-700">
                            {formatDate(new Date(payment.payment_date))} • {payment.payment_method}
                          </span>
                          <span className="text-green-800 font-medium">
                            ${Number(payment.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {invoice.payments.length > 2 && (
                        <div className="text-sm text-green-600">
                          +{invoice.payments.length - 2} more payments
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Paid: ${Number(invoice.amount_paid).toFixed(2)} of ${Number(invoice.total_amount).toFixed(2)}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>

                {invoice.notes && (
                  <div className="mt-3 p-2 bg-muted/50 rounded text-sm text-muted-foreground">
                    <strong>Notes:</strong> {invoice.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};