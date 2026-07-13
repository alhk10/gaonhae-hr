/**
 * Unified Invoice Dialog Component
 * Handles create, view, edit, adjust, and refund workflows.
 * Based on CreateInvoiceDialog layout, extended with view/edit/refund capabilities.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { hasClassTypeException } from '@/utils/classTypeEligibility';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createInvoice, getSiblingDiscount, getInvoiceById, cancelInvoice, syncGradingRegistrationsForInvoice, type CreateInvoiceData, type Invoice, type InvoiceItem as ServiceInvoiceItem } from '@/services/invoiceService';
import { useQueryClient } from '@tanstack/react-query';
import { getStudentCreditBalance, applyCredit } from '@/services/studentCreditService';
import { createPayment, getPaymentsByInvoice, type Payment } from '@/services/paymentService';
import { getStudents } from '@/services/studentService';
import { getProducts, getProductCategories } from '@/services/productService';
import { getGradingSlots, type GradingSlot } from '@/services/gradingService';
import { submitActionRequest } from '@/services/invoiceActionRequestService';
import { createDeletionRequest } from '@/services/paymentDeletionRequestService';
import { refundLineItem, submitRefundRequest } from '@/services/invoiceRefundService';
import { supabase } from '@/integrations/supabase/client';
import { useInvoiceAccess } from '@/hooks/useInvoiceAccess';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTotalDiscount, submitDiscountApproval, DISCOUNT_APPROVAL_THRESHOLD } from '@/services/invoiceDiscountApprovalService';
import { Loader2, Plus, Trash2, Check, ChevronsUpDown, Percent, DollarSign, Save, X, History, Ban, Wrench, Eye, CreditCard, Undo2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { COUNTRY_TAX_RATES, DEFAULT_TAX_RATE, COUNTRY_TAX_INCLUDED, DEFAULT_TAX_INCLUDED } from '@/config/constants';
import type { Term } from '@/services/termCalendarService';
import { getTerm, getTerms } from '@/services/termCalendarService';
import ClassScheduleSelector from '@/components/dashboard/ClassScheduleSelector';
import CreatePaymentDialog from './CreatePaymentDialog';
import InvoiceChangeLogDialog from './InvoiceChangeLogDialog';
import { differenceInYears, differenceInMonths, format, parseISO } from 'date-fns';
import { formatCurrency } from '@/utils/currencyUtils';
import { createEnrollment, createScheduledClass } from '@/services/classEnrollmentService';
import { logInvoiceChange } from '@/services/invoiceChangeLogService';
import { formatDate } from '@/utils/dateFormat';
import { DatePicker } from '@/components/ui/date-picker';

// ─── Props ──────────────────────────────────────────────────────────
interface InvoiceDialogProps {
  mode: 'create' | 'view' | 'edit';
  trigger?: React.ReactNode;
  invoiceId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onInvoiceCreated?: () => void;
  onInvoiceUpdated?: () => void;
  branchId?: string;
  prefilledStudentId?: string;
}

// ─── Types ──────────────────────────────────────────────────────────
interface InvoiceItem {
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  size_variant?: string;
  color_variant?: string;
  term_id?: string;
  term_name?: string;
  grading_slot_id?: string;
  grading_slot_title?: string;
  selected_class_slots?: string[];
  discount_type?: 'percentage' | 'amount';
  discount_value?: number;
  total: number;
}

interface ProductWithVariants {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  category_id?: string;
  available_variants?: { sizes?: string[]; colors?: string[] };
  available_sizes?: string[];
  requires_size?: boolean;
  requires_belt_level?: boolean;
  allowed_belt_levels?: string[];
  allowed_class_types?: string[];
  lesson_days?: string[];
  lessons_per_week?: number;
  min_age?: number | null;
  max_age?: number | null;
}

interface EditableItem {
  id: string;
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
  color_variant?: string;
  metadata?: any;
  category_name?: string;
  is_lesson?: boolean;
  discount_type?: 'percentage' | 'amount';
  discount_value?: number;
}

// ─── Constants ──────────────────────────────────────────────────────
const GRADING_CATEGORY_ID = '31514844-78dc-43f2-bf07-41d124d175e2';
const GRADING_DUPLICATE_CHECK_DAYS = 60;
const UNIFORMS_CATEGORY_ID = 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c';

// ─── Helpers ────────────────────────────────────────────────────────
function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const years = differenceInYears(today, dob);
  const monthsAfterBirthday = differenceInMonths(today, dob) % 12;
  return years + (monthsAfterBirthday / 12);
}

const normalizeBelt = (belt: string): string => {
  if (!belt) return '';
  return belt.split(/[-\s]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const isProductAvailableForBelt = (product: ProductWithVariants, studentBelt: string): boolean => {
  if (!product.requires_belt_level) return true;
  if (!product.allowed_belt_levels || product.allowed_belt_levels.length === 0) return true;
  const normalizedStudentBelt = normalizeBelt(studentBelt);
  if (!normalizedStudentBelt) return true;
  return product.allowed_belt_levels.includes(normalizedStudentBelt);
};

const isGradingProductForBelt = (productName: string, studentBelt: string): boolean => {
  if (!studentBelt) return true;
  const normalizedBelt = normalizeBelt(studentBelt);
  if (!normalizedBelt) return true;
  const parts = productName.split('>>').map(p => p.trim());
  if (parts.length !== 2) return true;
  return normalizeBelt(parts[0]) === normalizedBelt;
};

const fuzzyMatch = (target: string, query: string): boolean => {
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
};

const calculateLineTotal = (qty: number, price: number, discountType?: 'percentage' | 'amount', discountValue?: number): number => {
  const gross = qty * price;
  if (!discountType || !discountValue || discountValue <= 0) return gross;
  if (discountType === 'percentage') return gross - (gross * discountValue / 100);
  return gross - discountValue;
};

// ─── Sub-components ─────────────────────────────────────────────────
const StudentSearchSelect: React.FC<{
  students: Array<{id: string, name: string, status?: string}>;
  value: string;
  onValueChange: (value: string) => void;
  container?: HTMLElement | null;
  loading?: boolean;
}> = ({ students, value, onValueChange, container, loading }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedName = students.find(s => s.id === value)?.name;
  const filtered = search.trim() ? students.filter(s => fuzzyMatch(s.name, search.trim())) : students;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={loading} className="w-full justify-between font-normal">
          {selectedName || <span className="text-muted-foreground">{loading ? 'Loading students...' : 'Select student'}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 max-h-[60vh] overflow-hidden" style={{ width: 'var(--radix-popover-trigger-width)' }} container={container}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search student..." value={search} onValueChange={setSearch} />
          <CommandList className="max-h-[300px] overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
            <CommandEmpty>No student found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((student) => (
                <CommandItem key={student.id} value={student.id} onSelect={() => { onValueChange(student.id); setOpen(false); setSearch(''); }}>
                  <Check className={cn('mr-2 h-4 w-4', value === student.id ? 'opacity-100' : 'opacity-0')} />
                  {student.name}
                  {student.status === 'trial' && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">Trial</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const ProductSearchSelect: React.FC<{
  products: ProductWithVariants[];
  value: string;
  onValueChange: (value: string) => void;
  outOfCriteriaIds?: Set<string>;
  container?: HTMLElement | null;
  onAddNew?: () => void;
}> = ({ products, value, onValueChange, outOfCriteriaIds, container, onAddNew }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedName = products.find(p => p.id === value)?.name;
  const baseFiltered = search.trim()
    ? products.filter(p => fuzzyMatch(p.name, search.trim()) || fuzzyMatch(p.sku, search.trim()) || p.allowed_class_types?.some(ct => fuzzyMatch(ct, search.trim())))
    : products;
  // Eligible items first, exception items at the bottom
  const filtered = [...baseFiltered].sort((a, b) => {
    const aEx = outOfCriteriaIds?.has(a.id) ? 1 : 0;
    const bEx = outOfCriteriaIds?.has(b.id) ? 1 : 0;
    return aEx - bEx;
  });

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-8 w-32 justify-between font-normal text-xs px-2">
          {selectedName ? <span className="truncate">{selectedName}</span> : <span className="text-muted-foreground">Product</span>}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 max-h-[60vh] overflow-hidden" container={container}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search product..." value={search} onValueChange={setSearch} />
          <CommandList
            className="max-h-[300px] overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <CommandEmpty>No products available for this branch.</CommandEmpty>
            <CommandGroup>
              {filtered.map((product) => (
                <CommandItem key={product.id} value={product.id} onSelect={() => { onValueChange(product.id); setOpen(false); setSearch(''); }}>
                  <Check className={cn('mr-2 h-4 w-4', value === product.id ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col">
                    <span>{product.name}{outOfCriteriaIds?.has(product.id) ? <span className="ml-1 text-xs text-destructive font-medium">(exception)</span> : null}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {onAddNew && (
              <CommandGroup>
                <CommandItem
                  value="__add_new_product__"
                  onSelect={() => { setOpen(false); setSearch(''); onAddNew(); }}
                  className="text-primary font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new product
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const LineDiscountPopover: React.FC<{
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  onChange: (type: 'percentage' | 'amount', value: number) => void;
}> = ({ discountType = 'percentage', discountValue = 0, onChange }) => {
  const [open, setOpen] = useState(false);
  const [localType, setLocalType] = useState<'percentage' | 'amount'>(discountType);
  const [localValue, setLocalValue] = useState(discountValue.toString());

  useEffect(() => { setLocalType(discountType); setLocalValue(discountValue.toString()); }, [discountType, discountValue]);

  const handleApply = () => { onChange(localType, parseFloat(localValue) || 0); setOpen(false); };
  const displayText = discountValue && discountValue > 0
    ? (discountType === 'percentage' ? `${discountValue}%` : `$${discountValue.toFixed(2)}`)
    : '-';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-8 px-2 text-xs font-normal min-w-[40px]">{displayText}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3 space-y-2">
        <div className="flex gap-1">
          <Button type="button" size="sm" variant={localType === 'percentage' ? 'default' : 'outline'} className="h-7 flex-1" onClick={() => setLocalType('percentage')}><Percent className="h-3 w-3 mr-1" /> %</Button>
          <Button type="button" size="sm" variant={localType === 'amount' ? 'default' : 'outline'} className="h-7 flex-1" onClick={() => setLocalType('amount')}><DollarSign className="h-3 w-3 mr-1" /> $</Button>
        </div>
        <Input type="number" min="0" step="0.01" value={localValue} onChange={(e) => setLocalValue(e.target.value)} className="h-8" placeholder={localType === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'} />
        <Button type="button" size="sm" className="w-full h-7" onClick={handleApply}>Apply</Button>
      </PopoverContent>
    </Popover>
  );
};

// ─── Main Component ─────────────────────────────────────────────────
const InvoiceDialog: React.FC<InvoiceDialogProps> = ({
  mode: initialMode,
  trigger,
  invoiceId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onInvoiceCreated,
  onInvoiceUpdated,
  branchId: lockedBranchId,
  prefilledStudentId,
}) => {
  const { user, userrole } = useAuth();
  const isSuperadmin = userrole === 'superadmin';

  // ─── Shared State ───────────────────────────────────────────────
  const [internalOpen, setInternalOpen] = useState(false);
  const isCreateMode = initialMode === 'create';
  const isControlled = externalOpen !== undefined;
  const dialogOpen = isControlled ? !!externalOpen : internalOpen;
  const setDialogOpen = isControlled
    ? (v: boolean) => externalOnOpenChange?.(v)
    : (v: boolean) => { setInternalOpen(v); externalOnOpenChange?.(v); };

  const [mode, setMode] = useState<'create' | 'view' | 'edit'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // ─── Shared Data ────────────────────────────────────────────────
  const [students, setStudents] = useState<Array<{id: string, name: string, email: string, branch_id?: string, status?: string, current_belt?: string, date_of_birth?: string, allowed_class_types?: string[]}>>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [viewProducts, setViewProducts] = useState<Array<{id: string, name: string, sku: string, base_price: number, category_name?: string, is_lesson?: boolean, is_active?: boolean, tax_rate?: number, available_sizes?: string[], available_variants?: any, allowed_class_types?: string[], lesson_days?: string[], lessons_per_week?: number}>>([]);
  const [branches, setBranches] = useState<Array<{id: string, name: string, country: string | null}>>([]);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set());
  const [branchAvailableProductIds, setBranchAvailableProductIds] = useState<Set<string> | null>(null);
  const { accessibleBranches, isSuperadmin: isSuperadminAccess, canCreate } = useInvoiceAccess();

  // ─── Create Mode State ──────────────────────────────────────────
  const [studentStatusFilter, setStudentStatusFilter] = useState<'active' | 'trial' | 'all'>('active');
  const [selectedClassSlots, setSelectedClassSlots] = useState<string[]>([]);
  const [branchTerms, setBranchTerms] = useState<Term[]>([]);
  const [termLoading, setTermLoading] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);
  const [gradingSlots, setGradingSlots] = useState<GradingSlot[]>([]);
  const [gradingSlotsLoading, setGradingSlotsLoading] = useState(false);
  
  const [taxIncluded, setTaxIncluded] = useState<boolean | null>(null);
  const taxManuallySet = useRef(false);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const [dialogContentEl, setDialogContentEl] = useState<HTMLElement | null>(null);

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [formData, setFormData] = useState({ student_id: '', branch_id: '', notes: '', issue_date: todayISO() });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItem, setNewItem] = useState({ product_id: '', category_id: '', quantity: 1, unit_price: 0, size_variant: '', color_variant: '', term_id: '', grading_slot_id: '' });

  // ─── View/Edit Mode State ──────────────────────────────────────
  const [invoice, setInvoice] = useState<(Invoice & { items: ServiceInvoiceItem[] }) | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [editingClassSlots, setEditingClassSlots] = useState<Record<string, string[]>>({});
  const [termDataMap, setTermDataMap] = useState<Record<string, Term>>({});
  const [timetableTimeMap, setTimetableTimeMap] = useState<Record<string, { start_time: string; end_time: string }>>({});
  const [studentDob, setStudentDob] = useState<string | null>(null);
  const [viewStudentAllowedClassTypes, setViewStudentAllowedClassTypes] = useState<string[] | undefined>(undefined);
  const [editIssueDate, setEditIssueDate] = useState<string>(''); // YYYY-MM-DD, superadmin edits

  // Sub-dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Refund state
  const [refundItemId, setRefundItemId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // Grading prerequisite override (superadmin) state
  const [prerequisiteOverrideOpen, setPrerequisiteOverrideOpen] = useState(false);
  const prerequisiteOverriddenRef = useRef(false);

  const isPaidOrVerified = invoice?.status === 'paid' || invoice?.status === 'verified' || (invoice?.status as string) === 'partially_paid';
  const isCancelled = invoice?.status === 'cancelled';

  // ─── Effects ────────────────────────────────────────────────────
  // Preload reference data once when component mounts (create mode only)
  useEffect(() => {
    if (!isCreateMode) return;
    loadStudents();
    loadProducts();
    loadBranches();
    loadCategories();
    loadGradingSlots();
  }, [isCreateMode]);

  // On dialog open: just apply locked branch + load view data for view/edit
  useEffect(() => {
    if (!dialogOpen) return;
    if (isCreateMode) {
      if (lockedBranchId) {
        setFormData(prev => ({ ...prev, branch_id: lockedBranchId }));
        loadBranchTerms(lockedBranchId);
      }
      if (prefilledStudentId) {
        setFormData(prev => ({ ...prev, student_id: prefilledStudentId }));
        setStudentStatusFilter('all');
      }
    } else {
      setMode(initialMode);
      loadInvoiceData();
      loadViewProducts();
      // Load branches so edit-mode tax-inclusive detection works
      if (branches.length === 0) loadBranches();
      // Load grading slots so the slot dropdown populates in edit/adjust mode
      if (gradingSlots.length === 0) loadGradingSlots();
    }
  }, [dialogOpen]);

  // Auto-select branch
  const availableBranches = branches
    .filter(b => !['Competition', 'Headquarters'].includes(b.name))
    .filter(b => isSuperadminAccess || canCreate(b.id));

  useEffect(() => {
    if (isCreateMode && availableBranches.length === 1 && !formData.branch_id) {
      handleInputChange('branch_id', availableBranches[0].id);
    }
  }, [availableBranches.length, formData.branch_id]);

  // Apply country-default tax mode when branch is set (covers locked-branch flow)
  useEffect(() => {
    if (!isCreateMode) return;
    if (taxManuallySet.current) return;
    if (!formData.branch_id || branches.length === 0) return;
    const selectedBranch = branches.find(b => b.id === formData.branch_id);
    const country = selectedBranch?.country || null;
    setTaxIncluded(country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED);
  }, [formData.branch_id, branches, isCreateMode]);

  // Fetch hidden products + branch-available products
  useEffect(() => {
    const branchId = isCreateMode ? formData.branch_id : invoice?.branch_id;
    if (!branchId) {
      setHiddenProductIds(new Set());
      setBranchAvailableProductIds(null);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('price_rules')
          .select('product_id, branch_id, is_active');
        if (error) throw error;
        const rules = data || [];

        // Hidden = explicit inactive override at this branch
        const hidden = new Set<string>(
          rules.filter(r => r.branch_id === branchId && r.is_active === false).map(r => r.product_id)
        );
        setHiddenProductIds(hidden);

        // Branch-available logic:
        // price_rules are per-branch price overrides, not availability gates.
        // A product is available at every branch unless explicitly hidden via
        // an inactive rule for that specific branch.
        // Source list depends on mode: create uses `products`, edit/view uses `viewProducts`.
        const sourceList = isCreateMode ? products : viewProducts;
        if (sourceList.length === 0) {
          setBranchAvailableProductIds(null);
          return;
        }
        const available = new Set<string>();
        for (const p of sourceList) {
          if (hidden.has(p.id)) continue;
          available.add(p.id);
        }
        setBranchAvailableProductIds(available);
      } catch {
        setHiddenProductIds(new Set());
        setBranchAvailableProductIds(null);
      }
    })();
  }, [formData.branch_id, invoice?.branch_id, products, viewProducts, isCreateMode]);

  // When entering edit mode, initialize from invoice
  useEffect(() => {
    if (mode === 'edit' && invoice && viewProducts.length > 0) {
      const items: EditableItem[] = invoice.items.map((item) => {
        const product = viewProducts.find(p => p.id === item.product_id);
        const meta = item.metadata as any;
        const lineDiscount = meta?.line_discount;
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name || item.description,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate > 1 ? item.tax_rate / 100 : item.tax_rate,
          tax_amount: item.tax_amount,
          total_amount: item.total_amount,
          size_variant: item.size_variant,
          color_variant: meta?.color_variant || '',
          metadata: item.metadata,
          category_name: product?.category_name,
          is_lesson: product?.is_lesson,
          discount_type: lineDiscount?.type || 'percentage',
          discount_value: lineDiscount?.value || 0,
        };
      });
      setEditItems(items.map(recalcItem));

      const slots: Record<string, string[]> = {};
      invoice.items.forEach((item) => {
        const metadata = item.metadata as any;
        if (metadata?.selected_class_slots) slots[item.id] = [...metadata.selected_class_slots];
      });
      setEditingClassSlots(slots);
      setEditIssueDate(invoice.issue_date || '');
    }
  }, [mode, invoice, viewProducts, branches]);

  // Load term data and timetable times when invoice loads (view/edit)
  useEffect(() => {
    if (!invoice) return;
    // Student DOB and allowed_class_types
    (async () => {
      const { data } = await supabase.from('students').select('date_of_birth, allowed_class_types').eq('id', invoice.student_id).maybeSingle();
      if (data?.date_of_birth) setStudentDob(data.date_of_birth);
      if (data?.allowed_class_types) setViewStudentAllowedClassTypes(data.allowed_class_types as string[]);
    })();
    // Term data
    (async () => {
      const termIds = new Set<string>();
      invoice.items.forEach((item) => {
        const meta = item.metadata as any;
        if (meta?.term_id) termIds.add(meta.term_id);
        if (meta?.term_ids) (meta.term_ids as string[]).forEach(id => termIds.add(id));
      });
      if (termIds.size === 0) return;
      const map: Record<string, Term> = {};
      await Promise.all(Array.from(termIds).map(async (id) => { const t = await getTerm(id); if (t) map[id] = t; }));
      setTermDataMap(map);
    })();
    // Timetable times
    (async () => {
      const ids = new Set<string>();
      invoice.items.forEach((item) => {
        const meta = item.metadata as any;
        if (meta?.selected_class_slots) (meta.selected_class_slots as string[]).forEach(s => { const id = s.split('_')[0]; if (id) ids.add(id); });
      });
      if (ids.size === 0) return;
      const { data } = await supabase.from('branch_timetables').select('id, start_time, end_time').in('id', Array.from(ids));
      if (data) {
        const map: Record<string, { start_time: string; end_time: string }> = {};
        data.forEach(t => { map[t.id] = { start_time: t.start_time, end_time: t.end_time }; });
        setTimetableTimeMap(map);
      }
    })();
    // Branch terms
    if (invoice.branch_id) {
      getTerms(invoice.branch_id).then(terms => setBranchTerms(terms)).catch(() => {});
    }
  }, [invoice]);

  const studentAge = useMemo(() => {
    if (isCreateMode) {
      const sel = students.find(s => s.id === formData.student_id);
      if (!sel?.date_of_birth) return 0;
      return calculateAge(sel.date_of_birth);
    }
    if (!studentDob) return 0;
    return differenceInYears(new Date(), parseISO(studentDob));
  }, [isCreateMode, formData.student_id, students, studentDob]);

  // ─── Data Loaders ─────────────────────────────────────────────
  const loadStudents = async () => {
    try {
      const response = await getStudents(1, 1000);
      setStudents(response.students.map(s => ({
        id: s.id,
        name: s.display_name || `${s.first_name} ${s.last_name}`,
        email: s.email || '',
        branch_id: s.branch_id,
        status: s.status,
        current_belt: s.current_belt,
        date_of_birth: s.date_of_birth,
        allowed_class_types: (s as any).allowed_class_types || undefined
      })));
    } catch { toast.error('Failed to load students'); }
  };

  const loadProducts = async () => {
    try {
      const response = await getProducts(1, 1000);
      setProducts(response.products.map(p => ({
        id: p.id, name: p.name, sku: p.sku, base_price: p.base_price,
        category_id: p.category_id, available_variants: p.available_variants,
        available_sizes: p.available_sizes, requires_size: p.requires_size,
        requires_belt_level: p.requires_belt_level, allowed_belt_levels: p.allowed_belt_levels,
        allowed_class_types: p.allowed_class_types, lesson_days: p.lesson_days,
        lessons_per_week: p.lessons_per_week, min_age: p.min_age, max_age: p.max_age
      })));
    } catch { toast.error('Failed to load products'); }
  };

  const loadViewProducts = async () => {
    try {
      const result = await getProducts(1, 1000);
      setViewProducts(result.products);
    } catch { console.error('Error loading products'); }
  };

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase.from('branches').select('id, name, country').order('name');
      if (error) throw error;
      setBranches(data || []);
    } catch { console.error('Error loading branches'); }
  };

  const loadCategories = async () => {
    try { setCategories(await getProductCategories()); } catch { console.error('Error loading categories'); }
  };

  const loadGradingSlots = async () => {
    setGradingSlotsLoading(true);
    try {
      // Include slots from the past 60 days so staff can still link an invoice
      // to a recent grading event when payment lags the actual grading day.
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - GRADING_DUPLICATE_CHECK_DAYS);
      const fromDateStr = fromDate.toISOString().split('T')[0];
      setGradingSlots(await getGradingSlots({ status: 'active', from_date: fromDateStr }));
    } catch { console.error('Error loading grading slots'); }
    finally { setGradingSlotsLoading(false); }
  };

  const loadBranchTerms = async (branchId: string) => {
    if (!branchId) { setBranchTerms([]); return; }
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from('term_calendars').select('*').eq('branch_id', branchId).eq('is_active', true).gte('end_date', today).order('start_date', { ascending: true });
      if (error) throw error;
      setBranchTerms((data || []) as Term[]);
    } catch (error: any) {
      if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) setTermError('Session expired. Please refresh the page.');
      setBranchTerms([]);
    }
  };


  const loadInvoiceData = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const [invoiceData, paymentsData] = await Promise.all([
        getInvoiceById(invoiceId),
        getPaymentsByInvoice(invoiceId)
      ]);
      if (invoiceData) setInvoice(invoiceData);
      setPayments(paymentsData);
    } catch {
      toast.error('Failed to load invoice details');
    } finally { setLoading(false); }
  };

  // ─── Create Mode Logic ─────────────────────────────────────────
  const filteredStudents = students.filter(s => {
    const matchesStatus = studentStatusFilter === 'all' ? (s.status === 'active' || s.status === 'trial') : s.status === studentStatusFilter;
    const matchesBranch = !formData.branch_id || s.branch_id === formData.branch_id;
    return matchesStatus && matchesBranch;
  }).sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (isCreateMode && filteredStudents.length === 1 && !formData.student_id) {
      handleInputChange('student_id', filteredStudents[0].id);
    }
  }, [filteredStudents.length, formData.student_id, formData.branch_id]);

  const selectedStudent = students.find(s => s.id === formData.student_id);
  const studentBelt = selectedStudent?.current_belt || '';
  const studentAllowedClassTypes = selectedStudent?.allowed_class_types;

  const handleInputChange = async (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'branch_id') {
      setSelectedClassSlots([]);
      loadBranchTerms(value);
      if (!taxManuallySet.current) {
        const selectedBranch = branches.find(b => b.id === value);
        const country = selectedBranch?.country || null;
        setTaxIncluded(country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED);
      }
    }
  };

  const getBranchPrice = async (productId: string, branchId: string): Promise<number | null> => {
    if (!productId || !branchId) return null;
    try {
      const { data, error } = await supabase.from('price_rules').select('price_override, is_active').eq('product_id', productId).eq('branch_id', branchId).eq('is_active', true).maybeSingle();
      if (error || !data) return null;
      return data.price_override;
    } catch { return null; }
  };

  const checkExistingGradingInvoice = async (studentId: string, productId: string) => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - GRADING_DUPLICATE_CHECK_DAYS);
    try {
      const { data, error } = await supabase.from('invoice_items').select('product_id, products!inner(name, category_id), invoices!inner(student_id, created_at, status)').eq('product_id', productId).eq('invoices.student_id', studentId).neq('invoices.status', 'cancelled').gte('invoices.created_at', sixtyDaysAgo.toISOString());
      if (error || !data || data.length === 0) return { exists: false };
      const invoiceData = data[0].invoices as unknown as { created_at: string };
      const productData = data[0].products as unknown as { name: string };
      return { exists: true, productName: productData?.name, createdAt: invoiceData?.created_at };
    } catch { return { exists: false }; }
  };

  // Grading slots filtered
  const getFilteredGradingSlots = (): GradingSlot[] => {
    let filtered = gradingSlots;
    if (formData.branch_id) filtered = filtered.filter(s => s.branch_id === formData.branch_id || (s.available_branch_ids && s.available_branch_ids.includes(formData.branch_id)));
    if (studentBelt) {
      const n = normalizeBelt(studentBelt);
      filtered = filtered.filter(s => s.belt_levels?.some(b => normalizeBelt(b) === n));
    }
    if (studentAge > 0) filtered = filtered.filter(s => (s.min_age == null || studentAge >= s.min_age) && (s.max_age == null || studentAge <= s.max_age));
    return filtered;
  };

  // Filtered products
  const filteredProducts = products.filter(p => {
    const matchesCategory = !newItem.category_id || p.category_id === newItem.category_id;
    const notHidden = !hiddenProductIds.has(p.id);
    const branchId = isCreateMode ? formData.branch_id : invoice?.branch_id;
    // If we have branch context AND availability data loaded, restrict to branch pool.
    const availableInBranch = !branchId || branchAvailableProductIds === null
      ? true
      : branchAvailableProductIds.has(p.id);
    const isGrading = p.category_id === GRADING_CATEGORY_ID;
    const matchesGrading = !isGrading || !formData.student_id || isGradingProductForBelt(p.name, studentBelt);
    return matchesCategory && matchesGrading && notHidden && availableInBranch;
  });

  const outOfCriteriaProductIds = useMemo(() => {
    if (!formData.student_id) return new Set<string>();
    const ids = new Set<string>();
    for (const p of products) {
      if (p.category_id === GRADING_CATEGORY_ID) continue;
      // Only consider products available at the current branch (if known)
      if (branchAvailableProductIds && !branchAvailableProductIds.has(p.id)) continue;
      const beltOk = isProductAvailableForBelt(p, studentBelt);
      const productAgeOk = studentAge <= 0 || ((p.min_age == null || studentAge >= p.min_age) && (p.max_age == null || studentAge <= p.max_age));
      if (!beltOk || !productAgeOk) ids.add(p.id);
    }
    return ids;
  }, [products, formData.student_id, studentBelt, studentAge, branchAvailableProductIds]);

  // Auto-select product
  useEffect(() => {
    if (isCreateMode && newItem.category_id && filteredProducts.length === 1 && !newItem.product_id) {
      handleProductChangeCreate(filteredProducts[0].id);
    }
  }, [filteredProducts.length, newItem.category_id, newItem.product_id]);

  // Auto-select term
  useEffect(() => {
    if (isCreateMode) {
      const categoryName = categories.find(c => c.id === newItem.category_id)?.name;
      if (categoryName === 'Classes' && branchTerms.length === 1 && !newItem.term_id) handleNewItemChange('term_id', branchTerms[0].id);
    }
  }, [branchTerms.length, newItem.category_id, newItem.term_id, categories]);

  // Auto-select grading slot
  useEffect(() => {
    if (isCreateMode) {
      const categoryName = categories.find(c => c.id === newItem.category_id)?.name;
      const filtered = getFilteredGradingSlots();
      if (categoryName === 'Grading' && filtered.length === 1 && !newItem.grading_slot_id) handleNewItemChange('grading_slot_id', filtered[0].id);
    }
  }, [gradingSlots, formData.branch_id, studentBelt, newItem.category_id, newItem.grading_slot_id, categories]);

  const selectedProduct = products.find(p => p.id === newItem.product_id);
  const sizeOptions = selectedProduct?.available_variants?.sizes?.length ? selectedProduct.available_variants.sizes : (selectedProduct?.available_sizes || []);
  const colorOptions = selectedProduct?.available_variants?.colors || [];
  const selectedCategory = categories.find(c => c.id === newItem.category_id);
  const isUniformProduct = selectedProduct?.category_id === UNIFORMS_CATEGORY_ID;
  const showSizeInput = sizeOptions.length > 0 || selectedProduct?.requires_size || isUniformProduct;

  const handleCategoryChange = async (categoryId: string) => {
    let defaultQuantity = 1;
    let selectedTermId = '';
    setTermError(null);
    setSelectedClassSlots([]);
    const category = categories.find(c => c.id === categoryId);
    const selectedBranch = branches.find(b => b.id === formData.branch_id);
    if (category?.name === 'Classes') {
      if (selectedBranch?.country === 'Singapore') defaultQuantity = 12;
      else if (selectedBranch?.country === 'Australia') defaultQuantity = 10;
      if (formData.branch_id && branchTerms.length === 0) await loadBranchTerms(formData.branch_id);
      if (formData.branch_id && formData.student_id) selectedTermId = await refreshTermSelection(formData.branch_id, formData.student_id);
    }
    setNewItem(prev => ({ ...prev, category_id: categoryId, product_id: '', quantity: defaultQuantity, unit_price: 0, size_variant: '', color_variant: '', term_id: selectedTermId, grading_slot_id: '' }));
  };

  const handleProductChangeCreate = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const productCategory = product ? categories.find(c => c.id === product.category_id) : null;
    let selectedTermId = newItem.term_id;
    if (productCategory?.name === 'Classes' && formData.branch_id) {
      if (branchTerms.length === 0) await loadBranchTerms(formData.branch_id);
      if (formData.student_id) selectedTermId = await refreshTermSelection(formData.branch_id, formData.student_id);
    }
    let unitPrice = product?.base_price || 0;
    if (product && formData.branch_id) {
      const bp = await getBranchPrice(product.id, formData.branch_id);
      if (bp !== null) unitPrice = bp;
    }
    setNewItem(prev => ({ ...prev, product_id: productId, category_id: product?.category_id || prev.category_id, unit_price: unitPrice, size_variant: '', color_variant: '', term_id: selectedTermId }));
  };

  const handleNewItemChange = (field: string, value: any) => {
    if (field === 'term_id') setSelectedClassSlots([]);
    setNewItem(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'product_id' && value) {
        const product = products.find(p => p.id === value);
        if (product) { updated.unit_price = product.base_price; updated.size_variant = ''; updated.color_variant = ''; }
      }
      return updated;
    });
  };

  const refreshTermSelection = async (branchId: string, studentId: string): Promise<string> => {
    setTermLoading(true);
    setTermError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: availableTerms, error: termsError } = await supabase.from('term_calendars').select('*').eq('branch_id', branchId).eq('is_active', true).gte('end_date', today).order('start_date', { ascending: true });
      if (termsError) throw termsError;
      if (!availableTerms || availableTerms.length === 0) return '';
      setBranchTerms(availableTerms as Term[]);
      // Find first term without existing invoice for this student
      for (const term of availableTerms) {
        const hasExisting = await checkExistingClassInvoice(studentId, term.id);
        if (!hasExisting) return term.id;
      }
      return availableTerms[0].id;
    } catch (error: any) {
      if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) setTermError('Session expired. Please refresh the page.');
      return '';
    } finally { setTermLoading(false); }
  };

  const checkExistingClassInvoice = async (studentId: string, termId: string): Promise<boolean> => {
    if (!studentId || !termId) return false;
    try {
      const { data: invoices } = await supabase.from('invoices').select('id').eq('student_id', studentId);
      if (!invoices?.length) return false;
      const { data: itemsData } = await supabase.from('invoice_items').select('id, metadata').in('invoice_id', invoices.map(i => i.id));
      return (itemsData || []).some(item => {
        const meta = item.metadata as any;
        return meta?.term_id === termId || (meta?.term_ids && (meta.term_ids as string[]).includes(termId));
      });
    } catch { return false; }
  };

  const addItem = async () => {
    if (!newItem.product_id) { toast.error('Please select a product'); return; }
    const product = products.find(p => p.id === newItem.product_id);
    if (!product) { toast.error('Product not found'); return; }
    if (showSizeInput && !newItem.size_variant) { toast.error('Please select or enter a size for this product'); return; }

    // Grading duplicate check
    if (product.category_id === GRADING_CATEGORY_ID) {
      if (items.some(i => products.find(p => p.id === i.product_id)?.category_id === GRADING_CATEGORY_ID)) {
        toast.error('Only 1 grading product allowed per invoice.');
        return;
      }
    }

    if (selectedCategory?.name === 'Classes' && branchTerms.length > 0 && !newItem.term_id) {
      toast.error('Please select a term for class items');
      return;
    }

    const term = branchTerms.find(t => t.id === newItem.term_id);
    const gradingSlot = gradingSlots.find(s => s.id === newItem.grading_slot_id);

    let siblingDiscountType: 'amount' | undefined;
    let siblingDiscountValue: number | undefined;
    if (term && formData.student_id) {
      const discount = await getSiblingDiscount(formData.student_id);
      if (discount > 0) { siblingDiscountType = 'amount'; siblingDiscountValue = discount; toast.info(`Sibling discount of $${discount.toFixed(2)} auto-applied`); }
    }

    const lineTotal = calculateLineTotal(newItem.quantity, newItem.unit_price, siblingDiscountType, siblingDiscountValue);
    const item: InvoiceItem = {
      product_id: newItem.product_id, product_name: product.name, description: product.name,
      quantity: newItem.quantity, unit_price: newItem.unit_price,
      size_variant: newItem.size_variant || undefined, color_variant: newItem.color_variant || undefined,
      term_id: newItem.term_id || undefined, term_name: term?.name || undefined,
      grading_slot_id: newItem.grading_slot_id || undefined, grading_slot_title: gradingSlot?.title || undefined,
      selected_class_slots: selectedClassSlots.length > 0 ? [...selectedClassSlots] : undefined,
      discount_type: siblingDiscountType, discount_value: siblingDiscountValue,
      total: lineTotal
    };
    setItems([...items, item]);
    setSelectedClassSlots([]);
    setNewItem({ product_id: '', category_id: '', quantity: 1, unit_price: 0, size_variant: '', color_variant: '', term_id: '', grading_slot_id: '' });
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItemQuantity = (index: number, value: string) => {
    const u = [...items]; const q = value === '' ? 0 : (parseInt(value) || 1);
    u[index].quantity = q; u[index].total = calculateLineTotal(q || 1, u[index].unit_price, u[index].discount_type, u[index].discount_value);
    setItems(u);
  };
  const finalizeItemQuantity = (index: number) => {
    if (items[index].quantity < 1) { const u = [...items]; u[index].quantity = 1; u[index].total = calculateLineTotal(1, u[index].unit_price, u[index].discount_type, u[index].discount_value); setItems(u); }
  };
  const updateItemPrice = (index: number, value: string) => {
    const u = [...items]; const p = value === '' ? 0 : (parseFloat(value) || 0);
    u[index].unit_price = p; u[index].total = calculateLineTotal(u[index].quantity, p, u[index].discount_type, u[index].discount_value);
    setItems(u);
  };
  const finalizeItemPrice = (index: number) => {
    if (items[index].unit_price < 0) { const u = [...items]; u[index].unit_price = 0; u[index].total = calculateLineTotal(u[index].quantity, 0, u[index].discount_type, u[index].discount_value); setItems(u); }
  };
  const updateItemDiscount = (index: number, type: 'percentage' | 'amount', value: number) => {
    const u = [...items]; u[index].discount_type = type; u[index].discount_value = value;
    u[index].total = calculateLineTotal(u[index].quantity, u[index].unit_price, type, value);
    setItems(u);
  };

  // Bundle discount
  const BUNDLE_AMOUNTS: Record<string, number> = {
    'Headgear + Chestguard bundle': 10,
    'Arm + Shin + Groin Guard bundle': 10,
    'Gaonhae Arm + Shin + Groin Guard bundle': 20,
  };
  const calculateBundleDiscount = (): { amount: number; descriptions: string[] } => {
    let discount = 0; const descriptions: string[] = [];
    const names = items.map(i => i.product_name.toLowerCase());
    if (names.some(n => n.includes('adidas headgear')) && names.some(n => n.includes('adidas chestguard'))) { discount += 10; descriptions.push('Headgear + Chestguard bundle'); }
    if (names.some(n => n.includes('adidas arm guard')) && names.some(n => n.includes('adidas shin guard')) && names.some(n => n.includes('adidas groin guard'))) { discount += 10; descriptions.push('Arm + Shin + Groin Guard bundle'); }
    const selectedBranch = branches.find(b => b.id === formData.branch_id);
    const isMorley = selectedBranch?.name?.toLowerCase() === 'morley';
    if (isMorley
      && names.some(n => n.includes('gaonhae arm guard'))
      && names.some(n => n.includes('gaonhae shin guard'))
      && names.some(n => n.includes('gaonhae male groin guard') || n.includes('gaonhae female groin guard'))) {
      discount += 20; descriptions.push('Gaonhae Arm + Shin + Groin Guard bundle');
    }
    return { amount: discount, descriptions };
  };
  const bundleDiscount = calculateBundleDiscount();

  const getSelectedBranchTaxConfig = () => {
    const b = branches.find(br => br.id === formData.branch_id);
    const country = b?.country || null;
    const rate = country ? (COUNTRY_TAX_RATES[country] ?? DEFAULT_TAX_RATE) : DEFAULT_TAX_RATE;
    const isInclusive = taxIncluded !== null ? taxIncluded : (country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED);
    return { rate, isInclusive };
  };

  const calculateTotals = () => {
    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0) - bundleDiscount.amount;
    const { rate, isInclusive } = getSelectedBranchTaxConfig();
    const taxRateDecimal = rate / 100;
    let subtotal: number, taxAmount: number, total: number;
    if (isInclusive) { total = itemsTotal; subtotal = itemsTotal / (1 + taxRateDecimal); taxAmount = total - subtotal; }
    else { subtotal = itemsTotal; taxAmount = subtotal * taxRateDecimal; total = subtotal + taxAmount; }
    return { subtotal, taxAmount, total, taxRate: rate, isInclusive };
  };
  const { subtotal, taxAmount, total, taxRate, isInclusive } = calculateTotals();

  // Create submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) { toast.error('Please select a student'); return; }
    if (!formData.branch_id) { toast.error('Please select a branch'); return; }
    if (items.length === 0) { toast.error('Please add at least one item'); return; }
    setLoading(true);
    try {
      // Grading validation
      const hasGradingItem = items.some(i => products.find(p => p.id === i.product_id)?.category_id === GRADING_CATEGORY_ID);
      const hasTermItem = items.some(i => !!i.term_id);
      let prerequisiteFailed = false;
      if (hasGradingItem && !hasTermItem && !prerequisiteOverriddenRef.current) {
        const { data: studentInvoices } = await supabase.from('invoices').select('id, status').eq('student_id', formData.student_id).in('status', ['paid', 'verified']);
        const paidIds = (studentInvoices || []).map(i => i.id);
        let hasTermPaid = false;
        if (paidIds.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const { data: activeTerms } = await supabase.from('term_calendars').select('id').eq('branch_id', formData.branch_id).eq('is_active', true).gte('end_date', today);
          if (activeTerms && activeTerms.length > 0) {
            const termIds = activeTerms.map(t => t.id);
            const { data: termItems } = await supabase.from('invoice_items').select('id, metadata').in('invoice_id', paidIds);
            hasTermPaid = (termItems || []).some(item => { const meta = item.metadata as any; return meta?.term_id && termIds.includes(meta.term_id); });
          } else hasTermPaid = true;
        }
        if (!hasTermPaid) prerequisiteFailed = true;
      }
      // Duplicate grading check
      for (const item of items) {
        const product = products.find(p => p.id === item.product_id);
        if (product?.category_id === GRADING_CATEGORY_ID) {
          const dup = await checkExistingGradingInvoice(formData.student_id, item.product_id);
          if (dup.exists) { toast.error(`Duplicate grading: "${dup.productName}" already exists.`); setLoading(false); return; }
        }
      }

      const isOverridden = prerequisiteOverriddenRef.current;
      const overrideNote = isOverridden ? '[Superadmin override: grading prerequisite]' : '';
      const combinedNotes = [formData.notes, overrideNote].filter(Boolean).join(' ').trim() || undefined;

      const invoiceItems = items.map(item => {
        const ld = item.discount_type && item.discount_value && item.discount_value > 0 ? { discount_type: item.discount_type, discount_value: item.discount_value } : undefined;
        const isGradingLine = products.find(p => p.id === item.product_id)?.category_id === GRADING_CATEGORY_ID;
        const overrideMeta = (isOverridden && isGradingLine) ? { prerequisite_overridden_by: user?.email || 'superadmin' } : {};
        return {
          product_id: item.product_id, description: item.description, quantity: item.quantity, unit_price: item.unit_price,
          size_variant: item.size_variant || undefined, total_override: item.total,
          metadata: { ...(item.term_id ? { term_id: item.term_id } : {}), ...(item.selected_class_slots?.length ? { selected_class_slots: item.selected_class_slots } : {}), ...(item.grading_slot_id ? { grading_slot_id: item.grading_slot_id } : {}), ...(ld ? { line_discount: ld } : {}), ...overrideMeta }
        };
      });

      if (bundleDiscount.amount > 0) {
        for (const desc of bundleDiscount.descriptions) {
          const amt = BUNDLE_AMOUNTS[desc] ?? 10;
          invoiceItems.push({ product_id: items[0].product_id, description: `Bundle Discount: ${desc}`, quantity: 1, unit_price: -amt, size_variant: undefined, total_override: -amt, metadata: { is_bundle_discount: true, bundle_description: desc } as any });
        }
      }

      const invoiceData: CreateInvoiceData = {
        student_id: formData.student_id, branch_id: formData.branch_id || undefined,
        payment_terms_days: 30, notes: combinedNotes,
        tax_included: taxIncluded !== null ? taxIncluded : undefined,
        ...(isSuperadmin && formData.issue_date ? { issue_date: formData.issue_date } : {}),
        items: invoiceItems
      };

      // Prerequisite failed: superadmin → confirmation dialog; others → approval request
      if (prerequisiteFailed) {
        if (isSuperadmin) {
          setPrerequisiteOverrideOpen(true);
          setLoading(false);
          return;
        }
        const studentName = students.find(s => s.id === formData.student_id)?.name || 'Unknown';
        const branchName = branches.find(b => b.id === formData.branch_id)?.name || null;
        const totalAmount = items.reduce((sum, i) => sum + i.total, 0);
        const totalDiscPre = calculateTotalDiscount(items);
        await submitDiscountApproval(invoiceData, studentName, branchName, totalDiscPre, totalAmount, user?.email || null, 'Grading invoice without paid term invoice');
        toast.success('This student has no paid term invoice. Request submitted for superadmin approval.');
        setDialogOpen(false); resetForm(); onInvoiceCreated?.(); return;
      }

      const hasException = items.some(i => outOfCriteriaProductIds.has(i.product_id));
      const totalDisc = calculateTotalDiscount(items);
      const needsDiscountApproval = totalDisc > DISCOUNT_APPROVAL_THRESHOLD && userrole !== 'superadmin';
      const needsExceptionApproval = hasException && userrole !== 'superadmin';

      if (needsDiscountApproval || needsExceptionApproval) {
        const studentName = students.find(s => s.id === formData.student_id)?.name || 'Unknown';
        const branchName = branches.find(b => b.id === formData.branch_id)?.name || null;
        const totalAmount = items.reduce((sum, i) => sum + i.total, 0);
        const reasons: string[] = [];
        if (needsDiscountApproval) reasons.push(`Discount exceeds $${DISCOUNT_APPROVAL_THRESHOLD} threshold`);
        if (needsExceptionApproval) reasons.push('Includes out-of-criteria products');
        const approvalReason = reasons.join(' & ');
        await submitDiscountApproval(invoiceData, studentName, branchName, totalDisc, totalAmount, user?.email || null, approvalReason);
        toast.success(needsExceptionApproval ? 'Invoice includes exception products — submitted for approval.' : `Discount of $${totalDisc.toFixed(2)} requires approval. Request submitted.`);
        setDialogOpen(false); resetForm(); onInvoiceCreated?.(); return;
      }

      const createdInvoice = await createInvoice(invoiceData);
      // Auto-apply credits
      try {
        const creditBalance = await getStudentCreditBalance(formData.student_id);
        if (creditBalance > 0 && createdInvoice?.id) {
          const invTotal = items.reduce((s, i) => s + i.total, 0);
          const creditToApply = Math.min(creditBalance, invTotal);
          if (creditToApply > 0) {
            await applyCredit(formData.student_id, createdInvoice.id, createdInvoice.invoice_number || '', creditToApply, user?.email || undefined);
            await createPayment({ invoice_id: createdInvoice.id, amount: creditToApply, payment_date: new Date().toISOString().split('T')[0], payment_method: 'bank_transfer', notes: 'Auto-applied from student credit balance' });
            toast.success(`Student credit of $${creditToApply.toFixed(2)} automatically applied`);
          }
        }
      } catch { /* non-fatal */ }

      toast.success('Invoice created successfully');
      setDialogOpen(false); resetForm(); onInvoiceCreated?.();
    } catch { toast.error('Failed to create invoice'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({ student_id: '', branch_id: lockedBranchId || '', notes: '', issue_date: todayISO() });
    setItems([]); setNewItem({ product_id: '', category_id: '', quantity: 1, unit_price: 0, size_variant: '', color_variant: '', term_id: '', grading_slot_id: '' });
    setBranchTerms([]); setTermError(null); setSelectedClassSlots([]); setTaxIncluded(null); taxManuallySet.current = false;
    prerequisiteOverriddenRef.current = false;
  };

  // ─── Edit Mode Logic ───────────────────────────────────────────
  // Tax-inclusive flag for edit mode (derived from invoice's branch country)
  const editIsTaxInclusive = useMemo(() => {
    if (!invoice?.branch_id) return DEFAULT_TAX_INCLUDED;
    const b = branches.find(br => br.id === invoice.branch_id);
    const country = b?.country || null;
    return country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED;
  }, [invoice?.branch_id, branches]);

  const recalcItem = (item: EditableItem): EditableItem => {
    const gross = item.quantity * item.unit_price;
    const discountAmt = item.discount_type === 'percentage' ? gross * ((item.discount_value || 0) / 100) : (item.discount_value || 0);
    const net = Math.max(0, gross - discountAmt);
    if (editIsTaxInclusive) {
      // unit_price is tax-inclusive: net IS the line total; tax is embedded
      const lineSubtotal = net / (1 + item.tax_rate);
      const lineTax = net - lineSubtotal;
      return { ...item, tax_amount: lineTax, total_amount: net };
    }
    // Tax-exclusive: net is subtotal, tax added on top
    return { ...item, tax_amount: net * item.tax_rate, total_amount: net + net * item.tax_rate };
  };

  const editTotals = useMemo(() => {
    if (editIsTaxInclusive) {
      // Inclusive: total_amount already includes tax
      const total = editItems.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const tax = editItems.reduce((sum, i) => sum + (i.tax_amount || 0), 0);
      const subtotal = total - tax;
      return { subtotal, tax, total, balanceDue: total - (invoice?.amount_paid || 0) };
    }
    // Exclusive: subtotal is net of items, tax added on top
    const subtotal = editItems.reduce((sum, i) => {
      const gross = i.quantity * i.unit_price;
      const disc = i.discount_type === 'percentage' ? gross * ((i.discount_value || 0) / 100) : (i.discount_value || 0);
      return sum + Math.max(0, gross - disc);
    }, 0);
    const tax = editItems.reduce((sum, i) => sum + i.tax_amount, 0);
    const total = subtotal + tax;
    return { subtotal, tax, total, balanceDue: total - (invoice?.amount_paid || 0) };
  }, [editItems, invoice?.amount_paid, editIsTaxInclusive]);

  const handleAddEditItem = () => {
    setEditItems(prev => [...prev, { id: `new_${Date.now()}`, isNew: true, product_id: '', product_name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0, tax_amount: 0, total_amount: 0 }]);
  };

  const handleRemoveEditItem = (itemId: string) => {
    setEditItems(prev => prev.filter(i => i.id !== itemId));
    setEditingClassSlots(prev => { const n = { ...prev }; delete n[itemId]; return n; });
  };

  const handleEditProductChange = (itemId: string, productId: string) => {
    const product = viewProducts.find(p => p.id === productId);
    if (!product) return;
    const rawTaxRate = product.tax_rate ?? (COUNTRY_TAX_RATES['Singapore'] ?? 0);
    const taxRate = rawTaxRate > 1 ? rawTaxRate / 100 : rawTaxRate;
    setEditItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return recalcItem({ ...item, product_id: productId, product_name: product.name, description: product.name, unit_price: product.base_price, tax_rate: taxRate, category_name: product.category_name, is_lesson: product.is_lesson });
    }));
  };

  const handleEditItemFieldChange = (itemId: string, field: string, value: number | string) => {
    setEditItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item, [field]: value };
      return (field === 'size_variant' || field === 'color_variant') ? updated : recalcItem(updated);
    }));
  };

  const handleEditItemDiscountChange = (itemId: string, type: 'percentage' | 'amount', value: number) => {
    setEditItems(prev => prev.map(item => item.id !== itemId ? item : recalcItem({ ...item, discount_type: type, discount_value: value })));
  };

  const handleSave = async () => {
    if (!invoice) return;
    setSaving(true);
    try {
      const originalIds = new Set(invoice.items.map(i => i.id));
      const currentIds = new Set(editItems.filter(i => !i.isNew).map(i => i.id));
      const removedIds = [...originalIds].filter(id => !currentIds.has(id));

      if (removedIds.length > 0) {
        await supabase.from('entitlements').update({ is_active: false, notes: 'Deactivated - invoice item removed' }).in('source_id', removedIds).eq('source_type', 'invoice_item');
        // Clean up any grading registrations linked to removed items so re-adds aren't blocked
        await supabase.from('grading_registrations').delete().in('invoice_item_id', removedIds);
        await supabase.from('invoice_items').delete().in('id', removedIds);
      }

      for (const item of editItems.filter(i => !i.isNew)) {
        const ld = (item.discount_value && item.discount_value > 0) ? { type: item.discount_type, value: item.discount_value } : undefined;
        const metadata = { ...(item.metadata || {}), ...(editingClassSlots[item.id] ? { selected_class_slots: editingClassSlots[item.id] } : {}), ...(ld ? { line_discount: ld } : { line_discount: undefined }), color_variant: item.color_variant || undefined };
        await supabase.from('invoice_items').update({ product_id: item.product_id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, tax_rate: item.tax_rate, tax_amount: item.tax_amount, total_amount: item.total_amount, size_variant: item.size_variant || null, metadata, updated_at: new Date().toISOString() }).eq('id', item.id);
      }

      for (const item of editItems.filter(i => i.isNew)) {
        if (!item.product_id) continue;
        const ld = (item.discount_value && item.discount_value > 0) ? { type: item.discount_type, value: item.discount_value } : undefined;
        // Preserve any metadata captured by edit-mode UI (term_id, grading_slot_id, etc.)
        const metadata = {
          ...(item.metadata || {}),
          ...(editingClassSlots[item.id] ? { selected_class_slots: editingClassSlots[item.id] } : {}),
          ...(ld ? { line_discount: ld } : {}),
          ...(item.color_variant ? { color_variant: item.color_variant } : {}),
        };
        await supabase.from('invoice_items').insert({ invoice_id: invoice.id, product_id: item.product_id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, tax_rate: item.tax_rate, tax_amount: item.tax_amount, total_amount: item.total_amount, size_variant: item.size_variant || null, metadata: Object.keys(metadata).length > 0 ? metadata : null });
      }

      // Build invoice update — superadmin can change issue_date (and due_date follows)
      const invoiceUpdate: Record<string, any> = {
        notes: formData.notes || invoice.notes,
        subtotal: editTotals.subtotal,
        tax_amount: editTotals.tax,
        total_amount: editTotals.total,
        balance_due: editTotals.balanceDue,
        updated_at: new Date().toISOString(),
      };
      let dateChanged = false;
      if (isSuperadmin && editIssueDate && editIssueDate !== (invoice.issue_date || '')) {
        const terms = invoice.payment_terms_days ?? 30;
        const newIssue = new Date(editIssueDate + 'T00:00:00');
        const newDue = new Date(newIssue);
        newDue.setDate(newDue.getDate() + terms);
        const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        invoiceUpdate.issue_date = editIssueDate;
        invoiceUpdate.due_date = toISO(newDue);
        dateChanged = true;
      }
      await supabase.from('invoices').update(invoiceUpdate).eq('id', invoice.id);
      if (dateChanged) {
        try {
          await logInvoiceChange({
            invoice_id: invoice.id,
            action: 'field_updated',
            field_name: 'issue_date',
            old_value: invoice.issue_date || undefined,
            new_value: editIssueDate,
            changes: { issue_date: { old: invoice.issue_date, new: editIssueDate } },
          });
        } catch { /* non-fatal */ }
      }

      // Sync class slots
      for (const [itemId, slots] of Object.entries(editingClassSlots)) {
        const item = editItems.find(i => i.id === itemId);
        if (!item) continue;
        let enrollment: { id: string } | null = null;
        const { data: enrollmentByItem } = await supabase.from('student_class_enrollments').select('id').eq('invoice_item_id', itemId).maybeSingle();
        enrollment = enrollmentByItem;
        const existingMeta = (item.metadata as any) || {};
        if (!enrollment && invoice.student_id && existingMeta?.term_id) {
          const { data: enrollmentByTerm } = await supabase.from('student_class_enrollments').select('id').eq('student_id', invoice.student_id).eq('term_id', existingMeta.term_id).eq('status', 'active').maybeSingle();
          enrollment = enrollmentByTerm;
        }
        if (!enrollment && invoice.student_id && slots.length > 0) {
          const termId = existingMeta?.term_id || existingMeta?.term_ids?.[0];
          if (termId && invoice.branch_id) {
            try {
              const enrollmentId = await createEnrollment({ student_id: invoice.student_id, term_id: termId, branch_id: invoice.branch_id, class_type: item.description || 'Class', tier_name: item.description || 'Class', total_price: (item.quantity || 1) * (item.unit_price || 0), invoice_item_id: itemId });
              const ttIds = [...new Set(slots.map(s => s.split('_')[0]))];
              const { data: tts } = await supabase.from('branch_timetables').select('id, start_time, end_time, class_type').in('id', ttIds);
              const ttMap = new Map(tts?.map(t => [t.id, t]) || []);
              if (tts?.[0]?.class_type) await supabase.from('student_class_enrollments').update({ class_type: tts[0].class_type }).eq('id', enrollmentId);
              for (const slot of slots) { const [ttId, date] = slot.split('_'); const tt = ttMap.get(ttId); if (tt && date) await createScheduledClass({ enrollment_id: enrollmentId, timetable_id: ttId, scheduled_date: date, start_time: tt.start_time, end_time: tt.end_time }); }
            } catch { console.error('Failed to create enrollment during invoice edit'); }
          }
        } else if (enrollment) {
          await supabase.from('student_scheduled_classes').delete().eq('enrollment_id', enrollment.id).in('status', ['scheduled']);
          if (slots.length > 0) {
            const ttIds = [...new Set(slots.map(s => s.split('_')[0]))];
            const { data: tts } = await supabase.from('branch_timetables').select('id, start_time, end_time').in('id', ttIds);
            const ttMap = new Map(tts?.map(t => [t.id, t]) || []);
            const newClasses = slots.map(s => { const [ttId, date] = s.split('_'); const tt = ttMap.get(ttId); if (!tt || !date) return null; return { enrollment_id: enrollment!.id, timetable_id: ttId, scheduled_date: date, start_time: tt.start_time, end_time: tt.end_time, status: 'scheduled' }; }).filter(Boolean);
            if (newClasses.length > 0) await supabase.from('student_scheduled_classes').insert(newClasses);
          }
        }
      }

      // Sync grading registrations from current items (handles newly-added Grading line items)
      await syncGradingRegistrationsForInvoice(invoice.id);
      queryClient.invalidateQueries({ queryKey: ['grading-list-students'] });
      queryClient.invalidateQueries({ queryKey: ['grading-list-count'] });
      queryClient.invalidateQueries({ queryKey: ['grading-registrations'] });

      toast.success('Invoice updated successfully');
      setMode('view');
      loadInvoiceData();
      onInvoiceUpdated?.();
    } catch { toast.error('Failed to update invoice'); }
    finally { setSaving(false); }
  };

  const handleSaveWithApproval = async () => {
    if (!invoice) return;
    if (isPaidOrVerified && !isSuperadmin) {
      try {
        setSaving(true);
        await submitActionRequest(invoice.id, 'adjustment', { editItems, editTotals }, invoice.invoice_number, invoice.student_name || '', user?.email || '');
        toast.success('Adjustment request submitted for superadmin approval');
        setMode('view');
      } catch (error: any) { toast.error(`Failed: ${error.message}`); }
      finally { setSaving(false); }
    } else { handleSave(); }
  };

  // Cancel & Refund
  const handleCancelInvoice = async () => {
    if (!invoice) return;
    try {
      setIsCancelling(true);
      if (isSuperadmin) {
        await cancelInvoice(invoice.id);
        toast.success('Invoice cancelled and payments refunded as student credits');
        setCancelDialogOpen(false); loadInvoiceData(); onInvoiceUpdated?.();
      } else {
        await submitActionRequest(invoice.id, 'cancellation', { reason: cancelReason }, invoice.invoice_number, invoice.student_name || '', user?.email || '');
        toast.success('Cancellation request submitted for superadmin approval');
        setCancelDialogOpen(false);
      }
    } catch (error: any) { toast.error(`Failed: ${error.message}`); }
    finally { setIsCancelling(false); }
  };

  // Line-item refund
  const handleRefundItem = async () => {
    if (!refundItemId || !invoice) return;
    try {
      setIsRefunding(true);
      if (isSuperadmin) {
        await refundLineItem(refundItemId, refundReason);
        toast.success('Item refunded and credit issued');
      } else {
        await submitRefundRequest(invoice.id, refundItemId, refundReason, invoice.invoice_number, invoice.student_name || '', user?.email || '');
        toast.success('Refund request submitted for superadmin approval');
      }
      setRefundItemId(null); setRefundReason('');
      loadInvoiceData(); onInvoiceUpdated?.();
    } catch (error: any) { toast.error(`Failed: ${error.message}`); }
    finally { setIsRefunding(false); }
  };

  // Payment deletion
  const handleSubmitDeleteRequest = async () => {
    if (!paymentToDelete) return;
    try {
      setIsSubmittingDelete(true);
      await createDeletionRequest(paymentToDelete.id, deleteReason || undefined);
      toast.success('Deletion request submitted for superadmin approval');
      setDeleteDialogOpen(false); setPaymentToDelete(null); setDeleteReason('');
    } catch { toast.error('Failed to submit deletion request'); }
    finally { setIsSubmittingDelete(false); }
  };

  // ─── Status helpers ────────────────────────────────────────────
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid': case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid': case 'draft': return 'bg-red-100 text-red-800 border-red-200';
      case 'partial': case 'partially_paid': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return '';
    }
  };
  const getDisplayStatus = (status: string) => {
    if (status === 'draft') return 'Unpaid';
    if (status === 'partially_paid') return 'Partially Paid';
    if (status === 'verified') return 'Verified';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  const formatDateLocal = (dateString?: string) => dateString ? formatDate(dateString) : '-';

  // Render class slot badges
  const renderClassSlotBadges = (classSlots: string[]) => (
    <div className="flex flex-wrap gap-1 items-center">
      <span className="text-xs font-medium text-muted-foreground mr-1">Selected Dates:</span>
      {classSlots.map(slot => {
        const [ttId, datePart] = slot.split('_');
        if (!datePart) return null;
        try {
          const tt = timetableTimeMap[ttId];
          const date = parseISO(datePart);
          return (
            <Badge key={slot} variant="secondary" className="text-[10px] px-1.5 py-0.5 flex flex-col items-center leading-tight">
              <span>{format(date, 'EEE d MMM')}</span>
              {tt?.start_time && tt?.end_time && <span className="text-muted-foreground">{tt.start_time.slice(0, 5)}-{tt.end_time.slice(0, 5)}</span>}
            </Badge>
          );
        } catch { return null; }
      }).filter(Boolean)}
    </div>
  );

  // ─── RENDER ────────────────────────────────────────────────────
  // Loading state for view/edit
  if (!isCreateMode && loading) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto top-[5%] translate-y-0">
          <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isCreateMode && !invoice) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl">
          <DialogHeader><DialogTitle>Invoice Not Found</DialogTitle></DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const dialogContent = (
    <DialogContent ref={(el) => { dialogContentRef.current = el as HTMLDivElement | null; setDialogContentEl(el); }} className="w-[98vw] sm:w-[95vw] max-w-[1400px] max-h-[95vh] sm:max-h-[90vh] min-h-[60vh] overflow-y-auto p-3 sm:p-6 top-[2%] sm:top-[5%] translate-y-0 flex flex-col">
      {/* ─── HEADER ─── */}
      <DialogHeader className="pb-2">
        {isCreateMode ? (
          <DialogTitle className="text-base md:text-lg">Create New Invoice</DialogTitle>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="text-base md:text-lg">Invoice {invoice!.invoice_number}</DialogTitle>
              <DialogDescription className="text-xs md:text-sm truncate">
                {invoice!.student_name} · {formatDate(invoice!.issue_date)}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className={cn(getStatusBadgeClass(invoice!.status), "text-xs")}>{getDisplayStatus(invoice!.status)}</Badge>
              <InvoiceChangeLogDialog invoiceId={invoice!.id} invoiceNumber={invoice!.invoice_number} trigger={
                <Button variant="outline" size="sm" className="h-7 text-xs px-2"><History className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">History</span></Button>
              } />
              {mode === 'view' && !isCancelled ? (
                <>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setMode('edit')}>
                    <Wrench className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Adjustments</span>
                  </Button>
                  {(['paid', 'verified', 'partial', 'partially_paid', 'draft'] as string[]).includes(invoice!.status) && (
                    <Button variant="destructive" size="sm" className="h-7 text-xs px-2" onClick={() => { setCancelReason(''); setCancelDialogOpen(true); }}>
                      <Ban className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Cancel & Refund</span>
                    </Button>
                  )}
                </>
              ) : mode === 'edit' ? (
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setMode('view')}>
                  <X className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Cancel</span>
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogHeader>

      {/* ─── CREATE MODE FORM ─── */}
      {isCreateMode && (
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
          {/* Invoice Details */}
          <div className="space-y-2 md:space-y-4">
            <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4", isSuperadmin ? "md:grid-cols-3" : "md:grid-cols-2")}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs md:text-sm">Branch</Label>
                  {lockedBranchId && <Badge variant="secondary" className="text-[10px]">Locked</Badge>}
                </div>
                {branches.length === 0 && lockedBranchId ? (
                  <Input value="Loading branch..." disabled className="h-8 md:h-10 text-xs md:text-sm" />
                ) : (
                  <Select value={formData.branch_id} onValueChange={(value) => handleInputChange('branch_id', value)} disabled={!!lockedBranchId}>
                    <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{availableBranches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs md:text-sm">Student</Label>
                  <Select value={studentStatusFilter} onValueChange={(v) => setStudentStatusFilter(v as any)}>
                    <SelectTrigger className="h-5 w-16 text-[10px] border-0 bg-muted/50 px-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="trial">Trial</SelectItem><SelectItem value="all">All</SelectItem></SelectContent>
                  </Select>
                </div>
                <StudentSearchSelect students={filteredStudents} value={formData.student_id} container={dialogContentEl} loading={students.length === 0} onValueChange={(value) => {
                  handleInputChange('student_id', value);
                  const student = students.find(s => s.id === value);
                  if (student?.branch_id && !formData.branch_id) handleInputChange('branch_id', student.branch_id);
                }} />
              </div>
              {isSuperadmin && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs md:text-sm">Invoice Date</Label>
                    <Badge variant="secondary" className="text-[10px]">Superadmin</Badge>
                  </div>
                  <DatePicker
                    selected={formData.issue_date ? new Date(formData.issue_date + 'T00:00:00') : undefined}
                    onSelect={(d) => {
                      if (!d) return;
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setFormData(prev => ({ ...prev, issue_date: iso }));
                    }}
                    className="h-8 md:h-10 text-xs md:text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-2 md:space-y-4">
            <h3 className="text-sm md:text-lg font-medium">Invoice Items</h3>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {items.map((item, index) => {
                const itemProduct = products.find(p => p.id === item.product_id);
                const itemCategory = categories.find(c => c.id === itemProduct?.category_id);
                return (
                  <div key={index} className="border rounded-md p-2 space-y-1 text-xs">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1"><span className="text-muted-foreground">{itemCategory?.name || '-'} · </span><span className="font-medium">{item.product_name}</span></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1"><span className="text-muted-foreground">Qty:</span><Input type="number" min="1" value={item.quantity || ''} onChange={(e) => updateItemQuantity(index, e.target.value)} onBlur={() => finalizeItemQuantity(index)} className="w-12 h-6 text-xs px-1" /></div>
                      <div className="flex items-center gap-1"><span className="text-muted-foreground">Price:</span><Input type="number" min="0" step="0.01" value={item.unit_price || ''} onChange={(e) => updateItemPrice(index, e.target.value)} onBlur={() => finalizeItemPrice(index)} className="w-16 h-6 text-xs px-1" /></div>
                      <div className="flex items-center gap-1"><span className="text-muted-foreground">Disc:</span><LineDiscountPopover discountType={item.discount_type} discountValue={item.discount_value} onChange={(type, value) => updateItemDiscount(index, type, value)} /></div>
                      <span className="font-medium ml-auto">${item.total.toFixed(2)}</span>
                    </div>
                    {(item.size_variant || item.term_name || item.grading_slot_title) && (
                      <div className="text-muted-foreground flex gap-2 flex-wrap">
                        {item.size_variant && <span>Size: {item.size_variant}</span>}
                        {item.term_name && <span>Term: {item.term_name}</span>}
                        {item.grading_slot_title && <span>Slot: {item.grading_slot_title}</span>}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile Add Item Card */}
              <div className="border rounded-md p-2 space-y-2 bg-muted/30 text-xs">
                <div className="grid grid-cols-2 gap-1.5">
                  <Select value={newItem.category_id || '__all__'} onValueChange={(val) => handleCategoryChange(val === '__all__' ? '' : val)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent><SelectItem value="__all__">All Categories</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <ProductSearchSelect products={filteredProducts} value={newItem.product_id} onValueChange={handleProductChangeCreate} outOfCriteriaIds={outOfCriteriaProductIds} container={dialogContentEl} />
                </div>
                <div className="grid grid-cols-3 gap-1.5 items-end">
                  <div><Label className="text-[10px] text-muted-foreground">Qty</Label><Input type="number" min="1" value={newItem.quantity || ''} onChange={(e) => handleNewItemChange('quantity', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} onBlur={() => { if (newItem.quantity < 1) handleNewItemChange('quantity', 1); }} className="h-7 text-xs px-1" /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Price</Label><Input type="number" min="0" step="0.01" value={newItem.unit_price || ''} onChange={(e) => { const p = parseFloat(e.target.value); handleNewItemChange('unit_price', e.target.value === '' ? 0 : (isNaN(p) ? 0 : p)); }} disabled={selectedProduct && selectedProduct.base_price > 0} className={`h-7 text-xs px-1 ${selectedProduct && selectedProduct.base_price > 0 ? 'bg-muted text-muted-foreground' : ''}`} /></div>
                  <Button type="button" onClick={addItem} size="sm" className="h-7 text-xs" disabled={!newItem.product_id}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                </div>
                {(sizeOptions.length > 0 || showSizeInput || colorOptions.length > 0 || selectedCategory?.name === 'Classes' || newItem.category_id === GRADING_CATEGORY_ID) && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {sizeOptions.length > 0 ? (
                      <Select value={newItem.size_variant} onValueChange={(v) => handleNewItemChange('size_variant', v)}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Size" /></SelectTrigger><SelectContent>{sizeOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                    ) : showSizeInput ? <Input type="text" value={newItem.size_variant} onChange={(e) => handleNewItemChange('size_variant', e.target.value)} placeholder="Size" className="h-7 text-xs px-1" /> : <div />}
                    {colorOptions.length > 0 ? (
                      <Select value={newItem.color_variant} onValueChange={(v) => handleNewItemChange('color_variant', v)}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Color" /></SelectTrigger><SelectContent>{colorOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                    ) : <div />}
                    {selectedCategory?.name === 'Classes' && branchTerms.length > 0 ? (
                      <Select value={newItem.term_id} onValueChange={(v) => handleNewItemChange('term_id', v)} disabled={termLoading}><SelectTrigger className={`h-7 text-xs ${termError ? 'border-destructive' : ''}`}><SelectValue placeholder={termLoading ? "..." : "Term"} /></SelectTrigger><SelectContent>{branchTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                    ) : newItem.category_id === GRADING_CATEGORY_ID && getFilteredGradingSlots().length > 0 ? (
                      <Select value={newItem.grading_slot_id} onValueChange={(v) => handleNewItemChange('grading_slot_id', v)} disabled={gradingSlotsLoading}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder={gradingSlotsLoading ? "..." : "Slot"} /></SelectTrigger><SelectContent>{getFilteredGradingSlots().map(s => <SelectItem key={s.id} value={s.id}>{s.title || `${s.branch_name} - ${formatDate(new Date(s.grading_date))}`}</SelectItem>)}</SelectContent></Select>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table className="text-xs min-w-[900px]">
                <TableHeader><TableRow>
                  <TableHead className="px-2">Category</TableHead><TableHead className="px-2">Product</TableHead><TableHead className="px-2 w-12">Qty</TableHead><TableHead className="px-2 w-16">Price</TableHead><TableHead className="px-2 w-14">Disc</TableHead><TableHead className="px-2 w-14">Size</TableHead><TableHead className="px-2 w-14">Color</TableHead><TableHead className="px-2">Term/Slot</TableHead><TableHead className="px-2 w-16 text-right">Total</TableHead><TableHead className="px-1 w-9"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const ip = products.find(p => p.id === item.product_id);
                    const ic = categories.find(c => c.id === ip?.category_id);
                    return (
                      <TableRow key={index}>
                        <TableCell className="px-2 text-muted-foreground">{ic?.name || '-'}</TableCell>
                        <TableCell className="px-2 font-medium">{item.product_name}</TableCell>
                        <TableCell className="px-2"><Input type="number" min="1" value={item.quantity || ''} onChange={(e) => updateItemQuantity(index, e.target.value)} onBlur={() => finalizeItemQuantity(index)} className="w-12 h-7 text-xs px-1" /></TableCell>
                        <TableCell className="px-2"><Input type="number" min="0" step="0.01" value={item.unit_price || ''} onChange={(e) => updateItemPrice(index, e.target.value)} onBlur={() => finalizeItemPrice(index)} className="w-14 h-7 text-xs px-1" /></TableCell>
                        <TableCell className="px-2"><LineDiscountPopover discountType={item.discount_type} discountValue={item.discount_value} onChange={(type, value) => updateItemDiscount(index, type, value)} /></TableCell>
                        <TableCell className="px-2">{item.size_variant || '-'}</TableCell>
                        <TableCell className="px-2">{item.color_variant || '-'}</TableCell>
                        <TableCell className="px-2">{item.term_name || item.grading_slot_title || '-'}</TableCell>
                        <TableCell className="px-2 font-medium text-right">${item.total.toFixed(2)}</TableCell>
                        <TableCell className="px-1"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/30">
                    <TableCell className="px-2"><Select value={newItem.category_id || '__all__'} onValueChange={(val) => handleCategoryChange(val === '__all__' ? '' : val)}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="__all__">All Categories</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></TableCell>
                    <TableCell className="px-2"><ProductSearchSelect products={filteredProducts} value={newItem.product_id} onValueChange={handleProductChangeCreate} outOfCriteriaIds={outOfCriteriaProductIds} container={dialogContentEl} /></TableCell>
                    <TableCell className="px-2"><Input type="number" min="1" value={newItem.quantity || ''} onChange={(e) => handleNewItemChange('quantity', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} onBlur={() => { if (newItem.quantity < 1) handleNewItemChange('quantity', 1); }} className="w-12 h-7 text-xs px-1" /></TableCell>
                    <TableCell className="px-2"><Input type="number" min="0" step="0.01" value={newItem.unit_price || ''} onChange={(e) => { const p = parseFloat(e.target.value); handleNewItemChange('unit_price', e.target.value === '' ? 0 : (isNaN(p) ? 0 : p)); }} disabled={selectedProduct && selectedProduct.base_price > 0} className={`w-14 h-7 text-xs px-1 ${selectedProduct && selectedProduct.base_price > 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`} /></TableCell>
                    <TableCell className="px-2"><span className="text-muted-foreground">-</span></TableCell>
                    <TableCell className="px-2">{sizeOptions.length > 0 ? <Select value={newItem.size_variant} onValueChange={(v) => handleNewItemChange('size_variant', v)}><SelectTrigger className="h-7 text-xs w-16"><SelectValue placeholder="Size" /></SelectTrigger><SelectContent>{sizeOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select> : showSizeInput ? <Input type="text" value={newItem.size_variant} onChange={(e) => handleNewItemChange('size_variant', e.target.value)} placeholder="Size" className="h-7 text-xs w-16 px-1" /> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="px-2">{colorOptions.length > 0 ? <Select value={newItem.color_variant} onValueChange={(v) => handleNewItemChange('color_variant', v)}><SelectTrigger className="h-7 text-xs w-16"><SelectValue placeholder="Color" /></SelectTrigger><SelectContent>{colorOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="px-2">{selectedCategory?.name === 'Classes' ? (branchTerms.length > 0 ? <Select value={newItem.term_id} onValueChange={(v) => handleNewItemChange('term_id', v)} disabled={termLoading}><SelectTrigger className={`h-7 text-xs ${termError ? 'border-destructive' : ''}`}><SelectValue placeholder={termLoading ? "..." : "Term"} /></SelectTrigger><SelectContent>{branchTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select> : <span className="text-muted-foreground text-xs">No terms</span>) : newItem.category_id === GRADING_CATEGORY_ID ? (getFilteredGradingSlots().length > 0 ? <Select value={newItem.grading_slot_id} onValueChange={(v) => handleNewItemChange('grading_slot_id', v)} disabled={gradingSlotsLoading}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder={gradingSlotsLoading ? "..." : "Slot"} /></SelectTrigger><SelectContent>{getFilteredGradingSlots().map(s => <SelectItem key={s.id} value={s.id}>{s.title || `${s.branch_name} - ${formatDate(new Date(s.grading_date))}`}</SelectItem>)}</SelectContent></Select> : <span className="text-muted-foreground text-[10px] leading-tight block">No grading slots — create one in Sales → Grading</span>) : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="px-2 text-muted-foreground">-</TableCell>
                    <TableCell className="px-1"><Button type="button" onClick={addItem} size="icon" className="h-7 w-7" disabled={!newItem.product_id || (newItem.category_id === GRADING_CATEGORY_ID && getFilteredGradingSlots().length === 0)}><Plus className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {termError && selectedCategory?.name === 'Classes' && <p className="text-xs text-destructive">{termError}</p>}

            {/* Class Schedule Selector */}
            {selectedCategory?.name === 'Classes' && newItem.term_id && formData.branch_id && (
              <div className="space-y-1 md:space-y-2">
                <h4 className="text-xs md:text-sm font-medium">Select Class Schedule</h4>
                <ClassScheduleSelector branchId={formData.branch_id} studentAge={studentAge} selectedSlots={selectedClassSlots} onSlotsChange={setSelectedClassSlots} term={branchTerms.find(t => t.id === newItem.term_id)!} allowedClassTypes={selectedProduct?.allowed_class_types} allowedDays={selectedProduct?.lesson_days} lessonsPerWeek={selectedProduct?.lessons_per_week} studentAllowedClassTypes={studentAllowedClassTypes} />
              </div>
            )}

            {/* Totals */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-full md:w-64 space-y-1 md:space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between items-center">
                    <span>Tax Mode:</span>
                    <Select value={isInclusive ? 'included' : 'excluded'} onValueChange={(val) => { taxManuallySet.current = true; setTaxIncluded(val === 'included'); }}>
                      <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="included">Tax Included</SelectItem><SelectItem value="excluded">Tax Excluded</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {bundleDiscount.amount > 0 && <div className="flex justify-between text-green-600"><span>Bundle Discount:</span><span>-${bundleDiscount.amount.toFixed(2)}</span></div>}
                  <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Tax ({taxRate}%{isInclusive ? ' incl.' : ''}):</span><span>${taxAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-sm md:text-lg border-t pt-1 md:pt-2"><span>Total:</span><span>${total.toFixed(2)}</span></div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={loading} className="text-xs md:text-sm h-8 md:h-10">Cancel</Button>
            <Button type="submit" disabled={loading || items.length === 0} className="text-xs md:text-sm h-8 md:h-10">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create Invoice
            </Button>
          </DialogFooter>
        </form>
      )}

      {/* ─── VIEW / EDIT MODE ─── */}
      {!isCreateMode && invoice && (
        <div className="space-y-4">
          {/* Invoice Details Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="text-muted-foreground">Invoice #</span>
              <div className="font-medium">{invoice.invoice_number}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="text-muted-foreground">Date</span>
              {mode === 'edit' && isSuperadmin ? (
                <DatePicker
                  selected={editIssueDate ? new Date(editIssueDate + 'T00:00:00') : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    setEditIssueDate(iso);
                  }}
                  className="h-7 text-xs mt-0.5"
                />
              ) : (
                <div className="font-medium">{formatDate(invoice.issue_date)}</div>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="text-muted-foreground">Total</span>
              <div className="font-medium">{formatCurrency(invoice.total_amount)}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <span className="text-muted-foreground">Balance</span>
              <div className={`font-medium ${invoice.balance_due > 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(invoice.balance_due)}</div>
            </div>
          </div>

          <Separator />

          {/* ─── ITEMS SECTION ─── */}
          <div>
            <h3 className="text-sm font-medium mb-2">Items {mode === 'edit' ? `(${editItems.length})` : `(${invoice.items.length})`}</h3>

            {mode === 'edit' ? (
              /* Edit mode items */
              <>
                <div className="space-y-2">
                  {editItems.map((item) => {
                    const metadata = item.metadata as any;
                    const isClassItem = item.category_name === 'Classes' || item.is_lesson;
                    const termIds: string[] = metadata?.term_ids || (metadata?.term_id ? [metadata.term_id] : []);
                    const classSlots = editingClassSlots[item.id] || [];
                    return (
                      <div key={item.id} className="border rounded-lg p-2 md:p-3 space-y-2">
                        <div className="flex items-start gap-1.5">
                          <div className="flex-1 min-w-0">
                            <Label className="text-xs">Product</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-7 text-xs">
                                  <span className="truncate">{item.product_id ? (viewProducts.find(p => p.id === item.product_id)?.name || 'Select...') : 'Select product...'}</span>
                                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[280px] p-0 max-h-[60vh] overflow-hidden" align="start">
                                <Command><CommandInput placeholder="Search products..." /><CommandList
                                  className="max-h-[300px] overflow-y-auto overscroll-contain"
                                  onWheel={(e) => e.stopPropagation()}
                                  onTouchMove={(e) => e.stopPropagation()}
                                ><CommandEmpty>No products available for this branch.</CommandEmpty><CommandGroup>
                                  {viewProducts.filter(p => p.is_active && !hiddenProductIds.has(p.id) && (!branchAvailableProductIds || branchAvailableProductIds.has(p.id))).map(p => (
                                    <CommandItem key={p.id} value={p.name} onSelect={() => handleEditProductChange(item.id, p.id)}>
                                      <Check className={cn("mr-2 h-3 w-3", item.product_id === p.id ? "opacity-100" : "opacity-0")} />
                                      <span className="text-xs">{p.name}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup></CommandList></Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive mt-4" onClick={() => handleRemoveEditItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 items-end">
                          <div><Label className="text-xs">Qty</Label><Input type="number" min={1} value={item.quantity} onChange={(e) => handleEditItemFieldChange(item.id, 'quantity', parseInt(e.target.value) || 1)} className="h-7 text-xs" /></div>
                          <div><Label className="text-xs">Price</Label><Input type="number" step="0.01" min={0} value={item.unit_price} onChange={(e) => handleEditItemFieldChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)} className="h-7 text-xs" /></div>
                          <div><Label className="text-xs">Disc.</Label><LineDiscountPopover discountType={item.discount_type} discountValue={item.discount_value} onChange={(type, value) => handleEditItemDiscountChange(item.id, type, value)} /></div>
                          <div className="text-right"><Label className="text-xs">Total</Label><div className="text-xs font-medium pt-1">{formatCurrency(item.total_amount)}</div></div>
                        </div>
                        {/* Variants */}
                        {(() => {
                          const product = viewProducts.find(p => p.id === item.product_id);
                          const availableSizes: string[] = (product as any)?.available_sizes || (product as any)?.available_variants?.sizes || [];
                          const availableColors: string[] = (product as any)?.available_variants?.colors || [];
                          if (!availableSizes.length && !availableColors.length) return null;
                          return (
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              {availableSizes.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs text-muted-foreground">Size:</Label>
                                  <Select value={item.size_variant || ''} onValueChange={(v) => handleEditItemFieldChange(item.id, 'size_variant', v)}>
                                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>{availableSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              )}
                              {availableColors.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs text-muted-foreground">Color:</Label>
                                  <Select value={item.color_variant || ''} onValueChange={(v) => handleEditItemFieldChange(item.id, 'color_variant', v)}>
                                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>{availableColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {/* Term & class schedule */}
                        {isClassItem && invoice.branch_id && (
                          <div className="space-y-2 pt-1 border-t">
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">Term:</Label>
                              <Select value={termIds[0] || ''} onValueChange={(newTermId) => {
                                const newTerm = branchTerms.find(t => t.id === newTermId);
                                if (!newTerm) return;
                                setEditItems(prev => prev.map(ei => ei.id !== item.id ? ei : { ...ei, metadata: { ...(ei.metadata as any || {}), term_id: newTermId, term_ids: [newTermId] } }));
                                setTermDataMap(prev => ({ ...prev, [newTermId]: newTerm }));
                                setEditingClassSlots(prev => ({ ...prev, [item.id]: [] }));
                              }}>
                                <SelectTrigger className="h-7 w-full md:w-60 text-xs"><SelectValue placeholder="Select term" /></SelectTrigger>
                                <SelectContent>{branchTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            {termIds.map(termId => {
                              const term = termDataMap[termId];
                              if (!term) return null;
                              return (
                                <div key={termId} className="space-y-1">
                                  <ClassScheduleSelector branchId={invoice.branch_id!} studentAge={studentAge} selectedSlots={editingClassSlots[item.id] || []} onSlotsChange={(slots) => setEditingClassSlots(prev => ({ ...prev, [item.id]: slots }))} term={term} allowedClassTypes={viewProducts.find(p => p.id === item.product_id)?.allowed_class_types} allowedDays={viewProducts.find(p => p.id === item.product_id)?.lesson_days} lessonsPerWeek={viewProducts.find(p => p.id === item.product_id)?.lessons_per_week} studentAllowedClassTypes={viewStudentAllowedClassTypes} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Grading slot selector — for Grading category items (backfill legacy rows) */}
                        {(() => {
                          const product = viewProducts.find(p => p.id === item.product_id);
                          const isGradingItem = (product?.category_name || item.category_name) === 'Grading';
                          if (!isGradingItem) return null;
                          const currentSlotId = (item.metadata as any)?.grading_slot_id || '';
                          const branchSlots = gradingSlots.filter(s =>
                            s.branch_id === invoice.branch_id ||
                            (Array.isArray(s.available_branch_ids) && s.available_branch_ids.includes(invoice.branch_id || ''))
                          );
                          return (
                            <div className="flex items-center gap-1.5 pt-1 border-t">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">Grading slot:</Label>
                              {branchSlots.length > 0 ? (
                                <Select value={currentSlotId} onValueChange={(newSlotId) => {
                                  setEditItems(prev => prev.map(ei => ei.id !== item.id ? ei : { ...ei, metadata: { ...(ei.metadata as any || {}), grading_slot_id: newSlotId } }));
                                }}>
                                  <SelectTrigger className="h-7 w-full md:w-72 text-xs"><SelectValue placeholder="Select grading slot" /></SelectTrigger>
                                  <SelectContent>
                                    {branchSlots.map(s => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.title || `${s.branch_name} - ${formatDate(new Date(s.grading_date))}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">No grading slots — create one in Sales → Grading</span>
                              )}
                            </div>
                          );
                        })()}
                        {classSlots.length > 0 && renderClassSlotBadges(classSlots)}
                      </div>
                    );
                  })}
                </div>
                <Button variant="outline" className="w-full mt-2 h-8 text-xs" onClick={handleAddEditItem}><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button>
                <Separator className="my-3" />
                <div className="flex justify-end">
                  <div className="w-full md:w-64 space-y-1.5">
                    <div className="flex justify-between text-xs md:text-sm"><span>Subtotal:</span><span>{formatCurrency(editTotals.subtotal)}</span></div>
                    <div className="flex justify-between text-xs md:text-sm"><span>Tax{editIsTaxInclusive ? ' (incl.)' : ''}:</span><span>{formatCurrency(editTotals.tax)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold text-sm md:text-base"><span>Total:</span><span>{formatCurrency(editTotals.total)}</span></div>
                    <div className="flex justify-between text-xs md:text-sm"><span>Paid:</span><span className="text-green-600">{formatCurrency(invoice.amount_paid)}</span></div>
                    <div className="flex justify-between font-bold text-sm md:text-base"><span>Balance Due:</span><span className={editTotals.balanceDue > 0 ? 'text-destructive' : 'text-green-600'}>{formatCurrency(editTotals.balanceDue)}</span></div>
                  </div>
                </div>
              </>
            ) : (
              /* View mode items with refund */
              <>
                <div className="space-y-2">
                  {invoice.items.map((item) => {
                    const metadata = item.metadata as any;
                    const classSlots: string[] = metadata?.selected_class_slots || [];
                    const lineDiscount = metadata?.line_discount;
                    const isRefunded = metadata?.refunded === true;
                    const canRefund = !isRefunded && !isCancelled && isPaidOrVerified;

                    return (
                      <div key={item.id} className={cn("border rounded-lg p-2.5 space-y-1.5", isRefunded && "opacity-60")}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className={cn("text-xs font-medium", isRefunded && "line-through")}>{item.product_name || item.description}</div>
                            {item.size_variant && <div className="text-[10px] text-muted-foreground">Size: {item.size_variant}</div>}
                            {(() => {
                              const itemTermIds: string[] = metadata?.term_ids || (metadata?.term_id ? [metadata.term_id] : []);
                              const termNames = itemTermIds.map((id: string) => termDataMap[id]?.name).filter(Boolean);
                              return termNames.length > 0 ? <div className="text-[10px] text-muted-foreground">Term: {termNames.join(', ')}</div> : null;
                            })()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isRefunded && <Badge variant="secondary" className="text-[10px]">Refunded</Badge>}
                            <div className={cn("text-xs font-semibold whitespace-nowrap", isRefunded && "line-through")}>{formatCurrency(item.total_amount)}</div>
                            {canRefund && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-orange-600 hover:text-orange-700" title="Refund this item" onClick={() => { setRefundItemId(item.id); setRefundReason(''); }}>
                                <Undo2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>{item.quantity} × {formatCurrency(item.unit_price)}</span>
                          {lineDiscount?.value && lineDiscount.value > 0 && <span className="text-orange-600">Disc: {lineDiscount.type === 'percentage' ? `${lineDiscount.value}%` : formatCurrency(lineDiscount.value)}</span>}
                          {item.tax_amount > 0 && <span>Tax: {formatCurrency(item.tax_amount)}</span>}
                        </div>
                        {classSlots.length > 0 && renderClassSlotBadges(classSlots)}
                      </div>
                    );
                  })}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-end">
                  <div className="w-full md:w-64 space-y-1.5">
                    <div className="flex justify-between text-xs md:text-sm"><span>Subtotal:</span><span>{formatCurrency(invoice.subtotal)}</span></div>
                    <div className="flex justify-between text-xs md:text-sm"><span>Tax:</span><span>{formatCurrency(invoice.tax_amount)}</span></div>
                    {invoice.discount_amount > 0 && <div className="flex justify-between text-xs md:text-sm text-green-600"><span>Discount:</span><span>-{formatCurrency(invoice.discount_amount)}</span></div>}
                    <Separator />
                    <div className="flex justify-between font-bold text-sm md:text-base"><span>Total:</span><span>{formatCurrency(invoice.total_amount)}</span></div>
                    <div className="flex justify-between text-xs md:text-sm"><span>Paid:</span><span className="text-green-600">{formatCurrency(invoice.amount_paid)}</span></div>
                    <div className="flex justify-between font-bold text-sm md:text-base"><span>Balance Due:</span><span className={invoice.balance_due > 0 ? 'text-destructive' : 'text-green-600'}>{formatCurrency(invoice.balance_due)}</span></div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* ─── PAYMENTS SECTION ─── */}
          <div>
            <h3 className="text-sm font-medium mb-2">Payments ({payments.length})</h3>
            {payments.length === 0 ? (
              <div className="text-center py-4">
                <CreditCard className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground mb-2">No payments recorded</p>
                {invoice.balance_due > 0 && (
                  <CreatePaymentDialog trigger={<Button size="sm" className="h-7 text-xs"><DollarSign className="h-3 w-3 mr-1" />Record Payment</Button>} preSelectedInvoiceId={invoice.id} onPaymentCreated={loadInvoiceData} />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-2.5 space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-medium">{payment.payment_number}</div>
                        <div className="text-[10px] text-muted-foreground">{formatDate(payment.payment_date)}</div>
                      </div>
                      <div className="text-xs font-semibold text-green-600">{formatCurrency(payment.amount)}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] h-5">{payment.payment_method.replace('_', ' ')}</Badge>
                      <div className="flex items-center gap-0.5">
                        {payment.reference_number && <span className="text-[10px] text-muted-foreground mr-1">Ref: {payment.reference_number}</span>}
                        {payment.proof_of_payment_url && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" asChild><a href={payment.proof_of_payment_url} target="_blank" rel="noopener noreferrer"><Eye className="h-3 w-3" /></a></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => { setPaymentToDelete(payment); setDeleteReason(''); setDeleteDialogOpen(true); }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
                {invoice.balance_due > 0 && (
                  <div className="flex justify-end mt-2">
                    <CreatePaymentDialog trigger={<Button size="sm" className="h-7 text-xs"><DollarSign className="h-3 w-3 mr-1" />Record Another Payment</Button>} preSelectedInvoiceId={invoice.id} onPaymentCreated={loadInvoiceData} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit mode footer */}
          {mode === 'edit' && (
            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={() => setMode('view')} className="h-8 text-xs md:text-sm md:h-10">Cancel</Button>
              <Button onClick={handleSaveWithApproval} disabled={saving} className="h-8 text-xs md:text-sm md:h-10">
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                <Save className="h-3.5 w-3.5 mr-1" />
                {isPaidOrVerified && !isSuperadmin ? 'Submit for Approval' : 'Save Changes'}
              </Button>
            </DialogFooter>
          )}
        </div>
      )}
    </DialogContent>
  );

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {isCreateMode && trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        {dialogContent}
      </Dialog>

      {/* Refund confirmation dialog */}
      <Dialog open={!!refundItemId} onOpenChange={(open) => { if (!open) setRefundItemId(null); }}>
        <DialogContent className="max-w-[95vw] md:max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Refund Item</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              {isSuperadmin ? 'This will refund the item amount as student credit.' : 'This refund request will be sent for superadmin approval.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs md:text-sm">Reason for refund</Label>
            <Textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Enter reason..." rows={2} className="text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundItemId(null)} className="h-8 text-xs md:h-10">Cancel</Button>
            <Button variant="destructive" onClick={handleRefundItem} disabled={isRefunding || !refundReason.trim()} className="h-8 text-xs md:h-10">
              {isRefunding && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {isSuperadmin ? 'Refund Now' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel & Refund Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Cancel Invoice & Refund</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              {isSuperadmin ? 'This will cancel the invoice and refund all payments as student credits.' : 'This cancellation request will be sent to a superadmin for approval.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg space-y-1.5">
              <div className="flex justify-between text-xs md:text-sm"><span className="text-muted-foreground">Invoice:</span><span className="font-medium">{invoice?.invoice_number}</span></div>
              <div className="flex justify-between text-xs md:text-sm"><span className="text-muted-foreground">Total:</span><span className="font-medium">{invoice ? formatCurrency(invoice.total_amount) : ''}</span></div>
              <div className="flex justify-between text-xs md:text-sm"><span className="text-muted-foreground">Paid:</span><span className="font-medium">{invoice ? formatCurrency(invoice.amount_paid) : ''}</span></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs md:text-sm">Reason for cancellation</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Enter reason..." rows={2} className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="h-8 text-xs md:h-10">Cancel</Button>
            <Button variant="destructive" onClick={handleCancelInvoice} disabled={isCancelling} className="h-8 text-xs md:h-10">
              {isCancelling && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {isSuperadmin ? 'Cancel & Refund' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Deletion Request Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Request Payment Deletion</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">This deletion request will be sent to a superadmin for approval.</DialogDescription>
          </DialogHeader>
          {paymentToDelete && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg space-y-1.5">
                <div className="flex justify-between text-xs md:text-sm"><span className="text-muted-foreground">Payment #:</span><span className="font-medium">{paymentToDelete.payment_number}</span></div>
                <div className="flex justify-between text-xs md:text-sm"><span className="text-muted-foreground">Amount:</span><span className="font-medium text-green-600">{formatCurrency(paymentToDelete.amount)}</span></div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs md:text-sm">Reason for deletion (optional)</Label>
                <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Please provide a reason..." rows={2} className="text-xs" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="h-8 text-xs md:h-10">Cancel</Button>
            <Button variant="destructive" onClick={handleSubmitDeleteRequest} disabled={isSubmittingDelete} className="h-8 text-xs md:h-10">
              {isSubmittingDelete && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grading prerequisite override (superadmin) */}
      <AlertDialog open={prerequisiteOverrideOpen} onOpenChange={setPrerequisiteOverrideOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Override grading prerequisite?</AlertDialogTitle>
            <AlertDialogDescription>
              {students.find(s => s.id === formData.student_id)?.name || 'This student'} has no paid term invoice for the current term at {branches.find(b => b.id === formData.branch_id)?.name || 'this branch'}. As superadmin you can issue this grading invoice anyway. Proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                prerequisiteOverriddenRef.current = true;
                setPrerequisiteOverrideOpen(false);
                handleSubmit({ preventDefault: () => {} } as React.FormEvent);
              }}
            >
              Override and create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InvoiceDialog;
