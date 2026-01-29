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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createInvoice, type CreateInvoiceData } from '@/services/invoiceService';
import { getStudents } from '@/services/studentService';
import { getProducts, getProductCategories } from '@/services/productService';
import { supabase } from '@/integrations/supabase/client';
import { useInvoiceAccess } from '@/hooks/useInvoiceAccess';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { COUNTRY_TAX_RATES, DEFAULT_TAX_RATE } from '@/config/constants';

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
  const [students, setStudents] = useState<Array<{id: string, name: string, email: string, branch_id?: string}>>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [branches, setBranches] = useState<Array<{id: string, name: string, country: string | null}>>([]);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const { accessibleBranches, isSuperadmin, canCreate } = useInvoiceAccess();
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
    color_variant: ''
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
        branch_id: s.branch_id
      })));
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    }
  };

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
          size_variant: item.size_variant || undefined
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
      color_variant: ''
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const selectedBranch = branches.find(b => b.id === formData.branch_id);
    
    let defaultQuantity = 1;
    if (category?.name === 'Classes') {
      if (selectedBranch?.country === 'Singapore') {
        defaultQuantity = 12;
      } else if (selectedBranch?.country === 'Australia') {
        defaultQuantity = 10;
      }
    }
    
    setNewItem(prev => ({
      ...prev,
      category_id: categoryId,
      product_id: '', // Reset product when category changes
      quantity: defaultQuantity,
      unit_price: 0,
      size_variant: '',
      color_variant: ''
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

  // Get filtered products based on selected category
  const filteredProducts = newItem.category_id 
    ? products.filter(p => p.category_id === newItem.category_id)
    : products;

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

    const item: InvoiceItem = {
      product_id: newItem.product_id,
      product_name: product.name,
      description: product.name,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      size_variant: newItem.size_variant || undefined,
      color_variant: newItem.color_variant || undefined,
      total: newItem.quantity * newItem.unit_price
    };

    setItems([...items, item]);
    setNewItem({
      product_id: '',
      category_id: newItem.category_id, // Keep category selected
      quantity: 1,
      unit_price: 0,
      size_variant: '',
      color_variant: ''
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

  // Get the tax rate based on selected branch country
  const getSelectedBranchTaxRate = (): number => {
    const selectedBranch = branches.find(b => b.id === formData.branch_id);
    const country = selectedBranch?.country || null;
    return country ? (COUNTRY_TAX_RATES[country] ?? DEFAULT_TAX_RATE) : DEFAULT_TAX_RATE;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = getSelectedBranchTaxRate() / 100;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total, taxRate: getSelectedBranchTaxRate() };
  };

  const { subtotal, taxAmount, total, taxRate } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a student with multiple items
          </DialogDescription>
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
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Add Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add Items</h3>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newItem.category_id} onValueChange={handleCategoryChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select value={newItem.product_id} onValueChange={(value) => handleNewItemChange('product_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => handleNewItemChange('quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.unit_price}
                      onChange={(e) => handleNewItemChange('unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {sizeOptions.length > 0 && (
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Select value={newItem.size_variant} onValueChange={(value) => handleNewItemChange('size_variant', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {sizeOptions.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {colorOptions.length > 0 && (
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Select value={newItem.color_variant} onValueChange={(value) => handleNewItemChange('color_variant', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color} value={color}>
                              {color}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button type="button" onClick={addItem} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Invoice Items</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>{item.size_variant || '-'}</TableCell>
                      <TableCell>{item.color_variant || '-'}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Notes Section - After Items */}
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

          <Separator />

          {/* Invoice Totals */}
          {items.length > 0 && (
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({taxRate}%):</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

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
