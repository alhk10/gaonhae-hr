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
import { getProducts, type Product } from '@/services/productService';
import { formatCurrency } from '@/utils/currencyUtils';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Edit, Save, X, Calendar, FileText, CreditCard, DollarSign, History, Trash2, Eye, Plus, Check, ChevronsUpDown, Percent } from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import CreatePaymentDialog from './CreatePaymentDialog';
import InvoiceChangeLogDialog from './InvoiceChangeLogDialog';
import ClassScheduleSelector from '@/components/dashboard/ClassScheduleSelector';
import { getTerm, type Term } from '@/services/termCalendarService';
import { COUNTRY_TAX_RATES } from '@/config/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


interface ViewEditInvoiceDialogProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceUpdated?: () => void;
  initialMode?: 'view' | 'edit';
}

interface EditableItem {
  id: string; // existing item id or temp id for new items
  isNew?: boolean;
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  size_variant?: string;
  metadata?: any;
  category_name?: string;
  is_lesson?: boolean;
  discount_type?: 'percentage' | 'amount';
  discount_value?: number;
}

// Line discount popover component
const LineDiscountPopover: React.FC<{
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  onChange: (type: 'percentage' | 'amount', value: number) => void;
}> = ({ discountType = 'percentage', discountValue = 0, onChange }) => {
  const [open, setOpen] = useState(false);
  const [localType, setLocalType] = useState<'percentage' | 'amount'>(discountType);
  const [localValue, setLocalValue] = useState(discountValue.toString());

  useEffect(() => {
    setLocalType(discountType);
    setLocalValue(discountValue.toString());
  }, [discountType, discountValue]);

  const handleApply = () => {
    onChange(localType, parseFloat(localValue) || 0);
    setOpen(false);
  };

  const displayText = discountValue && discountValue > 0
    ? (discountType === 'percentage' ? `${discountValue}%` : `$${discountValue.toFixed(2)}`)
    : '-';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-8 px-2 text-xs font-normal min-w-[40px]">
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3 space-y-2">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={localType === 'percentage' ? 'default' : 'outline'}
            className="h-7 flex-1"
            onClick={() => setLocalType('percentage')}
          >
            <Percent className="h-3 w-3 mr-1" /> %
          </Button>
          <Button
            type="button"
            size="sm"
            variant={localType === 'amount' ? 'default' : 'outline'}
            className="h-7 flex-1"
            onClick={() => setLocalType('amount')}
          >
            <DollarSign className="h-3 w-3 mr-1" /> $
          </Button>
        </div>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="h-8"
          placeholder={localType === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'}
        />
        <Button type="button" size="sm" className="w-full h-7" onClick={handleApply}>Apply</Button>
      </PopoverContent>
    </Popover>
  );
};

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
  });
  
  // Editable items state
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  
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
      if (!productsLoaded) loadProducts();
    }
  }, [open, invoiceId, initialMode]);

  // When entering edit mode, initialize editItems and editingClassSlots from invoice
  useEffect(() => {
    if (mode === 'edit' && invoice) {
      const items: EditableItem[] = invoice.items.map((item) => {
        const product = products.find(p => p.id === item.product_id);
        const meta = item.metadata as any;
        const lineDiscount = meta?.line_discount;
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name || item.description,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          total_amount: item.total_amount,
          size_variant: item.size_variant,
          metadata: item.metadata,
          category_name: product?.category_name,
          is_lesson: product?.is_lesson,
          discount_type: lineDiscount?.type || 'percentage',
          discount_value: lineDiscount?.value || 0,
        };
      });
      setEditItems(items);

      const slots: Record<string, string[]> = {};
      invoice.items.forEach((item) => {
        const metadata = item.metadata as any;
        if (metadata?.selected_class_slots) {
          slots[item.id] = [...metadata.selected_class_slots];
        }
      });
      setEditingClassSlots(slots);
    }
  }, [mode, invoice, products]);

  // Fetch student DOB and term data when invoice loads
  useEffect(() => {
    if (!invoice) return;

    const fetchStudentDob = async () => {
      const { data } = await supabase
        .from('students')
        .select('date_of_birth')
        .eq('id', invoice.student_id)
        .maybeSingle();
      if (data?.date_of_birth) setStudentDob(data.date_of_birth);
    };

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

  const studentAge = useMemo(() => {
    if (!studentDob) return 0;
    return differenceInYears(new Date(), parseISO(studentDob));
  }, [studentDob]);

  const loadProducts = async () => {
    try {
      const result = await getProducts(1, 1000);
      setProducts(result.products);
      setProductsLoaded(true);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

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

  // Recalculate item totals (with discount)
  const recalcItem = (item: EditableItem): EditableItem => {
    const gross = item.quantity * item.unit_price;
    const discountAmt = item.discount_type === 'percentage'
      ? gross * ((item.discount_value || 0) / 100)
      : (item.discount_value || 0);
    const net = Math.max(0, gross - discountAmt);
    const taxAmt = net * (item.tax_rate / 100);
    return { ...item, tax_amount: taxAmt, total_amount: net + taxAmt };
  };

  // Calculated totals from editItems (with discounts)
  const editTotals = useMemo(() => {
    const subtotal = editItems.reduce((sum, i) => {
      const gross = i.quantity * i.unit_price;
      const discountAmt = i.discount_type === 'percentage'
        ? gross * ((i.discount_value || 0) / 100)
        : (i.discount_value || 0);
      return sum + Math.max(0, gross - discountAmt);
    }, 0);
    const tax = editItems.reduce((sum, i) => sum + i.tax_amount, 0);
    const total = subtotal + tax;
    const amountPaid = invoice?.amount_paid || 0;
    return { subtotal, tax, total, balanceDue: total - amountPaid };
  }, [editItems, invoice?.amount_paid]);

  const handleAddItem = () => {
    const tempId = `new_${Date.now()}`;
    setEditItems(prev => [...prev, {
      id: tempId,
      isNew: true,
      product_id: '',
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 0,
    }]);
  };

  const handleRemoveItem = (itemId: string) => {
    setEditItems(prev => prev.filter(i => i.id !== itemId));
    setEditingClassSlots(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleProductChange = (itemId: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Get branch country for tax rate
    const branchCountry = invoice?.branch_id ? 'Singapore' : 'Singapore'; // default
    const taxRate = product.tax_rate ?? COUNTRY_TAX_RATES[branchCountry] ?? 0;

    setEditItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = {
        ...item,
        product_id: productId,
        product_name: product.name,
        description: product.description || product.name,
        unit_price: product.base_price,
        tax_rate: taxRate,
        category_name: product.category_name,
        is_lesson: product.is_lesson,
      };
      return recalcItem(updated);
    }));
  };

  const handleItemFieldChange = (itemId: string, field: 'quantity' | 'unit_price' | 'size_variant', value: number | string) => {
    setEditItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item, [field]: value };
      return field === 'size_variant' ? updated : recalcItem(updated);
    }));
  };

  const handleItemDiscountChange = (itemId: string, type: 'percentage' | 'amount', value: number) => {
    setEditItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return recalcItem({ ...item, discount_type: type, discount_value: value });
    }));
  };

  const handleSave = async () => {
    if (!invoice) return;
    
    setSaving(true);
    try {
      // 1. Determine which items were removed, changed, or added
      const originalIds = new Set(invoice.items.map(i => i.id));
      const currentIds = new Set(editItems.filter(i => !i.isNew).map(i => i.id));
      const removedIds = [...originalIds].filter(id => !currentIds.has(id));
      
      // Delete removed items and deactivate their entitlements
      if (removedIds.length > 0) {
        // Deactivate entitlements linked to removed invoice items
        await supabase
          .from('entitlements')
          .update({ is_active: false, notes: 'Deactivated - invoice item removed' })
          .in('source_id', removedIds)
          .eq('source_type', 'invoice_item');

        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .in('id', removedIds);
        if (deleteError) throw deleteError;
      }

      // Update existing items
      for (const item of editItems.filter(i => !i.isNew)) {
        const metadata = { ...(item.metadata || {}), ...(editingClassSlots[item.id] ? { selected_class_slots: editingClassSlots[item.id] } : {}) };
        const { error } = await supabase
          .from('invoice_items')
          .update({
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
            metadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // Insert new items
      for (const item of editItems.filter(i => i.isNew)) {
        if (!item.product_id) continue; // skip empty items
        const metadata = editingClassSlots[item.id] ? { selected_class_slots: editingClassSlots[item.id] } : null;
        const { error } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
            metadata,
          });
        if (error) throw error;
      }

      // 2. Update invoice totals (status stays unchanged)
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          notes: editData.notes,
          internal_notes: editData.internal_notes,
          due_date: editData.due_date,
          subtotal: editTotals.subtotal,
          tax_amount: editTotals.tax,
          total_amount: editTotals.total,
          balance_due: editTotals.balanceDue,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // 3. Sync class slots for enrollments (existing logic)
      for (const [itemId, slots] of Object.entries(editingClassSlots)) {
        const item = editItems.find((i) => i.id === itemId);
        if (!item) continue;

        let enrollment: { id: string } | null = null;
        const { data: enrollmentByItem } = await supabase
          .from('student_class_enrollments')
          .select('id')
          .eq('invoice_item_id', itemId)
          .maybeSingle();
        enrollment = enrollmentByItem;

        const existingMetadata = (item.metadata as any) || {};
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
          await supabase
            .from('student_scheduled_classes')
            .delete()
            .eq('enrollment_id', enrollment.id)
            .in('status', ['scheduled']);

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
                  enrollment_id: enrollment!.id,
                  timetable_id: timetableId,
                  scheduled_date: date,
                  start_time: timetable.start_time,
                  end_time: timetable.end_time,
                  status: 'scheduled',
                };
              })
              .filter(Boolean);

            if (newClasses.length > 0) {
              await supabase.from('student_scheduled_classes').insert(newClasses);
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
      case 'draft': return 'destructive';
      case 'overdue': return 'destructive';
      case 'partial': return 'outline';
      case 'verified': return 'default';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid': return 'bg-red-100 text-red-800 border-red-200';
      case 'draft': return 'bg-red-100 text-red-800 border-red-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return '';
    }
  };

  const getDisplayStatus = (status: string) => {
    if (status === 'draft') return 'Unpaid';
    if (status === 'partial') return 'Partial';
    if (status === 'verified') return 'Verified';
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
              Items ({mode === 'edit' ? editItems.length : invoice.items.length})
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments ({payments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(mode === 'edit' ? editTotals.total : invoice.total_amount)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${(mode === 'edit' ? editTotals.balanceDue : invoice.balance_due) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(mode === 'edit' ? editTotals.balanceDue : invoice.balance_due)}
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

            {/* Status is always read-only - shown as badge in header */}

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
            {mode === 'edit' ? (
              <>
                {/* Editable items */}
                <div className="space-y-3">
                  {editItems.map((item, index) => {
                    const metadata = item.metadata as any;
                    const isClassItem = item.category_name === 'Classes' || item.is_lesson;
                    const termIds: string[] = metadata?.term_ids || (metadata?.term_id ? [metadata.term_id] : []);
                    const classSlots = editingClassSlots[item.id] || [];

                    return (
                      <div key={item.id} className="border rounded-lg p-3 space-y-3">
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <Label className="text-xs">Product</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10 text-sm">
                                  {item.product_id
                                    ? (products.find(p => p.id === item.product_id)?.name || 'Select product...')
                                    : 'Select product...'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search products..." />
                                  <CommandList>
                                    <CommandEmpty>No product found.</CommandEmpty>
                                    <CommandGroup>
                                      {products.filter(p => p.is_active).map(p => (
                                        <CommandItem
                                          key={p.id}
                                          value={p.name}
                                          onSelect={() => handleProductChange(item.id, p.id)}
                                        >
                                          <Check className={cn("mr-2 h-4 w-4", item.product_id === p.id ? "opacity-100" : "opacity-0")} />
                                          <div className="flex flex-col">
                                            <span>{p.name}</span>
                                            <span className="text-xs text-muted-foreground">{formatCurrency(p.base_price)}</span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleItemFieldChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Unit Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.unit_price}
                              onChange={(e) => handleItemFieldChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-span-2 text-right">
                            <Label className="text-xs">Total</Label>
                            <div className="text-sm font-medium pt-2">
                              {formatCurrency(item.total_amount)}
                            </div>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Class Schedule Selector for class items */}
                        {isClassItem && termIds.length > 0 && invoice.branch_id && (
                          <div className="space-y-3 pt-2 border-t">
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
                                    allowedClassTypes={products.find(p => p.id === item.product_id)?.allowed_class_types}
                                    allowedDays={products.find(p => p.id === item.product_id)?.lesson_days}
                                    lessonsPerWeek={products.find(p => p.id === item.product_id)?.lessons_per_week}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Show selected class dates as badges */}
                        {classSlots.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-xs font-medium text-muted-foreground mr-1">Selected Dates:</span>
                            {classSlots
                              .map((slot: string) => {
                                const [timetableId, datePart] = slot.split('_');
                                if (!datePart) return null;
                                try {
                                  const tt = timetableTimeMap[timetableId];
                                  return { slot, date: parseISO(datePart), startTime: tt?.start_time, endTime: tt?.end_time };
                                } catch { return null; }
                              })
                              .filter(Boolean)
                              .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
                              .map((info: any) => (
                                <Badge key={info.slot} variant="secondary" className="text-[10px] px-1.5 py-0.5 flex flex-col items-center leading-tight">
                                  <span>{format(info.date, 'EEE d MMM')}</span>
                                  {info.startTime && info.endTime && (
                                    <span className="text-muted-foreground">{info.startTime.slice(0, 5)}-{info.endTime.slice(0, 5)}</span>
                                  )}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button variant="outline" className="w-full mt-3" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>

                <Separator className="my-4" />

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(editTotals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>{formatCurrency(editTotals.tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(editTotals.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Paid:</span>
                      <span className="text-green-600">{formatCurrency(invoice.amount_paid)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Balance Due:</span>
                      <span className={editTotals.balanceDue > 0 ? 'text-destructive' : 'text-green-600'}>
                        {formatCurrency(editTotals.balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* View mode - original table */}
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
                      const classSlots: string[] = metadata?.selected_class_slots || [];
                      const hasClassSlots = classSlots.length > 0;

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

                          {hasClassSlots && (
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
                                        return { slot, date: parseISO(datePart), startTime: tt?.start_time, endTime: tt?.end_time };
                                      } catch { return null; }
                                    })
                                    .filter(Boolean)
                                    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
                                    .map((info: any) => (
                                      <Badge key={info.slot} variant="secondary" className="text-[10px] px-1.5 py-0.5 flex flex-col items-center leading-tight">
                                        <span>{format(info.date, 'EEE d MMM')}</span>
                                        {info.startTime && info.endTime && (
                                          <span className="text-muted-foreground">{info.startTime.slice(0, 5)}-{info.endTime.slice(0, 5)}</span>
                                        )}
                                      </Badge>
                                    ))}
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
              </>
            )}
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
