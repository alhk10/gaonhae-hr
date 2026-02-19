/**
 * View/Edit Invoice Dialog Component
 * Displays invoice details and allows editing permitted fields
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getInvoiceById, updateInvoiceStatus, type Invoice, type InvoiceItem } from '@/services/invoiceService';
import { getPaymentsByInvoice, type Payment } from '@/services/paymentService';
import { createDeletionRequest } from '@/services/paymentDeletionRequestService';
import { formatCurrency } from '@/utils/currencyUtils';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Edit, Save, X, Calendar, FileText, CreditCard, DollarSign, History, Trash2, Eye } from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import CreatePaymentDialog from './CreatePaymentDialog';
import InvoiceChangeLogDialog from './InvoiceChangeLogDialog';
import ClassScheduleSelector from '@/components/dashboard/ClassScheduleSelector';
import { getTerm, type Term } from '@/services/termCalendarService';

interface ViewEditInvoiceDialogProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceUpdated?: () => void;
  initialMode?: 'view' | 'edit';
}

const ViewEditInvoiceDialog: React.FC<ViewEditInvoiceDialogProps> = ({
  invoiceId,
  open,
  onOpenChange,
  onInvoiceUpdated,
  initialMode = 'view'
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [invoice, setInvoice] = useState<(Invoice & { items: InvoiceItem[] }) | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editData, setEditData] = useState({
    notes: '',
    internal_notes: '',
    due_date: '',
    status: '' as Invoice['status']
  });
  
  // Delete request dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Class slots editing state
  const [editingClassSlots, setEditingClassSlots] = useState<Record<string, string[]>>({});
  const [studentDob, setStudentDob] = useState<string | null>(null);
  const [termDataMap, setTermDataMap] = useState<Record<string, Term>>({});
  const [timetableTimeMap, setTimetableTimeMap] = useState<Record<string, { start_time: string; end_time: string }>>({});

  useEffect(() => {
    if (open && invoiceId) {
      loadInvoiceData();
      setMode(initialMode);
    }
  }, [open, invoiceId, initialMode]);

  // When entering edit mode, initialize editingClassSlots from item metadata
  useEffect(() => {
    if (mode === 'edit' && invoice) {
      const slots: Record<string, string[]> = {};
      invoice.items.forEach((item) => {
        const metadata = item.metadata as any;
        if (metadata?.selected_class_slots) {
          slots[item.id] = [...metadata.selected_class_slots];
        }
      });
      setEditingClassSlots(slots);
    }
  }, [mode, invoice]);

  // Fetch student DOB and term data when invoice loads
  useEffect(() => {
    if (!invoice) return;

    // Fetch student DOB
    const fetchStudentDob = async () => {
      const { data } = await supabase
        .from('students')
        .select('date_of_birth')
        .eq('id', invoice.student_id)
        .maybeSingle();
      if (data?.date_of_birth) setStudentDob(data.date_of_birth);
    };

    // Fetch term data for items that have term_id or term_ids in metadata
    const fetchTermData = async () => {
      const termIds = new Set<string>();
      invoice.items.forEach((item) => {
        const metadata = item.metadata as any;
        if (metadata?.term_id) termIds.add(metadata.term_id);
        if (metadata?.term_ids) {
          (metadata.term_ids as string[]).forEach((id: string) => termIds.add(id));
        }
      });
      if (termIds.size === 0) return;

      const termMap: Record<string, Term> = {};
      await Promise.all(
        Array.from(termIds).map(async (id) => {
          const term = await getTerm(id);
          if (term) termMap[id] = term;
        })
      );
      setTermDataMap(termMap);
    };

    // Fetch timetable times for class slot display
    const fetchTimetableTimes = async () => {
      const timetableIds = new Set<string>();
      invoice.items.forEach((item) => {
        const metadata = item.metadata as any;
        if (metadata?.selected_class_slots) {
          (metadata.selected_class_slots as string[]).forEach((slot: string) => {
            const ttId = slot.split('_')[0];
            if (ttId) timetableIds.add(ttId);
          });
        }
      });
      if (timetableIds.size === 0) return;
      const { data: timetables } = await supabase
        .from('branch_timetables')
        .select('id, start_time, end_time')
        .in('id', Array.from(timetableIds));
      if (timetables) {
        const map: Record<string, { start_time: string; end_time: string }> = {};
        timetables.forEach(t => { map[t.id] = { start_time: t.start_time, end_time: t.end_time }; });
        setTimetableTimeMap(map);
      }
    };

    fetchStudentDob();
    fetchTermData();
    fetchTimetableTimes();
  }, [invoice]);

  // Calculate student age
  const studentAge = useMemo(() => {
    if (!studentDob) return 0;
    return differenceInYears(new Date(), parseISO(studentDob));
  }, [studentDob]);

  const loadInvoiceData = async () => {
    setLoading(true);
    try {
      const [invoiceData, paymentsData] = await Promise.all([
        getInvoiceById(invoiceId),
        getPaymentsByInvoice(invoiceId)
      ]);

      if (invoiceData) {
        setInvoice(invoiceData);
        setEditData({
          notes: invoiceData.notes || '',
          internal_notes: invoiceData.internal_notes || '',
          due_date: invoiceData.due_date || '',
          status: invoiceData.status
        });
      }
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!invoice) return;
    
    setSaving(true);
    try {
      // Update status if changed
      if (editData.status !== invoice.status) {
        await updateInvoiceStatus(invoice.id, editData.status);
      }

      // Update other fields
      const { error } = await supabase
        .from('invoices')
        .update({
          notes: editData.notes,
          internal_notes: editData.internal_notes,
          due_date: editData.due_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (error) throw error;

      // Update class slots in invoice_items metadata and sync scheduled classes
      for (const [itemId, slots] of Object.entries(editingClassSlots)) {
        const item = invoice.items.find((i) => i.id === itemId);
        if (!item) continue;
        const existingMetadata = (item.metadata as any) || {};
        const { error: itemError } = await supabase
          .from('invoice_items')
          .update({
            metadata: { ...existingMetadata, selected_class_slots: slots },
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId);
        if (itemError) {
          console.error('Error updating item class slots:', itemError);
          continue;
        }

        // Sync student_scheduled_classes: find enrollment linked to this invoice item
        // First try by invoice_item_id, then fall back to matching by student + term
        let enrollment: { id: string } | null = null;
        const { data: enrollmentByItem } = await supabase
          .from('student_class_enrollments')
          .select('id')
          .eq('invoice_item_id', itemId)
          .maybeSingle();
        
        enrollment = enrollmentByItem;

        // Fallback: find enrollment by student_id + term_id from metadata
        if (!enrollment && invoice.student_id && existingMetadata?.term_id) {
          const { data: enrollmentByTerm } = await supabase
            .from('student_class_enrollments')
            .select('id')
            .eq('student_id', invoice.student_id)
            .eq('term_id', existingMetadata.term_id)
            .eq('status', 'active')
            .maybeSingle();
          enrollment = enrollmentByTerm;
        }

        if (enrollment) {
          // Delete existing scheduled classes that haven't been attended
          await supabase
            .from('student_scheduled_classes')
            .delete()
            .eq('enrollment_id', enrollment.id)
            .in('status', ['scheduled']);

          // Recreate scheduled classes from updated slots
          if (slots.length > 0) {
            const timetableIds = [...new Set(slots.map((s: string) => s.split('_')[0]))];
            const { data: timetables } = await supabase
              .from('branch_timetables')
              .select('id, start_time, end_time')
              .in('id', timetableIds);

            const timetableMap = new Map(timetables?.map(t => [t.id, t]) || []);

            const newClasses = slots
              .map((slot: string) => {
                const [timetableId, date] = slot.split('_');
                const timetable = timetableMap.get(timetableId);
                if (!timetable || !date) return null;
                return {
                  enrollment_id: enrollment.id,
                  timetable_id: timetableId,
                  scheduled_date: date,
                  start_time: timetable.start_time,
                  end_time: timetable.end_time,
                  status: 'scheduled',
                };
              })
              .filter(Boolean);

            if (newClasses.length > 0) {
              const { error: insertError } = await supabase
                .from('student_scheduled_classes')
                .insert(newClasses);
              if (insertError) {
                console.error('Error syncing scheduled classes:', insertError);
              }
            }
          }
        }
      }

      toast.success('Invoice updated successfully');
      setMode('view');
      loadInvoiceData();
      onInvoiceUpdated?.();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setSaving(false);
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'unpaid': return 'destructive';
      case 'draft': return 'destructive'; // Map draft to unpaid styling
      case 'overdue': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid': return 'bg-red-100 text-red-800 border-red-200';
      case 'draft': return 'bg-red-100 text-red-800 border-red-200'; // Map draft to unpaid styling
      default: return '';
    }
  };

  const getDisplayStatus = (status: string) => {
    // Map 'draft' to 'Unpaid' for display
    if (status === 'draft') return 'Unpaid';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-SG');
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Not Found</DialogTitle>
            <DialogDescription>The requested invoice could not be found.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Invoice {invoice.invoice_number}
              </DialogTitle>
              <DialogDescription>
                {invoice.student_name}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={getStatusBadgeVariant(invoice.status)}
                className={getStatusBadgeClass(invoice.status)}
              >
                {getDisplayStatus(invoice.status)}
              </Badge>
              <InvoiceChangeLogDialog
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoice_number}
                trigger={
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                }
              />
              {mode === 'view' ? (
                <Button variant="outline" size="sm" onClick={() => setMode('edit')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setMode('view')}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">
              <FileText className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="items">
              Items ({invoice.items.length})
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments ({payments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Summary Cards */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(invoice.total_amount)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${invoice.balance_due > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(invoice.balance_due)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <div className="text-sm">{formatDate(invoice.issue_date)}</div>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                {mode === 'edit' ? (
                  <Input
                    type="date"
                    value={editData.due_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                ) : (
                  <div className="text-sm">{formatDate(invoice.due_date)}</div>
                )}
              </div>
            </div>

            {mode === 'edit' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editData.status === 'draft' ? 'unpaid' : editData.status}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, status: value as Invoice['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Internal Notes</Label>
              {mode === 'edit' ? (
                <Textarea
                  value={editData.internal_notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, internal_notes: e.target.value }))}
                  rows={3}
                />
              ) : (
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {invoice.internal_notes || 'No internal notes'}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="items" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => {
                  const metadata = item.metadata as any;
                  const classSlots: string[] = mode === 'edit' 
                    ? (editingClassSlots[item.id] || metadata?.selected_class_slots || [])
                    : (metadata?.selected_class_slots || []);
                  const hasClassSlots = classSlots.length > 0 || metadata?.selected_class_slots;
                  const termIds: string[] = metadata?.term_ids || (metadata?.term_id ? [metadata.term_id] : []);

                  return (
                    <React.Fragment key={item.id}>
                      <TableRow>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product_name || item.description}</div>
                            {item.size_variant && (
                              <div className="text-xs text-muted-foreground">Size: {item.size_variant}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.tax_amount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total_amount)}</TableCell>
                      </TableRow>

                      {/* Display class dates */}
                      {hasClassSlots && classSlots.length > 0 && (
                        <TableRow className="border-0 hover:bg-transparent">
                          <TableCell colSpan={5} className="pt-0 pb-2">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-xs font-medium text-muted-foreground mr-1">Selected Dates:</span>
                              {classSlots
                                .map((slot: string) => {
                                  const [timetableId, datePart] = slot.split('_');
                                  if (!datePart) return null;
                                  try {
                                    const tt = timetableTimeMap[timetableId];
                                    return { slot, date: parseISO(datePart), dateStr: datePart, startTime: tt?.start_time, endTime: tt?.end_time };
                                  } catch { return null; }
                                })
                                .filter(Boolean)
                                .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
                                .map((info: any) => {
                                  const timeStr = info.startTime && info.endTime
                                    ? ` ${info.startTime.slice(0, 5)}-${info.endTime.slice(0, 5)}`
                                    : '';
                                  return (
                                    <Badge key={info.slot} variant="secondary" className="text-[10px] px-1.5 py-0.5 flex flex-col items-center leading-tight">
                                      <span>{format(info.date, 'EEE d MMM')}</span>
                                      {info.startTime && info.endTime && (
                                        <span className="text-muted-foreground">{info.startTime.slice(0, 5)}-{info.endTime.slice(0, 5)}</span>
                                      )}
                                    </Badge>
                                  );
                                })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* ClassScheduleSelector in edit mode */}
                      {mode === 'edit' && hasClassSlots && termIds.length > 0 && invoice.branch_id && (
                        <TableRow className="border-0 hover:bg-transparent">
                          <TableCell colSpan={5} className="pt-0 pb-4">
                            <div className="space-y-3">
                              {termIds.map((termId: string) => {
                                const term = termDataMap[termId];
                                if (!term) return null;
                                return (
                                  <div key={termId} className="space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground">{term.name}</div>
                                    <ClassScheduleSelector
                                      branchId={invoice.branch_id!}
                                      studentAge={studentAge}
                                      selectedSlots={editingClassSlots[item.id] || []}
                                      onSlotsChange={(slots) =>
                                        setEditingClassSlots((prev) => ({ ...prev, [item.id]: slots }))
                                      }
                                      term={term}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Paid:</span>
                  <span className="text-green-600">{formatCurrency(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Balance Due:</span>
                  <span className={invoice.balance_due > 0 ? 'text-destructive' : 'text-green-600'}>
                    {formatCurrency(invoice.balance_due)}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No payments recorded</h3>
                <p className="text-muted-foreground mb-4">Record a payment against this invoice</p>
                {invoice.balance_due > 0 && (
                  <CreatePaymentDialog
                    trigger={
                      <Button>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Record Payment
                      </Button>
                    }
                    preSelectedInvoiceId={invoice.id}
                    onPaymentCreated={loadInvoiceData}
                  />
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.payment_number}</TableCell>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.payment_method.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.reference_number || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {payment.proof_of_payment_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="View Uploaded File"
                                asChild
                              >
                                <a href={payment.proof_of_payment_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
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

                {invoice.balance_due > 0 && (
                  <div className="mt-4 flex justify-end">
                    <CreatePaymentDialog
                      trigger={
                        <Button>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Record Another Payment
                        </Button>
                      }
                      preSelectedInvoiceId={invoice.id}
                      onPaymentCreated={loadInvoiceData}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {mode === 'edit' && (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMode('view')}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        )}
      </DialogContent>

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
                  <span className="font-medium text-green-600">{formatCurrency(paymentToDelete.amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-reason">Reason for deletion (optional)</Label>
                <Textarea
                  id="delete-reason"
                  placeholder="Please provide a reason for this deletion request..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSubmitDeleteRequest}
              disabled={isSubmittingDelete}
            >
              {isSubmittingDelete && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default ViewEditInvoiceDialog;
