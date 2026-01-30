/**
 * Create Invoice Dialog Component
 * Form for creating new invoices in the sales module
 * Supports branch-based access control for non-superadmin users
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createInvoice, type CreateInvoiceData } from '@/services/invoiceService';
import { getStudents } from '@/services/studentService';
import { getProducts, getProductCategories } from '@/services/productService';
import { supabase } from '@/integrations/supabase/client';
import { useInvoiceAccess } from '@/hooks/useInvoiceAccess';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { COUNTRY_TAX_RATES, DEFAULT_TAX_RATE, COUNTRY_TAX_INCLUDED, DEFAULT_TAX_INCLUDED } from '@/config/constants';
import type { Term } from '@/services/termCalendarService';

interface CreateInvoiceDialogProps {
  trigger: React.ReactNode;
  onInvoiceCreated?: () => void;
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
}

const CreateInvoiceDialog: React.FC<CreateInvoiceDialogProps> = ({ trigger, onInvoiceCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Array<{id: string, name: string, email: string, branch_id?: string, status?: string, current_belt?: string}>>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [branches, setBranches] = useState<Array<{id: string, name: string, country: string | null}>>([]);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const { accessibleBranches, isSuperadmin, canCreate } = useInvoiceAccess();
  
  // Term state for Classes category
  const [branchTerms, setBranchTerms] = useState<Term[]>([]);
  const [termLoading, setTermLoading] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);
  
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
    term_id: ''
  });

  useEffect(() => {
    if (open) {
      loadStudents();
      loadProducts();
      loadBranches();
      loadCategories();
    }
  }, [open]);

  const loadStudents = async () => {
    try {
      const response = await getStudents(1, 1000);
      setStudents(response.students.map(s => ({ 
        id: s.id, 
        name: `${s.first_name} ${s.last_name}`, 
        email: s.email || '',
        branch_id: s.branch_id,
        status: s.status,
        current_belt: s.current_belt
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
  });

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
        available_variants: p.available_variants
      })));
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
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
      const invoiceData: CreateInvoiceData = {
        student_id: formData.student_id,
        branch_id: formData.branch_id || undefined,
        payment_terms_days: 30, // Default value
        notes: formData.notes || undefined,
        internal_notes: formData.internal_notes || undefined,
        items: items.map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          size_variant: item.size_variant || undefined,
          metadata: item.term_id ? { term_id: item.term_id } : undefined
        }))
      };

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
      branch_id: '',
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
      term_id: ''
    });
    setBranchTerms([]);
    setTermError(null);
  };

  const handleInputChange = async (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Load terms when branch changes
    if (field === 'branch_id') {
      loadBranchTerms(value);
      
      // Refresh term selection if Classes category is selected
      if (selectedCategory?.name === 'Classes' && formData.student_id) {
        const selectedTermId = await refreshTermSelection(value, formData.student_id);
        setNewItem(prev => ({ ...prev, term_id: selectedTermId }));
      }
    }
    
    // Refresh term selection when student changes (if Classes category selected)
    if (field === 'student_id' && selectedCategory?.name === 'Classes' && formData.branch_id) {
      const selectedTermId = await refreshTermSelection(formData.branch_id, value);
      setNewItem(prev => ({ ...prev, term_id: selectedTermId }));
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
      console.log('[loadBranchTerms] Fetching terms for branch:', branchId, 'today:', today);
      
      const { data, error } = await supabase
        .from('term_calendars')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .gte('end_date', today)
        .order('start_date', { ascending: true });
      
      if (error) {
        console.error('[loadBranchTerms] Query error:', error);
        throw error;
      }
      
      console.log('[loadBranchTerms] Found terms:', data?.length || 0, data);
      setBranchTerms((data || []) as Term[]);
    } catch (error: any) {
      console.error('[loadBranchTerms] Error loading terms:', error);
      // If it's an auth error, show appropriate message
      if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
        setTermError('Session expired. Please refresh the page.');
      }
      setBranchTerms([]);
    }
  };

  // Check if student already has a class invoice for a specific term
  const checkExistingClassInvoice = async (
    studentId: string, 
    termId: string
  ): Promise<boolean> => {
    if (!studentId || !termId) return false;
    
    try {
      // Get invoices for this student
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', studentId);
      
      if (invError || !invoices?.length) return false;
      
      const invoiceIds = invoices.map(i => i.id);
      
      // Check if any invoice items have this term in metadata
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('id, metadata')
        .in('invoice_id', invoiceIds);
      
      if (itemsError) return false;
      
      // Check metadata for term_id match
      return (items || []).some(item => {
        const metadata = item.metadata as Record<string, any> | null;
        return metadata?.term_id === termId;
      });
    } catch (error) {
      console.error('Error checking existing invoice:', error);
      return false;
    }
  };

  // Refresh term selection - fetches terms and auto-selects the appropriate one
  const refreshTermSelection = async (branchId: string, studentId: string): Promise<string> => {
    if (!branchId || !studentId) {
      console.log('[refreshTermSelection] Missing branchId or studentId:', { branchId, studentId });
      return '';
    }
    
    setTermLoading(true);
    setTermError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('[refreshTermSelection] Fetching terms for branch:', branchId, 'today:', today);
      
      const { data: termsData, error: termsError } = await supabase
        .from('term_calendars')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .gte('end_date', today)
        .order('start_date', { ascending: true });
      
      if (termsError) {
        console.error('[refreshTermSelection] Query error:', termsError);
        throw termsError;
      }
      
      console.log('[refreshTermSelection] Found terms:', termsData?.length || 0, termsData);
      
      const availableTerms = (termsData || []) as Term[];
      setBranchTerms(availableTerms);
      
      if (availableTerms.length === 0) {
        setTermError('No active terms available for this branch');
        return '';
      }
      
      // Find current term (today is within term dates)
      const currentTerm = availableTerms.find(t => 
        t.start_date <= today && t.end_date >= today
      );
      
      console.log('[refreshTermSelection] Current term:', currentTerm);
      
      if (currentTerm) {
        // Check if current term already has class invoice for this student
        const hasExisting = await checkExistingClassInvoice(studentId, currentTerm.id);
        
        if (hasExisting) {
          // Find next term
          const nextTerm = availableTerms.find(t => t.start_date > currentTerm.end_date);
          
          if (nextTerm) {
            console.log('[refreshTermSelection] Using next term:', nextTerm);
            return nextTerm.id;
          } else {
            setTermError('No next term available. Student already has classes invoiced for current term.');
            return '';
          }
        } else {
          console.log('[refreshTermSelection] Using current term:', currentTerm.id);
          return currentTerm.id;
        }
      } else {
        // No current term - use first available future term
        console.log('[refreshTermSelection] Using first available term:', availableTerms[0]);
        return availableTerms[0].id;
      }
    } catch (error: any) {
      console.error('[refreshTermSelection] Error:', error);
      // If it's an auth error, show appropriate message
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
    
    if (category?.name === 'Classes') {
      // Set quantity defaults based on country
      if (selectedBranch?.country === 'Singapore') {
        defaultQuantity = 12;
      } else if (selectedBranch?.country === 'Australia') {
        defaultQuantity = 10;
      }
      
      // Auto-select term if branch and student are selected
      if (formData.branch_id && formData.student_id) {
        selectedTermId = await refreshTermSelection(formData.branch_id, formData.student_id);
      }
    }
    
    setNewItem(prev => ({
      ...prev,
      category_id: categoryId,
      product_id: '', // Reset product when category changes
      quantity: defaultQuantity,
      unit_price: 0,
      size_variant: '',
      color_variant: '',
      term_id: selectedTermId
    }));
  };

  // Handle product change - refresh term if Classes category
  const handleProductChange = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const isClassesCategory = selectedCategory?.name === 'Classes';
    
    let selectedTermId = newItem.term_id;
    
    // Refresh term when product changes (for Classes category)
    if (isClassesCategory && formData.branch_id && formData.student_id) {
      selectedTermId = await refreshTermSelection(formData.branch_id, formData.student_id);
    }
    
    setNewItem(prev => ({
      ...prev,
      product_id: productId,
      unit_price: product?.base_price || 0,
      size_variant: '',
      color_variant: '',
      term_id: selectedTermId
    }));
  };

  const handleNewItemChange = (field: string, value: any) => {
    setNewItem(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-fill price when product is selected
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

  // Get selected student's current belt for filtering grading products
  const selectedStudent = students.find(s => s.id === formData.student_id);
  const studentCurrentBelt = selectedStudent?.current_belt;

  const selectedCategory = categories.find(c => c.id === newItem.category_id);

  // Get filtered products based on selected category and student's belt for grading
  const filteredProducts = (() => {
    if (!newItem.category_id) return products;
    
    let filtered = products.filter(p => p.category_id === newItem.category_id);
    
    // For grading category, filter by student's current belt
    const isGradingCategory = selectedCategory?.name === 'Grading';
    if (isGradingCategory && studentCurrentBelt) {
      // Product names are like "Blue >> Red Tip" where first part is current belt
      filtered = filtered.filter(p => {
        const beltMatch = p.name.match(/^(.+?)\s*>>\s*/);
        if (beltMatch) {
          const productCurrentBelt = beltMatch[1].trim();
          return productCurrentBelt.toLowerCase() === studentCurrentBelt.toLowerCase();
        }
        return true; // Include products without the >> pattern
      });
    }
    
    return filtered;
  })();

  // Get selected product's variants
  const selectedProduct = products.find(p => p.id === newItem.product_id);
  const sizeOptions = selectedProduct?.available_variants?.sizes || [];
  const colorOptions = selectedProduct?.available_variants?.colors || [];

  const addItem = () => {
    if (!newItem.product_id) {
      toast.error('Please select a product');
      return;
    }

    const product = products.find(p => p.id === newItem.product_id);
    if (!product) {
      toast.error('Product not found');
      return;
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
      total: newItem.quantity * newItem.unit_price
    };

    setItems([...items, item]);
    setNewItem({
      product_id: '',
      category_id: newItem.category_id, // Keep category selected
      quantity: 1,
      unit_price: 0,
      size_variant: '',
      color_variant: '',
      term_id: ''
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const updatedItems = [...items];
    updatedItems[index].quantity = quantity;
    updatedItems[index].total = quantity * updatedItems[index].unit_price;
    setItems(updatedItems);
  };

  const updateItemPrice = (index: number, price: number) => {
    const updatedItems = [...items];
    updatedItems[index].unit_price = price;
    updatedItems[index].total = updatedItems[index].quantity * price;
    setItems(updatedItems);
  };

  // Get the tax rate and inclusion setting based on selected branch country
  const getSelectedBranchTaxConfig = (): { rate: number; isInclusive: boolean } => {
    const selectedBranch = branches.find(b => b.id === formData.branch_id);
    const country = selectedBranch?.country || null;
    const rate = country ? (COUNTRY_TAX_RATES[country] ?? DEFAULT_TAX_RATE) : DEFAULT_TAX_RATE;
    const isInclusive = country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED;
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
      // Tax inclusive: price already includes tax (e.g., Australia)
      // Total = itemsTotal, Subtotal = Total / (1 + taxRate), Tax = Total - Subtotal
      total = itemsTotal;
      subtotal = itemsTotal / (1 + taxRateDecimal);
      taxAmount = total - subtotal;
    } else {
      // Tax exclusive: tax added on top (e.g., Singapore)
      // Subtotal = itemsTotal, Tax = Subtotal * taxRate, Total = Subtotal + Tax
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Details - Branch first, then Student */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Invoice Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch_id">Branch *</Label>
                <Select value={formData.branch_id} onValueChange={(value) => handleInputChange('branch_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter(b => !['Competition', 'Headquarters'].includes(b.name))
                      .filter(b => isSuperadmin || canCreate(b.id))
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} {branch.country && `(${branch.country})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student_id">Student *</Label>
                <Select value={formData.student_id} onValueChange={(value) => {
                  handleInputChange('student_id', value);
                  // Auto-select student's branch if available
                  const student = students.find(s => s.id === value);
                  if (student?.branch_id && !formData.branch_id) {
                    handleInputChange('branch_id', student.branch_id);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Invoice Items Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Invoice Items</h3>

            {/* Items Table with Inline Add Row */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-14">Qty</TableHead>
                  <TableHead className="w-20">Price</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead className="w-24">Total</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Existing Items */}
                {items.map((item, index) => {
                  const itemProduct = products.find(p => p.id === item.product_id);
                  const itemCategory = categories.find(c => c.id === itemProduct?.category_id);
                  return (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground text-sm">
                        {itemCategory?.name || '-'}
                      </TableCell>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-14 h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                          className={`w-16 h-8 ${item.unit_price === 0 ? 'text-muted-foreground' : ''}`}
                        />
                      </TableCell>
                      <TableCell>{item.size_variant || '-'}</TableCell>
                      <TableCell>{item.color_variant || '-'}</TableCell>
                      <TableCell>{item.term_name || '-'}</TableCell>
                      <TableCell className="font-medium">
                        ${item.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Inline Add Item Row */}
                <TableRow className="bg-muted/30">
                  <TableCell>
                    <Select value={newItem.category_id} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={newItem.product_id} onValueChange={handleProductChange}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => handleNewItemChange('quantity', parseInt(e.target.value) || 1)}
                      className="w-14 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.unit_price}
                      onChange={(e) => handleNewItemChange('unit_price', parseFloat(e.target.value) || 0)}
                      disabled={selectedProduct && selectedProduct.base_price > 0}
                      className={`w-16 h-8 ${selectedProduct && selectedProduct.base_price > 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : newItem.unit_price === 0 ? 'text-muted-foreground' : ''}`}
                    />
                  </TableCell>
                  <TableCell>
                    {sizeOptions.length > 0 ? (
                      <Select value={newItem.size_variant} onValueChange={(value) => handleNewItemChange('size_variant', value)}>
                        <SelectTrigger className="h-8 w-20">
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent>
                          {sizeOptions.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {colorOptions.length > 0 ? (
                      <Select value={newItem.color_variant} onValueChange={(value) => handleNewItemChange('color_variant', value)}>
                        <SelectTrigger className="h-8 w-20">
                          <SelectValue placeholder="Color" />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color} value={color}>
                              {color}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {selectedCategory?.name === 'Classes' ? (
                      branchTerms.length > 0 ? (
                        <Select 
                          value={newItem.term_id} 
                          onValueChange={(value) => handleNewItemChange('term_id', value)}
                          disabled={termLoading}
                        >
                          <SelectTrigger className={`h-8 w-28 ${termError ? 'border-destructive' : ''}`}>
                            <SelectValue placeholder={termLoading ? "..." : "Term"} />
                          </SelectTrigger>
                          <SelectContent>
                            {branchTerms.map((term) => (
                              <SelectItem key={term.id} value={term.id}>
                                {term.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-xs">No terms</span>
                      )
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell>
                    <Button 
                      type="button" 
                      onClick={addItem} 
                      size="icon"
                      className="h-8 w-8"
                      disabled={!newItem.product_id}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {termError && selectedCategory?.name === 'Classes' && (
              <p className="text-sm text-destructive">{termError}</p>
            )}

            {/* Totals Section - After Invoice Items */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({taxRate}%{isInclusive ? ' incl.' : ''}):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Notes Section - After Totals */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Public notes (visible to student)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_notes">Internal Notes</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes}
                onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                placeholder="Internal notes (not visible to student)"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || items.length === 0}>
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
