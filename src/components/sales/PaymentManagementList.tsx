/**
 * Payment Management List Component
 * Displays and manages payments in the sales module
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
import { formatDate } from '@/utils/dateFormat';
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Eye,
  Edit,
  Trash2,
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { getPayments, type Payment } from '@/services/paymentService';
import { createDeletionRequest } from '@/services/paymentDeletionRequestService';
import CreatePaymentDialog from './CreatePaymentDialog';
import ViewEditPaymentDialog from './ViewEditPaymentDialog';
import { formatCurrency } from '@/utils/currencyUtils';

const PaymentManagementList: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  
  // View/Edit dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  
  // Delete request dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const pageSize = 20;
  const totalPages = Math.ceil(totalPayments / pageSize);

  useEffect(() => {
    loadPayments();
  }, [currentPage, searchQuery, methodFilter, dateFromFilter, dateToFilter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await getPayments(
        currentPage,
        pageSize,
        searchQuery || undefined,
        methodFilter && methodFilter !== 'all' ? methodFilter : undefined,
        dateFromFilter || undefined,
        dateToFilter || undefined
      );
      setPayments(response.payments);
      setTotalPayments(response.total);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPayment = (paymentId: string, selected: boolean) => {
    if (selected) {
      setSelectedPayments([...selectedPayments, paymentId]);
    } else {
      setSelectedPayments(selectedPayments.filter(id => id !== paymentId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedPayments(payments.map(payment => payment.id));
    } else {
      setSelectedPayments([]);
    }
  };

  const handleOpenDeleteDialog = (payment: Payment) => {
    setPaymentToDelete(payment);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleSubmitDeleteRequest = async () => {
    if (!paymentToDelete) return;
    
    try {
      setIsSubmittingDelete(true);
      await createDeletionRequest(paymentToDelete.id, deleteReason || undefined);
      toast.success('Deletion request submitted for superadmin approval');
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
      setDeleteReason('');
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast.error('Failed to submit deletion request');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const getMethodBadgeVariant = (method: string) => {
    switch (method) {
      case 'cash': return 'default';
      case 'bank_transfer': return 'secondary';
      case 'credit_card': return 'outline';
      case 'digital_wallet': return 'secondary';
      case 'cheque': return 'outline';
      default: return 'outline';
    }
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'credit_card': 'Credit Card',
      'digital_wallet': 'Digital Wallet',
      'cheque': 'Cheque'
    };
    return methods[method] || method;
  };


  const formatDate = (dateString: string) => {formatDate(
    return new Date(dateString));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setMethodFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Payment Management</h2>
          <p className="text-muted-foreground">
            Track and manage invoice payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <CreatePaymentDialog 
            trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            }
            onPaymentCreated={loadPayments}
          />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search and filter payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
            />

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedPayments.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedPayments.length} payment(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  <Receipt className="w-4 h-4 mr-2" />
                  Generate Receipt
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Export Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            {totalPayments} total payment(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No payments found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || methodFilter || dateFromFilter || dateToFilter 
                  ? 'Try adjusting your search criteria'
                  : 'Record your first payment to get started'
                }
              </p>
              {!searchQuery && !methodFilter && !dateFromFilter && !dateToFilter && (
                <CreatePaymentDialog 
                  trigger={
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Record First Payment
                    </Button>
                  }
                  onPaymentCreated={loadPayments}
                />
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPayments.length === payments.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPayments.includes(payment.id)}
                          onCheckedChange={(checked) => handleSelectPayment(payment.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.payment_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {payment.invoice_number || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.student_name || 'Unknown Student'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getMethodBadgeVariant(payment.payment_method)}>
                          {formatPaymentMethod(payment.payment_method)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(payment.payment_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {payment.reference_number || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View Payment"
                            onClick={() => {
                              setSelectedPaymentId(payment.id);
                              setDialogMode('view');
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit Payment"
                            onClick={() => {
                              setSelectedPaymentId(payment.id);
                              setDialogMode('edit');
                              setViewDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Request Delete"
                            onClick={() => handleOpenDeleteDialog(payment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalPayments)} of {totalPayments} payments
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View/Edit Payment Dialog */}
      {selectedPaymentId && (
        <ViewEditPaymentDialog
          paymentId={selectedPaymentId}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          onPaymentUpdated={loadPayments}
          initialMode={dialogMode}
        />
      )}

      {/* Delete Request Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payment Deletion</DialogTitle>
            <DialogDescription>
              This deletion request will be sent to a superadmin for approval.
            </DialogDescription>
          </DialogHeader>
          
          {paymentToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment #:</span>
                  <span className="font-medium">{paymentToDelete.payment_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(paymentToDelete.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-medium">{paymentToDelete.invoice_number || '-'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-reason">Reason for deletion (optional)</Label>
                <Textarea
                  id="delete-reason"
                  placeholder="Enter reason for deletion..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isSubmittingDelete}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitDeleteRequest}
              disabled={isSubmittingDelete}
            >
              {isSubmittingDelete ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentManagementList;