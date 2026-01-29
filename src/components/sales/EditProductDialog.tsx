import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Tag, Award, Layers, Settings, Globe, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { updateProduct, getProductCategories, Product, ProductVariants } from '@/services/productService';
import { ProductVariantManager } from './ProductVariantManager';
import { BranchPricingManager } from './BranchPricingManager';

interface EditProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated?: () => void;
}

const BELT_LEVELS = [
  'Foundation 1', 'Foundation 2', 'Foundation 3',
  'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green', 
  'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
  'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5',
  'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4'
];

export const EditProductDialog: React.FC<EditProductDialogProps> = ({
  product,
  open,
  onOpenChange,
  onProductUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [showVariantManager, setShowVariantManager] = useState(false);
  const [showBranchPricing, setShowBranchPricing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    base_price: 0,
    tax_rate: 8,
    available_variants: { sizes: [], colors: [], belt_ranks: [] } as ProductVariants,
    min_belt_level: '',
    max_belt_level: '',
    requires_belt_level: false,
    is_service: false,
    is_active: true,
    metadata: {}
  });
  const [enabledVariantTypes, setEnabledVariantTypes] = useState({
    size: false,
    color: false,
    belt_rank: false
  });

  useEffect(() => {
    if (open && product) {
      loadCategories();
      const variants = product.available_variants || { sizes: [], colors: [], belt_ranks: [] };
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category_id || 'none',
        base_price: Number(product.base_price) || 0,
        tax_rate: Number(product.tax_rate) || 8,
        available_variants: variants,
        min_belt_level: product.min_belt_level || 'none',
        max_belt_level: product.max_belt_level || 'none',
        requires_belt_level: product.requires_belt_level || false,
        is_service: product.is_service || false,
        is_active: product.is_active,
        metadata: product.metadata || {}
      });
      setEnabledVariantTypes({
        size: product.requires_size || (variants.sizes?.length || 0) > 0,
        color: product.requires_color || (variants.colors?.length || 0) > 0,
        belt_rank: product.requires_belt_rank || (variants.belt_ranks?.length || 0) > 0
      });
    }
  }, [open, product]);

  const loadCategories = async () => {
    try {
      const data = await getProductCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load product categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        toast.error('Product name is required');
        setLoading(false);
        return;
      }

      if (!formData.sku.trim()) {
        toast.error('SKU is required');
        setLoading(false);
        return;
      }

      if (formData.base_price <= 0) {
        toast.error('Base price must be greater than 0');
        setLoading(false);
        return;
      }

      await updateProduct(product.id, {
        ...formData,
        requires_size: enabledVariantTypes.size,
        requires_color: enabledVariantTypes.color,
        requires_belt_rank: enabledVariantTypes.belt_rank,
        category_id: formData.category_id && formData.category_id !== 'none' ? formData.category_id : undefined,
        min_belt_level: formData.min_belt_level && formData.min_belt_level !== 'none' ? formData.min_belt_level : undefined,
        max_belt_level: formData.max_belt_level && formData.max_belt_level !== 'none' ? formData.max_belt_level : undefined
      });

      toast.success('Product updated successfully');
      onProductUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update product:', error);
      toast.error('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!product) return null;

  const hasAnyVariants = enabledVariantTypes.size || enabledVariantTypes.color || enabledVariantTypes.belt_rank;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information Section */}
            <section className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Package className="w-4 h-4" />
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Product Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SKU *</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    className="h-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </section>

            {/* Pricing & Category Section */}
            <section className="rounded-lg bg-accent/30 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Tag className="w-4 h-4" />
                Pricing & Category
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Base Price *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              </div>
              
              {/* Branch Pricing Button */}
              <div className="pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowBranchPricing(true)}
                  className="w-full"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Manage Branch Pricing
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Set different prices for each branch with their local currency
                </p>
              </div>
            </section>

            {/* Product Variants Section */}
            <section className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="w-4 h-4" />
                Product Variants
              </h3>
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
                <Button type="button" variant="outline" size="sm" onClick={() => setShowVariantManager(true)}>
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
                  checked={formData.requires_belt_level}
                  onCheckedChange={(checked) => handleInputChange('requires_belt_level', checked)}
                />
                <Label className="text-xs">Requires specific belt level</Label>
              </div>
              {formData.requires_belt_level && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Minimum Belt Level</Label>
                    <Select value={formData.min_belt_level} onValueChange={(value) => handleInputChange('min_belt_level', value)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select minimum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Minimum</SelectItem>
                        {BELT_LEVELS.map((level) => (<SelectItem key={level} value={level}>{level}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Maximum Belt Level</Label>
                    <Select value={formData.max_belt_level} onValueChange={(value) => handleInputChange('max_belt_level', value)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select maximum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Maximum</SelectItem>
                        {BELT_LEVELS.map((level) => (<SelectItem key={level} value={level}>{level}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </section>

            {/* Status Section */}
            <section className="rounded-lg bg-accent/30 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Settings className="w-4 h-4" />
                Status & Type
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Switch checked={formData.is_service} onCheckedChange={(checked) => handleInputChange('is_service', checked)} />
                  <Label className="text-xs flex items-center gap-2">
                    <Briefcase className="w-3 h-3" />
                    Service (no inventory tracking)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => handleInputChange('is_active', checked)} />
                  <Label className="text-xs">Active Product</Label>
                </div>
              </div>
            </section>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ProductVariantManager
        variants={formData.available_variants}
        onVariantsChange={(variants) => handleInputChange('available_variants', variants)}
        enabledTypes={enabledVariantTypes}
        onEnabledTypesChange={setEnabledVariantTypes}
        open={showVariantManager}
        onOpenChange={setShowVariantManager}
      />

      <BranchPricingManager
        productId={product.id}
        productName={product.name}
        basePrice={formData.base_price}
        baseTaxRate={formData.tax_rate}
        open={showBranchPricing}
        onOpenChange={setShowBranchPricing}
      />
    </>
  );
};
