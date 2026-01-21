/**
 * Add Product Dialog Component
 * Form for creating new products in the sales module with multi-variant support
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createProduct, getProductCategories, ProductVariants } from '@/services/productService';
import { Loader2, Package, Tag, Award, Calendar, Layers, Settings, Globe, Briefcase } from 'lucide-react';
import { ProductVariantManager } from './ProductVariantManager';
import { TermValiditySelector } from './TermValiditySelector';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BELT_LEVELS = [
  'Foundation 1', 'Foundation 2', 'Foundation 3',
  'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green', 
  'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
  'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5',
  'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4'
];

interface AddProductDialogProps {
  trigger: React.ReactNode;
  onProductAdded?: () => void;
}

const AddProductDialog: React.FC<AddProductDialogProps> = ({ trigger, onProductAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [showVariantManager, setShowVariantManager] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    base_price: '',
    available_variants: { sizes: [], colors: [], belt_ranks: [] } as ProductVariants,
    min_belt_level: '',
    max_belt_level: '',
    requires_belt_level: false,
    session_count: '',
    validity_type: 'months' as 'months' | 'term',
    validity_months: '',
    term_id: null as string | null,
    is_recurring: false,
    is_service: false,
    is_active: true
  });
  
  const [enabledVariantTypes, setEnabledVariantTypes] = useState({
    size: false,
    color: false,
    belt_rank: false
  });

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const data = await getProductCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!formData.sku.trim()) {
      toast.error('Product SKU is required');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || undefined,
        category_id: formData.category_id && formData.category_id !== 'none' ? formData.category_id : undefined,
        base_price: formData.base_price ? parseFloat(formData.base_price) : 0,
        available_variants: formData.available_variants,
        requires_size: enabledVariantTypes.size,
        requires_color: enabledVariantTypes.color,
        requires_belt_rank: enabledVariantTypes.belt_rank,
        min_belt_level: formData.min_belt_level && formData.min_belt_level !== 'none' ? formData.min_belt_level : undefined,
        max_belt_level: formData.max_belt_level && formData.max_belt_level !== 'none' ? formData.max_belt_level : undefined,
        requires_belt_level: formData.requires_belt_level,
        session_count: formData.session_count ? parseInt(formData.session_count) : undefined,
        validity_type: formData.validity_type,
        validity_months: formData.validity_type === 'months' && formData.validity_months ? parseInt(formData.validity_months) : undefined,
        term_id: formData.validity_type === 'term' ? formData.term_id : undefined,
        is_recurring: formData.is_recurring,
        is_service: formData.is_service,
        is_active: formData.is_active
      };

      await createProduct(productData);
      
      toast.success('Product created successfully');
      setOpen(false);
      resetForm();
      onProductAdded?.();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      category_id: '',
      base_price: '',
      available_variants: { sizes: [], colors: [], belt_ranks: [] },
      min_belt_level: '',
      max_belt_level: '',
      requires_belt_level: false,
      session_count: '',
      validity_type: 'months',
      validity_months: '',
      term_id: null,
      is_recurring: false,
      is_service: false,
      is_active: true
    });
    setEnabledVariantTypes({ size: false, color: false, belt_rank: false });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Count total variants configured
  const totalVariants = 
    (formData.available_variants.sizes?.length || 0) +
    (formData.available_variants.colors?.length || 0) +
    (formData.available_variants.belt_ranks?.length || 0);

  const hasAnyVariants = enabledVariantTypes.size || enabledVariantTypes.color || enabledVariantTypes.belt_rank;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information Section */}
          <section className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Package className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter product name"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sku" className="text-xs">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Enter product SKU"
                    className="h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter product description"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </section>

          {/* Pricing & Category Section */}
          <section className="rounded-lg bg-accent/30 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="w-4 h-4" />
              Pricing & Category
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="category_id" className="text-xs">Category</Label>
                <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="base_price" className="text-xs">Base Price *</Label>
                <Input
                  id="base_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => handleInputChange('base_price', e.target.value)}
                  placeholder="0.00"
                  className="h-9"
                  required
                />
              </div>
            </div>
            
            {/* Branch Pricing Note */}
            <Alert className="bg-muted/50 border-muted">
              <Globe className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Branch-specific pricing and tax rates with multi-currency support can be configured after creating the product.
              </AlertDescription>
            </Alert>
          </section>

          {/* Product Variants Section */}
          <section className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="w-4 h-4" />
              Product Variants
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure Size, Color, and Belt Rank variants for this product
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {enabledVariantTypes.size && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
                    Sizes: {formData.available_variants.sizes?.length || 0}
                  </Badge>
                )}
                {enabledVariantTypes.color && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-700">
                    Colors: {formData.available_variants.colors?.length || 0}
                  </Badge>
                )}
                {enabledVariantTypes.belt_rank && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700">
                    Belt Ranks: {formData.available_variants.belt_ranks?.length || 0}
                  </Badge>
                )}
                {!hasAnyVariants && (
                  <span className="text-xs text-muted-foreground">No variants configured</span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowVariantManager(true)}
              >
                Manage Variants
              </Button>
            </div>
          </section>

          {/* Belt Level Requirements Section */}
          <section className="rounded-lg bg-accent/30 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Award className="w-4 h-4" />
              Belt Level Requirements
            </h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="requires_belt_level"
                checked={formData.requires_belt_level}
                onCheckedChange={(checked) => handleInputChange('requires_belt_level', checked)}
              />
              <Label htmlFor="requires_belt_level" className="text-xs">Requires specific belt level</Label>
            </div>

            {formData.requires_belt_level && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Minimum Belt Level</Label>
                  <Select
                    value={formData.min_belt_level}
                    onValueChange={(value) => handleInputChange('min_belt_level', value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select minimum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Minimum</SelectItem>
                      {BELT_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Maximum Belt Level</Label>
                  <Select
                    value={formData.max_belt_level}
                    onValueChange={(value) => handleInputChange('max_belt_level', value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select maximum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Maximum</SelectItem>
                      {BELT_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </section>

          {/* Sessions & Validity Section */}
          <section className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="w-4 h-4" />
              Sessions & Validity
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Session Count</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.session_count}
                  onChange={(e) => handleInputChange('session_count', e.target.value)}
                  placeholder="10"
                  className="h-9"
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => handleInputChange('is_recurring', checked)}
                  />
                  <Label htmlFor="is_recurring" className="text-xs">Recurring (monthly fees)</Label>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Label className="text-xs text-muted-foreground mb-2 block">Validity Period</Label>
              <TermValiditySelector
                validityType={formData.validity_type}
                validityMonths={formData.validity_months ? parseInt(formData.validity_months) : 0}
                termId={formData.term_id}
                onValidityTypeChange={(type) => handleInputChange('validity_type', type)}
                onValidityMonthsChange={(months) => handleInputChange('validity_months', months.toString())}
                onTermIdChange={(id) => handleInputChange('term_id', id)}
              />
            </div>
          </section>

          {/* Status Section */}
          <section className="rounded-lg bg-accent/30 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Settings className="w-4 h-4" />
              Status & Type
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_service"
                  checked={formData.is_service}
                  onCheckedChange={(checked) => handleInputChange('is_service', checked)}
                />
                <Label htmlFor="is_service" className="text-xs flex items-center gap-2">
                  <Briefcase className="w-3 h-3" />
                  Service (no inventory tracking)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active" className="text-xs">Active Product</Label>
              </div>
            </div>
          </section>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Product Variant Manager Dialog */}
      <ProductVariantManager
        variants={formData.available_variants}
        onVariantsChange={(variants) => handleInputChange('available_variants', variants)}
        enabledTypes={enabledVariantTypes}
        onEnabledTypesChange={setEnabledVariantTypes}
        open={showVariantManager}
        onOpenChange={setShowVariantManager}
      />
    </Dialog>
  );
};

export default AddProductDialog;
