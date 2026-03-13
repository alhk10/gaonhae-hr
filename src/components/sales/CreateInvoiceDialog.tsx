/**
 * Create Invoice Dialog Component
 * Form for creating new invoices in the sales module
 * Supports branch-based access control for non-superadmin users
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createInvoice, getSiblingDiscount, type CreateInvoiceData } from '@/services/invoiceService';
import { getStudents } from '@/services/studentService';
import { getProducts, getProductCategories } from '@/services/productService';
import { getGradingSlots, type GradingSlot } from '@/services/gradingService';
import { supabase } from '@/integrations/supabase/client';
import { useInvoiceAccess } from '@/hooks/useInvoiceAccess';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTotalDiscount, submitDiscountApproval, DISCOUNT_APPROVAL_THRESHOLD } from '@/services/invoiceDiscountApprovalService';
import { Loader2, Plus, Trash2, Check, ChevronsUpDown, Percent, DollarSign } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { COUNTRY_TAX_RATES, DEFAULT_TAX_RATE, COUNTRY_TAX_INCLUDED, DEFAULT_TAX_INCLUDED } from '@/config/constants';
import type { Term } from '@/services/termCalendarService';
import ClassScheduleSelector from '@/components/dashboard/ClassScheduleSelector';
import { differenceInYears, differenceInMonths } from 'date-fns';

interface CreateInvoiceDialogProps {
  trigger: React.ReactNode;
  onInvoiceCreated?: () => void;
  branchId?: string;
}

// Calculate age in decimal years
function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const years = differenceInYears(today, dob);
  const monthsAfterBirthday = differenceInMonths(today, dob) % 12;
  return years + (monthsAfterBirthday / 12);
}

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
  available_variants?: {
    sizes?: string[];
    colors?: string[];
  };
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

// Grading category ID for validation
const GRADING_CATEGORY_ID = '31514844-78dc-43f2-bf07-41d124d175e2';
const GRADING_DUPLICATE_CHECK_DAYS = 60;

// Belt progression order for filtering products
const BELT_LEVELS = [
  'Foundation 1', 'Foundation 2', 'Foundation 3',
  'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
  'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
  'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4',
  'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5'
];

// Normalize belt format: "green-tip" or "Green Tip" → "Green Tip"
const normalizeBelt = (belt: string): string => {
  if (!belt) return '';
  return belt.split(/[-\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Check if student belt is in product's allowed belt levels
const isProductAvailableForBelt = (
  product: ProductWithVariants,
  studentBelt: string
): boolean => {
  if (!product.requires_belt_level) return true;
  if (!product.allowed_belt_levels || product.allowed_belt_levels.length === 0) return true;
  const normalizedStudentBelt = normalizeBelt(studentBelt);
  if (!normalizedStudentBelt) return true;
  return product.allowed_belt_levels.includes(normalizedStudentBelt);
};

// Check if a grading product matches the student's current belt transition
// Grading products follow the pattern "CurrentBelt >> NextBelt"
const isGradingProductForBelt = (productName: string, studentBelt: string): boolean => {
  if (!studentBelt) return true; // Show all if no belt info
  const normalizedBelt = normalizeBelt(studentBelt);
  if (!normalizedBelt) return true;
  
  // Extract the "from" belt from product name (e.g., "White >> Yellow Tip" → "White")
  const parts = productName.split('>>').map(p => p.trim());
  if (parts.length !== 2) return true; // Not a belt transition product, show it
  
  const fromBelt = normalizeBelt(parts[0]);
  return fromBelt === normalizedBelt;
};

// Check if a product's allowed class types are suitable for a student's age
const isProductAvailableForAge = (
  product: ProductWithVariants,
  studentAge: number,
  classTypeAgeSettings: Array<{ class_type: string; min_age: number | null; max_age: number | null }>
): boolean => {
  if (!studentAge || studentAge <= 0) return true;
  if (!product.allowed_class_types || product.allowed_class_types.length === 0) return true;
  if (classTypeAgeSettings.length === 0) return true;
  
  // Product is available if at least one of its allowed class types fits the student's age
  return product.allowed_class_types.some(classType => {
    const setting = classTypeAgeSettings.find(s => s.class_type === classType);
    if (!setting) return true; // No age restriction defined for this class type
    const minOk = setting.min_age === null || studentAge >= setting.min_age;
    const maxOk = setting.max_age === null || studentAge <= setting.max_age;
    return minOk && maxOk;
  });
};

// Fuzzy match: checks if all characters of query appear in order within target
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

// Calculate line total with discount
const calculateLineTotal = (qty: number, price: number, discountType?: 'percentage' | 'amount', discountValue?: number): number => {
  const gross = qty * price;
  if (!discountType || !discountValue || discountValue <= 0) return gross;
  if (discountType === 'percentage') return gross - (gross * discountValue / 100);
  return gross - discountValue;
};

// Searchable student select component with fuzzy matching
const StudentSearchSelect: React.FC<{
  students: Array<{id: string, name: string}>;
  value: string;
  onValueChange: (value: string) => void;
}> = ({ students, value, onValueChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedName = students.find(s => s.id === value)?.name;

  const filtered = search.trim()
    ? students.filter(s => fuzzyMatch(s.name, search.trim()))
    : students;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selectedName || <span className="text-muted-foreground">Select student</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search student..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No student found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((student) => (
                <CommandItem key={student.id} value={student.id} onSelect={() => { onValueChange(student.id); setOpen(false); setSearch(''); }}>
                  <Check className={cn('mr-2 h-4 w-4', value === student.id ? 'opacity-100' : 'opacity-0')} />
                  {student.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Searchable product select component with fuzzy matching
const ProductSearchSelect: React.FC<{
  products: ProductWithVariants[];
  value: string;
  onValueChange: (value: string) => void;
  outOfCriteriaIds?: Set<string>;
}> = ({ products, value, onValueChange, outOfCriteriaIds }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedName = products.find(p => p.id === value)?.name;

  const filtered = search.trim()
    ? products.filter(p => {
        const q = search.trim();
        if (fuzzyMatch(p.name, q) || fuzzyMatch(p.sku, q)) return true;
        // Also match against allowed_class_types
        if (p.allowed_class_types?.some(ct => fuzzyMatch(ct, q))) return true;
        return false;
      })
    : products;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-8 w-32 justify-between font-normal text-xs px-2">
          {selectedName ? <span className="truncate">{selectedName}</span> : <span className="text-muted-foreground">Product</span>}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search product..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

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

const CreateInvoiceDialog: React.FC<CreateInvoiceDialogProps> = ({ trigger, onInvoiceCreated, branchId: lockedBranchId }) => {
  const { user, userrole } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Array<{id: string, name: string, email: string, branch_id?: string, status?: string, current_belt?: string, date_of_birth?: string}>>([]);
  const [selectedClassSlots, setSelectedClassSlots] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [branches, setBranches] = useState<Array<{id: string, name: string, country: string | null}>>([]);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set());
  const { accessibleBranches, isSuperadmin, canCreate } = useInvoiceAccess();
  
  // Term state for Classes category
  const [branchTerms, setBranchTerms] = useState<Term[]>([]);
  const [termLoading, setTermLoading] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);
  
  // Grading slots state for Grading Fees category
  const [gradingSlots, setGradingSlots] = useState<GradingSlot[]>([]);
  const [gradingSlotsLoading, setGradingSlotsLoading] = useState(false);
  
  // Class type age settings for product filtering
  const [classTypeAgeSettings, setClassTypeAgeSettings] = useState<Array<{ class_type: string; min_age: number | null; max_age: number | null }>>([]);
  
  // Tax inclusion toggle state
  const [taxIncluded, setTaxIncluded] = useState<boolean | null>(null); // null = use branch default
  const taxManuallySet = useRef(false);
  
  const [formData, setFormData] = useState({
    student_id: '',
    branch_id: '',
    notes: '',
    internal_notes: ''
  });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItem, setNewItem] = useState({
    product_id: '',
    category_id: '',
    quantity: 1,
    unit_price: 0,
    size_variant: '',
    color_variant: '',
    term_id: '',
    grading_slot_id: ''
  });

  useEffect(() => {
    if (open) {
      loadStudents();
      loadProducts();
      loadBranches();
      loadCategories();
      loadGradingSlots();
      
      // Auto-lock branch if branchId prop is provided
      if (lockedBranchId) {
        setFormData(prev => ({ ...prev, branch_id: lockedBranchId }));
        loadBranchTerms(lockedBranchId);
        loadClassTypeAgeSettings(lockedBranchId);
      }
    }
  }, [open]);

  // Auto-select branch if only 1 available
  const availableBranches = branches
    .filter(b => !['Competition', 'Headquarters'].includes(b.name))
    .filter(b => isSuperadmin || canCreate(b.id));

  useEffect(() => {
    if (availableBranches.length === 1 && !formData.branch_id) {
      handleInputChange('branch_id', availableBranches[0].id);
    }
  }, [availableBranches.length, formData.branch_id]);

  // Fetch branch-specific hidden product IDs when branch changes
  useEffect(() => {
    const fetchHiddenProducts = async () => {
      if (!formData.branch_id) {
        setHiddenProductIds(new Set());
        return;
      }
      try {
        const { data, error } = await supabase
          .from('price_rules')
          .select('product_id')
          .eq('branch_id', formData.branch_id)
          .eq('is_active', false);
        
        if (error) throw error;
        setHiddenProductIds(new Set((data || []).map(r => r.product_id)));
      } catch (err) {
        console.error('Error fetching hidden products:', err);
        setHiddenProductIds(new Set());
      }
    };
    fetchHiddenProducts();
  }, [formData.branch_id]);

  // Load grading slots for Grading Fees category
  const loadGradingSlots = async () => {
    setGradingSlotsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const slots = await getGradingSlots({
        status: 'active',
        from_date: today
      });
      setGradingSlots(slots);
    } catch (error) {
      console.error('Error loading grading slots:', error);
    } finally {
      setGradingSlotsLoading(false);
    }
  };
  
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
        date_of_birth: s.date_of_birth
      })));
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    }
  };

  // Filter students by active status and selected branch
  const filteredStudents = students.filter(s => {
    const isActive = s.status === 'active';
    const matchesBranch = !formData.branch_id || s.branch_id === formData.branch_id;
    return isActive && matchesBranch;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Auto-select student if only 1 filtered student available
  useEffect(() => {
    if (filteredStudents.length === 1 && !formData.student_id) {
      handleInputChange('student_id', filteredStudents[0].id);
    }
  }, [filteredStudents.length, formData.student_id, formData.branch_id]);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, country')
        .order('name');
      
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getProductCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await getProducts(1, 1000);
      setProducts(response.products.map(p => ({ 
        id: p.id, 
        name: p.name, 
        sku: p.sku,
        base_price: p.base_price,
        category_id: p.category_id,
        available_variants: p.available_variants,
        available_sizes: p.available_sizes,
        requires_size: p.requires_size,
        requires_belt_level: p.requires_belt_level,
        allowed_belt_levels: p.allowed_belt_levels,
        allowed_class_types: p.allowed_class_types,
        lesson_days: p.lesson_days,
        lessons_per_week: p.lessons_per_week,
        min_age: p.min_age,
        max_age: p.max_age
      })));
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  // Fetch branch-specific price override for a product
  const getBranchPrice = async (productId: string, branchId: string): Promise<number | null> => {
    if (!productId || !branchId) return null;
    try {
      const { data, error } = await supabase
        .from('price_rules')
        .select('price_override, is_active')
        .eq('product_id', productId)
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error || !data) return null;
      return data.price_override;
    } catch {
      return null;
    }
  };

  // Check if a grading invoice already exists for this student and product in the last 60 days
  const checkExistingGradingInvoice = async (
    studentId: string, 
    productId: string
  ): Promise<{ exists: boolean; productName?: string; createdAt?: string }> => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - GRADING_DUPLICATE_CHECK_DAYS);
    
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          product_id,
          products!inner(name, category_id),
          invoices!inner(student_id, created_at, status)
        `)
        .eq('product_id', productId)
        .eq('invoices.student_id', studentId)
        .neq('invoices.status', 'cancelled')
        .gte('invoices.created_at', sixtyDaysAgo.toISOString());
      
      if (error || !data || data.length === 0) {
        return { exists: false };
      }
      
      const invoiceData = data[0].invoices as unknown as { created_at: string };
      const productData = data[0].products as unknown as { name: string };
      
      return { 
        exists: true, 
        productName: productData?.name,
        createdAt: invoiceData?.created_at
      };
    } catch (error) {
      console.error('Error checking existing grading invoice:', error);
      return { exists: false };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_id) {
      toast.error('Please select a student');
      return;
    }

    if (!formData.branch_id) {
      toast.error('Please select a branch');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      // Check if invoice contains grading items — if so, validate term invoice is paid
      const hasGradingItem = items.some(item => {
        const product = products.find(p => p.id === item.product_id);
        return product?.category_id === GRADING_CATEGORY_ID;
      });
      const hasTermItem = items.some(item => !!item.term_id);

      if (hasGradingItem && !hasTermItem) {
        // Check if student has a paid/verified term invoice
        const { data: studentInvoices } = await supabase
          .from('invoices')
          .select('id, status')
          .eq('student_id', formData.student_id)
          .in('status', ['paid', 'verified']);

        const paidInvoiceIds = (studentInvoices || []).map(i => i.id);
        let hasTermPaid = false;

        if (paidInvoiceIds.length > 0) {
          // Check if any paid invoice has a term item for an active term
          const today = new Date().toISOString().split('T')[0];
          const { data: activeTerms } = await supabase
            .from('term_calendars')
            .select('id')
            .eq('branch_id', formData.branch_id)
            .eq('is_active', true)
            .gte('end_date', today);

          if (activeTerms && activeTerms.length > 0) {
            const termIds = activeTerms.map(t => t.id);
            const { data: termItems } = await supabase
              .from('invoice_items')
              .select('id, metadata')
              .in('invoice_id', paidInvoiceIds);

            hasTermPaid = (termItems || []).some(item => {
              const meta = item.metadata as any;
              return meta?.term_id && termIds.includes(meta.term_id);
            });
          } else {
            // No active terms = no restriction
            hasTermPaid = true;
          }
        }

        if (!hasTermPaid) {
          toast.error('This student must have a paid term invoice before creating a grading invoice. Please create and pay the term invoice first, or include a term item in this invoice.');
          setLoading(false);
          return;
        }
      }

      // Check for duplicate grading products in the last 60 days
      for (const item of items) {
        const product = products.find(p => p.id === item.product_id);
        if (product?.category_id === GRADING_CATEGORY_ID) {
          const duplicateCheck = await checkExistingGradingInvoice(
            formData.student_id, 
            item.product_id
          );
          
          if (duplicateCheck.exists) {
            const date = duplicateCheck.createdAt 
              ? new Date(duplicateCheck.createdAt).toLocaleDateString() 
              : 'recently';
            toast.error(
              `This student already has an invoice for "${duplicateCheck.productName}" created on ${date}. Only 1 grading of the same type allowed per 60 days.`
            );
            setLoading(false);
            return;
          }
        }
      }

      const invoiceData: CreateInvoiceData = {
        student_id: formData.student_id,
        branch_id: formData.branch_id || undefined,
        payment_terms_days: 30,
        notes: formData.notes || undefined,
        internal_notes: formData.internal_notes || undefined,
        tax_included: taxIncluded !== null ? taxIncluded : undefined,
        items: items.map(item => {
          const lineDiscount = item.discount_type && item.discount_value && item.discount_value > 0
            ? { discount_type: item.discount_type, discount_value: item.discount_value }
            : undefined;

          return {
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            size_variant: item.size_variant || undefined,
            total_override: item.total,
            metadata: {
              ...(item.term_id ? { term_id: item.term_id } : {}),
              ...(item.selected_class_slots?.length ? { selected_class_slots: item.selected_class_slots } : {}),
              ...(item.grading_slot_id ? { grading_slot_id: item.grading_slot_id } : {}),
              ...(lineDiscount ? { line_discount: lineDiscount } : {})
            }
          };
        })
      };

      // Check if any line item uses an out-of-criteria product (exception)
      const hasExceptionProduct = items.some(item => outOfCriteriaProductIds.has(item.product_id));

      // Check if total discount exceeds threshold — require superadmin approval (unless user IS superadmin)
      const totalDiscount = calculateTotalDiscount(items);
      const needsDiscountApproval = totalDiscount > DISCOUNT_APPROVAL_THRESHOLD && userrole !== 'superadmin';
      const needsExceptionApproval = hasExceptionProduct && userrole !== 'superadmin';

      if (needsDiscountApproval || needsExceptionApproval) {
        const studentName = students.find(s => s.id === formData.student_id)?.name || 'Unknown';
        const branchName = branches.find(b => b.id === formData.branch_id)?.name || null;
        const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

        await submitDiscountApproval(
          invoiceData,
          studentName,
          branchName,
          totalDiscount,
          totalAmount,
          user?.email || null
        );

        const reason = needsExceptionApproval
          ? 'This invoice includes products outside the student\'s criteria and requires superadmin approval.'
          : `Invoice discount of $${totalDiscount.toFixed(2)} requires superadmin approval. Request submitted.`;
        toast.success(reason);
        setOpen(false);
        resetForm();
        onInvoiceCreated?.();
        return;
      }

      await createInvoice(invoiceData);
      
      toast.success('Invoice created successfully');
      setOpen(false);
      resetForm();
      onInvoiceCreated?.();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      branch_id: lockedBranchId || '',
      notes: '',
      internal_notes: ''
    });
    setItems([]);
    setNewItem({
      product_id: '',
      category_id: '',
      quantity: 1,
      unit_price: 0,
      size_variant: '',
      color_variant: '',
      term_id: '',
      grading_slot_id: ''
    });
    setBranchTerms([]);
    setTermError(null);
    setSelectedClassSlots([]);
    setTaxIncluded(null);
    taxManuallySet.current = false;
  };

  const handleInputChange = async (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'branch_id') {
      setSelectedClassSlots([]);
      loadBranchTerms(value);
      loadClassTypeAgeSettings(value);
      
      // Reset tax inclusion to branch default when branch changes
      if (!taxManuallySet.current) {
        const selectedBranch = branches.find(b => b.id === value);
        const country = selectedBranch?.country || null;
        const defaultInclusive = country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED;
        setTaxIncluded(defaultInclusive);
      }
      
      if (selectedCategory?.name === 'Classes' && formData.student_id) {
        const selectedTermId = await refreshTermSelection(value, formData.student_id);
        setNewItem(prev => ({ ...prev, term_id: selectedTermId }));
      }
    }
    
    if (field === 'student_id') {
      setSelectedClassSlots([]);
      if (selectedCategory?.name === 'Classes' && formData.branch_id) {
        const selectedTermId = await refreshTermSelection(formData.branch_id, value);
        setNewItem(prev => ({ ...prev, term_id: selectedTermId }));
      }
    }
  };

  // Load terms for the selected branch
  const loadBranchTerms = async (branchId: string) => {
    if (!branchId) {
      setBranchTerms([]);
      return;
    }
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('term_calendars')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .gte('end_date', today)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      setBranchTerms((data || []) as Term[]);
    } catch (error: any) {
      console.error('[loadBranchTerms] Error loading terms:', error);
      if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
        setTermError('Session expired. Please refresh the page.');
      }
      setBranchTerms([]);
    }
  };
  // Load class type age settings for the selected branch
  const loadClassTypeAgeSettings = async (branchId: string) => {
    if (!branchId) {
      setClassTypeAgeSettings([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('branch_class_type_settings')
        .select('class_type, min_age, max_age')
        .eq('branch_id', branchId);
      if (error) throw error;
      setClassTypeAgeSettings(data || []);
    } catch (error) {
      console.error('Error loading class type age settings:', error);
      setClassTypeAgeSettings([]);
    }
  };


  const checkExistingClassInvoice = async (
    studentId: string, 
    termId: string
  ): Promise<boolean> => {
    if (!studentId || !termId) return false;
    
    try {
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', studentId);
      
      if (invError || !invoices?.length) return false;
      
      const invoiceIds = invoices.map(i => i.id);
      
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('id, metadata')
        .in('invoice_id', invoiceIds);
      
      if (itemsError) return false;
      
      return (items || []).some(item => {
        const metadata = item.metadata as Record<string, any> | null;
        return metadata?.term_id === termId;
      });
    } catch (error) {
      console.error('Error checking existing invoice:', error);
      return false;
    }
  };

  // Refresh term selection
  const refreshTermSelection = async (branchId: string, studentId: string): Promise<string> => {
    if (!branchId || !studentId) return '';
    
    setTermLoading(true);
    setTermError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: termsData, error: termsError } = await supabase
        .from('term_calendars')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .gte('end_date', today)
        .order('start_date', { ascending: true });
      
      if (termsError) throw termsError;
      
      const availableTerms = (termsData || []) as Term[];
      setBranchTerms(availableTerms);
      
      if (availableTerms.length === 0) {
        setTermError('No active terms available for this branch');
        return '';
      }
      
      const currentTerm = availableTerms.find(t => 
        t.start_date <= today && t.end_date >= today
      );
      
      if (currentTerm) {
        const hasExisting = await checkExistingClassInvoice(studentId, currentTerm.id);
        
        if (hasExisting) {
          const nextTerm = availableTerms.find(t => t.start_date > currentTerm.end_date);
          
          if (nextTerm) {
            return nextTerm.id;
          } else {
            setTermError('No next term available. Student already has classes invoiced for current term.');
            return '';
          }
        } else {
          return currentTerm.id;
        }
      } else {
        return availableTerms[0].id;
      }
    } catch (error: any) {
      console.error('[refreshTermSelection] Error:', error);
      if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
        setTermError('Session expired. Please refresh the page.');
      }
      return '';
    } finally {
      setTermLoading(false);
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const selectedBranch = branches.find(b => b.id === formData.branch_id);
    
    let defaultQuantity = 1;
    let selectedTermId = '';
    
    setTermError(null);
    setSelectedClassSlots([]);
    
    if (category?.name === 'Classes') {
      if (selectedBranch?.country === 'Singapore') {
        defaultQuantity = 12;
      } else if (selectedBranch?.country === 'Australia') {
        defaultQuantity = 10;
      }
      
      // Ensure terms are loaded for the current branch
      if (formData.branch_id && branchTerms.length === 0) {
        await loadBranchTerms(formData.branch_id);
      }
      
      if (formData.branch_id && formData.student_id) {
        selectedTermId = await refreshTermSelection(formData.branch_id, formData.student_id);
      }
    }
    
    setNewItem(prev => ({
      ...prev,
      category_id: categoryId,
      product_id: '',
      quantity: defaultQuantity,
      unit_price: 0,
      size_variant: '',
      color_variant: '',
      term_id: selectedTermId,
      grading_slot_id: ''
    }));
  };

  // Handle product change
  const handleProductChange = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    
    // Auto-fill category from product
    const productCategory = product ? categories.find(c => c.id === product.category_id) : null;
    const isClassesCategory = productCategory?.name === 'Classes';
    
    let selectedTermId = newItem.term_id;
    
    if (isClassesCategory && formData.branch_id) {
      // Ensure terms are loaded
      if (branchTerms.length === 0) {
        await loadBranchTerms(formData.branch_id);
      }
      if (formData.student_id) {
        selectedTermId = await refreshTermSelection(formData.branch_id, formData.student_id);
      }
    }

    // Check for branch-specific pricing
    let unitPrice = product?.base_price || 0;
    if (product && formData.branch_id) {
      const branchPrice = await getBranchPrice(product.id, formData.branch_id);
      if (branchPrice !== null) {
        unitPrice = branchPrice;
      }
    }
    
    setNewItem(prev => ({
      ...prev,
      product_id: productId,
      category_id: product?.category_id || prev.category_id,
      unit_price: unitPrice,
      size_variant: '',
      color_variant: '',
      term_id: selectedTermId
    }));
  };

  const handleNewItemChange = (field: string, value: any) => {
    if (field === 'term_id') {
      setSelectedClassSlots([]);
    }
    
    setNewItem(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'product_id' && value) {
        const product = products.find(p => p.id === value);
        if (product) {
          updated.unit_price = product.base_price;
          updated.size_variant = '';
          updated.color_variant = '';
        }
      }
      
      return updated;
    });
  };

  // Get selected student's belt for filtering
  const selectedStudent = students.find(s => s.id === formData.student_id);
  const studentBelt = selectedStudent?.current_belt || '';

  // Calculate student age for class schedule filtering
  const studentAge = useMemo(() => {
    if (!selectedStudent?.date_of_birth) return 0;
    return calculateAge(selectedStudent.date_of_birth);
  }, [selectedStudent?.date_of_birth]);

  // Get filtered grading slots based on selected branch and student's current belt
  const getFilteredGradingSlots = (): GradingSlot[] => {
    let filtered = gradingSlots;
    
    if (formData.branch_id) {
      filtered = filtered.filter(slot => 
        slot.branch_id === formData.branch_id || 
        (slot.available_branch_ids && slot.available_branch_ids.includes(formData.branch_id))
      );
    }
    
    if (studentBelt) {
      const normalizedStudentBelt = normalizeBelt(studentBelt);
      filtered = filtered.filter(slot => {
        if (!slot.belt_levels || slot.belt_levels.length === 0) return false;
        return slot.belt_levels.some(beltLevel => 
          normalizeBelt(beltLevel) === normalizedStudentBelt
        );
      });
    }

    // Filter by student age against slot's min_age/max_age
    if (studentAge > 0) {
      filtered = filtered.filter(slot => {
        const minOk = slot.min_age == null || studentAge >= slot.min_age;
        const maxOk = slot.max_age == null || studentAge <= slot.max_age;
        return minOk && maxOk;
      });
    }
    
    return filtered;
  };

  // Get filtered products — show all products (except hidden), only grading products still filter by belt transition
  const filteredProducts = products.filter(p => {
    const matchesCategory = !newItem.category_id || p.category_id === newItem.category_id;
    const notHidden = !hiddenProductIds.has(p.id);
    
    // For grading products: always filter by student's current belt transition (belt-specific by nature)
    const isGradingProduct = p.category_id === GRADING_CATEGORY_ID;
    const matchesGradingBelt = !isGradingProduct || !formData.student_id || isGradingProductForBelt(p.name, studentBelt);
    
    return matchesCategory && matchesGradingBelt && notHidden;
  });

  // Identify products that are outside the student's normal belt/age criteria (for visual flagging)
  const outOfCriteriaProductIds = useMemo(() => {
    if (!formData.student_id) return new Set<string>();
    const ids = new Set<string>();
    for (const p of products) {
      if (p.category_id === GRADING_CATEGORY_ID) continue; // grading products have their own filter
      const beltOk = isProductAvailableForBelt(p, studentBelt);
      const branchAgeOk = isProductAvailableForAge(p, studentAge, classTypeAgeSettings);
      const productAgeOk = studentAge <= 0 || (
        (p.min_age == null || studentAge >= p.min_age) &&
        (p.max_age == null || studentAge <= p.max_age)
      );
      if (!beltOk || !branchAgeOk || !productAgeOk) {
        ids.add(p.id);
      }
    }
    return ids;
  }, [products, formData.student_id, studentBelt, studentAge, classTypeAgeSettings]);

  // Auto-select product if only 1 option available
  useEffect(() => {
    if (newItem.category_id && filteredProducts.length === 1 && !newItem.product_id) {
      const singleProduct = filteredProducts[0];
      handleProductChange(singleProduct.id);
    }
  }, [filteredProducts.length, newItem.category_id, newItem.product_id]);

  // Auto-select term if only 1 option available for Classes category
  useEffect(() => {
    const categoryName = categories.find(c => c.id === newItem.category_id)?.name;
    if (categoryName === 'Classes' && branchTerms.length === 1 && !newItem.term_id) {
      handleNewItemChange('term_id', branchTerms[0].id);
    }
  }, [branchTerms.length, newItem.category_id, newItem.term_id, categories]);

  // Auto-select grading slot if only 1 option available for Grading Fees category
  useEffect(() => {
    const categoryName = categories.find(c => c.id === newItem.category_id)?.name;
    const filteredSlots = getFilteredGradingSlots();
    if (categoryName === 'Grading' && filteredSlots.length === 1 && !newItem.grading_slot_id) {
      handleNewItemChange('grading_slot_id', filteredSlots[0].id);
    }
  }, [gradingSlots, formData.branch_id, studentBelt, newItem.category_id, newItem.grading_slot_id, categories]);

  // Get selected product's variants — merge available_variants.sizes with legacy available_sizes
  const selectedProduct = products.find(p => p.id === newItem.product_id);
  const sizeOptions = selectedProduct?.available_variants?.sizes?.length
    ? selectedProduct.available_variants.sizes
    : (selectedProduct?.available_sizes || []);
  const colorOptions = selectedProduct?.available_variants?.colors || [];

  const selectedCategory = categories.find(c => c.id === newItem.category_id);
  
  // Show size input for uniform/apparel products even without requires_size flag
  const UNIFORMS_CATEGORY_ID = 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c';
  const isUniformProduct = selectedProduct?.category_id === UNIFORMS_CATEGORY_ID;
  const showSizeInput = sizeOptions.length > 0 || selectedProduct?.requires_size || isUniformProduct;

  const addItem = async () => {
    if (!newItem.product_id) {
      toast.error('Please select a product');
      return;
    }

    const product = products.find(p => p.id === newItem.product_id);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    // Validate size selection for products with size variants, requires_size flag, or uniform category
    if (showSizeInput && !newItem.size_variant) {
      toast.error('Please select or enter a size for this product');
      return;
    }

    // Check if adding a grading product and one already exists in current items
    const isGradingProduct = product.category_id === GRADING_CATEGORY_ID;
    if (isGradingProduct) {
      const existingGradingItem = items.find(item => {
        const itemProduct = products.find(p => p.id === item.product_id);
        return itemProduct?.category_id === GRADING_CATEGORY_ID;
      });
      
      if (existingGradingItem) {
        toast.error('Only 1 grading product allowed per invoice. Please remove the existing grading item first.');
        return;
      }
    }

    // Validate term for Classes category (only if terms are available)
    if (selectedCategory?.name === 'Classes' && branchTerms.length > 0) {
      if (!newItem.term_id) {
        toast.error('Please select a term for class items');
        return;
      }
      if (termError) {
        toast.error(termError);
        return;
      }
    }

    const term = branchTerms.find(t => t.id === newItem.term_id);
    const gradingSlot = gradingSlots.find(s => s.id === newItem.grading_slot_id);

    // Auto-apply sibling discount for term items
    let siblingDiscountType: 'amount' | undefined;
    let siblingDiscountValue: number | undefined;
    
    if (term && formData.student_id) {
      const discount = await getSiblingDiscount(formData.student_id);
      if (discount > 0) {
        siblingDiscountType = 'amount';
        siblingDiscountValue = discount;
        toast.info(`Sibling discount of $${discount.toFixed(2)} auto-applied`);
      }
    }

    const lineTotal = calculateLineTotal(
      newItem.quantity, 
      newItem.unit_price, 
      siblingDiscountType, 
      siblingDiscountValue
    );

    const item: InvoiceItem = {
      product_id: newItem.product_id,
      product_name: product.name,
      description: product.name,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      size_variant: newItem.size_variant || undefined,
      color_variant: newItem.color_variant || undefined,
      term_id: newItem.term_id || undefined,
      term_name: term?.name || undefined,
      grading_slot_id: newItem.grading_slot_id || undefined,
      grading_slot_title: gradingSlot?.title || undefined,
      selected_class_slots: selectedClassSlots.length > 0 ? [...selectedClassSlots] : undefined,
      discount_type: siblingDiscountType,
      discount_value: siblingDiscountValue,
      total: lineTotal
    };

    setItems([...items, item]);
    setSelectedClassSlots([]);
    setNewItem({
      product_id: '',
      category_id: '',
      quantity: 1,
      unit_price: 0,
      size_variant: '',
      color_variant: '',
      term_id: '',
      grading_slot_id: ''
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, value: string) => {
    const updatedItems = [...items];
    const parsed = parseInt(value);
    const quantity = value === '' ? 0 : (isNaN(parsed) ? 1 : parsed);
    updatedItems[index].quantity = quantity;
    updatedItems[index].total = calculateLineTotal(quantity || 1, updatedItems[index].unit_price, updatedItems[index].discount_type, updatedItems[index].discount_value);
    setItems(updatedItems);
  };

  const finalizeItemQuantity = (index: number) => {
    const updatedItems = [...items];
    if (updatedItems[index].quantity < 1) {
      updatedItems[index].quantity = 1;
      updatedItems[index].total = calculateLineTotal(1, updatedItems[index].unit_price, updatedItems[index].discount_type, updatedItems[index].discount_value);
      setItems(updatedItems);
    }
  };

  const updateItemPrice = (index: number, price: number) => {
    const updatedItems = [...items];
    updatedItems[index].unit_price = price;
    updatedItems[index].total = calculateLineTotal(updatedItems[index].quantity, price, updatedItems[index].discount_type, updatedItems[index].discount_value);
    setItems(updatedItems);
  };

  const updateItemDiscount = (index: number, type: 'percentage' | 'amount', value: number) => {
    const updatedItems = [...items];
    updatedItems[index].discount_type = type;
    updatedItems[index].discount_value = value;
    updatedItems[index].total = calculateLineTotal(updatedItems[index].quantity, updatedItems[index].unit_price, type, value);
    setItems(updatedItems);
  };

  // Get the tax rate and inclusion setting based on selected branch country
  const getSelectedBranchTaxConfig = (): { rate: number; isInclusive: boolean } => {
    const selectedBranch = branches.find(b => b.id === formData.branch_id);
    const country = selectedBranch?.country || null;
    const rate = country ? (COUNTRY_TAX_RATES[country] ?? DEFAULT_TAX_RATE) : DEFAULT_TAX_RATE;
    // Use manual override if set, otherwise fall back to branch/country default
    const isInclusive = taxIncluded !== null
      ? taxIncluded
      : (country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED);
    return { rate, isInclusive };
  };

  const calculateTotals = () => {
    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
    const { rate, isInclusive } = getSelectedBranchTaxConfig();
    const taxRateDecimal = rate / 100;
    
    let subtotal: number;
    let taxAmount: number;
    let total: number;
    
    if (isInclusive) {
      total = itemsTotal;
      subtotal = itemsTotal / (1 + taxRateDecimal);
      taxAmount = total - subtotal;
    } else {
      subtotal = itemsTotal;
      taxAmount = subtotal * taxRateDecimal;
      total = subtotal + taxAmount;
    }
    
    return { subtotal, taxAmount, total, taxRate: rate, isInclusive };
  };

  const { subtotal, taxAmount, total, taxRate, isInclusive } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto top-[5%] translate-y-0">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Create New Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
          {/* Invoice Details - Branch first, then Student */}
          <div className="space-y-2 md:space-y-4">
            <h3 className="text-sm md:text-lg font-medium">Invoice Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="branch_id" className="text-xs md:text-sm">Branch *</Label>
                {lockedBranchId ? (
                  <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted text-sm">
                    {branches.find(b => b.id === lockedBranchId)?.name || lockedBranchId}
                  </div>
                ) : (
                  <Select value={formData.branch_id} onValueChange={(value) => handleInputChange('branch_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBranches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name} {branch.country && `(${branch.country})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="student_id" className="text-xs md:text-sm">Student *</Label>
                <StudentSearchSelect
                  students={filteredStudents}
                  value={formData.student_id}
                  onValueChange={(value) => {
                    handleInputChange('student_id', value);
                    const student = students.find(s => s.id === value);
                    if (student?.branch_id && !formData.branch_id) {
                      handleInputChange('branch_id', student.branch_id);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Invoice Items Section */}
          <div className="space-y-2 md:space-y-4">
            <h3 className="text-sm md:text-lg font-medium">Invoice Items</h3>

            {/* === MOBILE CARD LAYOUT === */}
            <div className="md:hidden space-y-2">
              {/* Existing Items as compact cards */}
              {items.map((item, index) => {
                const itemProduct = products.find(p => p.id === item.product_id);
                const itemCategory = categories.find(c => c.id === itemProduct?.category_id);
                return (
                  <div key={index} className="border rounded-md p-2 space-y-1 text-xs">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground">{itemCategory?.name || '-'} · </span>
                        <span className="font-medium">{item.product_name}</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-6 w-6 shrink-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Qty:</span>
                        <Input type="number" min="1" value={item.quantity || ''} onChange={(e) => updateItemQuantity(index, e.target.value)} onBlur={() => finalizeItemQuantity(index)} className="w-12 h-6 text-xs px-1" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Price:</span>
                        <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)} className="w-16 h-6 text-xs px-1" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Disc:</span>
                        <LineDiscountPopover discountType={item.discount_type} discountValue={item.discount_value} onChange={(type, value) => updateItemDiscount(index, type, value)} />
                      </div>
                      <span className="font-medium ml-auto">${item.total.toFixed(2)}</span>
                    </div>
                    {(item.size_variant || item.color_variant || item.term_name || item.grading_slot_title) && (
                      <div className="text-muted-foreground flex gap-2 flex-wrap">
                        {item.size_variant && <span>Size: {item.size_variant}</span>}
                        {item.color_variant && <span>Color: {item.color_variant}</span>}
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
                  <Select value={newItem.category_id} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ProductSearchSelect products={filteredProducts} value={newItem.product_id} onValueChange={handleProductChange} outOfCriteriaIds={outOfCriteriaProductIds} />
                </div>
                <div className="grid grid-cols-3 gap-1.5 items-end">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Qty</Label>
                    <Input type="number" min="1" value={newItem.quantity || ''} onChange={(e) => handleNewItemChange('quantity', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} onBlur={() => { if (newItem.quantity < 1) handleNewItemChange('quantity', 1); }} className="h-7 text-xs px-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Price</Label>
                    <Input type="number" min="0" step="0.01" value={newItem.unit_price} onChange={(e) => handleNewItemChange('unit_price', parseFloat(e.target.value) || 0)} disabled={selectedProduct && selectedProduct.base_price > 0} className={`h-7 text-xs px-1 ${selectedProduct && selectedProduct.base_price > 0 ? 'bg-muted text-muted-foreground' : ''}`} />
                  </div>
                  <Button type="button" onClick={addItem} size="sm" className="h-7 text-xs" disabled={!newItem.product_id}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {/* Size / Color / Term row - only when relevant */}
                {(sizeOptions.length > 0 || showSizeInput || colorOptions.length > 0 || selectedCategory?.name === 'Classes' || newItem.category_id === GRADING_CATEGORY_ID) && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {sizeOptions.length > 0 ? (
                      <Select value={newItem.size_variant} onValueChange={(value) => handleNewItemChange('size_variant', value)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>{sizeOptions.map((size) => (<SelectItem key={size} value={size}>{size}</SelectItem>))}</SelectContent>
                      </Select>
                    ) : showSizeInput ? (
                      <Input type="text" value={newItem.size_variant} onChange={(e) => handleNewItemChange('size_variant', e.target.value)} placeholder="Size" className="h-7 text-xs px-1" />
                    ) : colorOptions.length > 0 || selectedCategory?.name === 'Classes' || newItem.category_id === GRADING_CATEGORY_ID ? <div /> : null}
                    {colorOptions.length > 0 ? (
                      <Select value={newItem.color_variant} onValueChange={(value) => handleNewItemChange('color_variant', value)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Color" /></SelectTrigger>
                        <SelectContent>{colorOptions.map((color) => (<SelectItem key={color} value={color}>{color}</SelectItem>))}</SelectContent>
                      </Select>
                    ) : selectedCategory?.name === 'Classes' || newItem.category_id === GRADING_CATEGORY_ID ? <div /> : null}
                    {selectedCategory?.name === 'Classes' && branchTerms.length > 0 ? (
                      <Select value={newItem.term_id} onValueChange={(value) => handleNewItemChange('term_id', value)} disabled={termLoading}>
                        <SelectTrigger className={`h-7 text-xs ${termError ? 'border-destructive' : ''}`}><SelectValue placeholder={termLoading ? "..." : "Term"} /></SelectTrigger>
                        <SelectContent>{branchTerms.map((term) => (<SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>))}</SelectContent>
                      </Select>
                    ) : newItem.category_id === GRADING_CATEGORY_ID && getFilteredGradingSlots().length > 0 ? (
                      <Select value={newItem.grading_slot_id} onValueChange={(value) => handleNewItemChange('grading_slot_id', value)} disabled={gradingSlotsLoading}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={gradingSlotsLoading ? "..." : "Slot"} /></SelectTrigger>
                        <SelectContent>{getFilteredGradingSlots().map((slot) => (<SelectItem key={slot.id} value={slot.id}>{slot.title || `${slot.branch_name} - ${new Date(slot.grading_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}</SelectItem>))}</SelectContent>
                      </Select>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* === DESKTOP TABLE LAYOUT === */}
            <Table className="hidden md:table text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2">Category</TableHead>
                  <TableHead className="px-2">Product</TableHead>
                  <TableHead className="px-2 w-12">Qty</TableHead>
                  <TableHead className="px-2 w-16">Price</TableHead>
                  <TableHead className="px-2 w-14">Disc</TableHead>
                  <TableHead className="px-2 w-14">Size</TableHead>
                  <TableHead className="px-2 w-14">Color</TableHead>
                  <TableHead className="px-2">Term/Slot</TableHead>
                  <TableHead className="px-2 w-16 text-right">Total</TableHead>
                  <TableHead className="px-1 w-9"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Existing Items */}
                {items.map((item, index) => {
                  const itemProduct = products.find(p => p.id === item.product_id);
                  const itemCategory = categories.find(c => c.id === itemProduct?.category_id);
                  return (
                    <TableRow key={index}>
                      <TableCell className="px-2 text-muted-foreground">
                        {itemCategory?.name || '-'}
                      </TableCell>
                      <TableCell className="px-2 font-medium">{item.product_name}</TableCell>
                      <TableCell className="px-2">
                        <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)} className="w-12 h-7 text-xs px-1" />
                      </TableCell>
                      <TableCell className="px-2">
                        <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)} className={`w-14 h-7 text-xs px-1 ${item.unit_price === 0 ? 'text-muted-foreground' : ''}`} />
                      </TableCell>
                      <TableCell className="px-2">
                        <LineDiscountPopover discountType={item.discount_type} discountValue={item.discount_value} onChange={(type, value) => updateItemDiscount(index, type, value)} />
                      </TableCell>
                      <TableCell className="px-2">{item.size_variant || '-'}</TableCell>
                      <TableCell className="px-2">{item.color_variant || '-'}</TableCell>
                      <TableCell className="px-2">{item.term_name || item.grading_slot_title || '-'}</TableCell>
                      <TableCell className="px-2 font-medium text-right">${item.total.toFixed(2)}</TableCell>
                      <TableCell className="px-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Inline Add Item Row */}
                <TableRow className="bg-muted/30">
                  <TableCell className="px-2">
                    <Select value={newItem.category_id} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{categories.map((category) => (<SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-2">
                    <ProductSearchSelect products={filteredProducts} value={newItem.product_id} onValueChange={handleProductChange} outOfCriteriaIds={outOfCriteriaProductIds} />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input type="number" min="1" value={newItem.quantity} onChange={(e) => handleNewItemChange('quantity', parseInt(e.target.value) || 1)} className="w-12 h-7 text-xs px-1" />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input type="number" min="0" step="0.01" value={newItem.unit_price} onChange={(e) => handleNewItemChange('unit_price', parseFloat(e.target.value) || 0)} disabled={selectedProduct && selectedProduct.base_price > 0} className={`w-14 h-7 text-xs px-1 ${selectedProduct && selectedProduct.base_price > 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : newItem.unit_price === 0 ? 'text-muted-foreground' : ''}`} />
                  </TableCell>
                  <TableCell className="px-2"><span className="text-muted-foreground">-</span></TableCell>
                  <TableCell className="px-2">
                    {sizeOptions.length > 0 ? (
                      <Select value={newItem.size_variant} onValueChange={(value) => handleNewItemChange('size_variant', value)}>
                        <SelectTrigger className="h-7 text-xs w-16"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>{sizeOptions.map((size) => (<SelectItem key={size} value={size}>{size}</SelectItem>))}</SelectContent>
                      </Select>
                    ) : showSizeInput ? (
                      <Input type="text" value={newItem.size_variant} onChange={(e) => handleNewItemChange('size_variant', e.target.value)} placeholder="Size" className="h-7 text-xs w-16 px-1" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2">
                    {colorOptions.length > 0 ? (
                      <Select value={newItem.color_variant} onValueChange={(value) => handleNewItemChange('color_variant', value)}>
                        <SelectTrigger className="h-7 text-xs w-16"><SelectValue placeholder="Color" /></SelectTrigger>
                        <SelectContent>{colorOptions.map((color) => (<SelectItem key={color} value={color}>{color}</SelectItem>))}</SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2">
                    {selectedCategory?.name === 'Classes' ? (
                      branchTerms.length > 0 ? (
                        <Select value={newItem.term_id} onValueChange={(value) => handleNewItemChange('term_id', value)} disabled={termLoading}>
                          <SelectTrigger className={`h-7 text-xs ${termError ? 'border-destructive' : ''}`}><SelectValue placeholder={termLoading ? "..." : "Term"} /></SelectTrigger>
                          <SelectContent>{branchTerms.map((term) => (<SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>))}</SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-xs">No terms</span>
                      )
                    ) : newItem.category_id === GRADING_CATEGORY_ID ? (
                      getFilteredGradingSlots().length > 0 ? (
                        <Select value={newItem.grading_slot_id} onValueChange={(value) => handleNewItemChange('grading_slot_id', value)} disabled={gradingSlotsLoading}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={gradingSlotsLoading ? "..." : "Slot"} /></SelectTrigger>
                          <SelectContent>{getFilteredGradingSlots().map((slot) => (<SelectItem key={slot.id} value={slot.id}>{slot.title || `${slot.branch_name} - ${new Date(slot.grading_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}</SelectItem>))}</SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-xs">No slots</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 text-muted-foreground">-</TableCell>
                  <TableCell className="px-1">
                    <Button type="button" onClick={addItem} size="icon" className="h-7 w-7" disabled={!newItem.product_id}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {termError && selectedCategory?.name === 'Classes' && (
              <p className="text-xs md:text-sm text-destructive">{termError}</p>
            )}

            {/* Class Schedule Selector */}
            {selectedCategory?.name === 'Classes' && newItem.term_id && formData.branch_id && (
              <div className="space-y-1 md:space-y-2">
                <h4 className="text-xs md:text-sm font-medium">Select Class Schedule</h4>
                <ClassScheduleSelector
                  branchId={formData.branch_id}
                  studentAge={studentAge}
                  selectedSlots={selectedClassSlots}
                  onSlotsChange={setSelectedClassSlots}
                  term={branchTerms.find(t => t.id === newItem.term_id)!}
                  allowedClassTypes={selectedProduct?.allowed_class_types}
                  allowedDays={selectedProduct?.lesson_days}
                  lessonsPerWeek={selectedProduct?.lessons_per_week}
                />
              </div>
            )}

            {/* Totals Section */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-full md:w-64 space-y-1 md:space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between items-center">
                    <span>Tax Mode:</span>
                    <Select
                      value={isInclusive ? 'included' : 'excluded'}
                      onValueChange={(val) => {
                        taxManuallySet.current = true;
                        setTaxIncluded(val === 'included');
                      }}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="included">Tax Included</SelectItem>
                        <SelectItem value="excluded">Tax Excluded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({taxRate}%{isInclusive ? ' incl.' : ''}):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm md:text-lg border-t pt-1 md:pt-2">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>


          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-xs md:text-sm h-8 md:h-10"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || items.length === 0} className="text-xs md:text-sm h-8 md:h-10">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceDialog;
