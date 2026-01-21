import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Tag, Award, Calendar, Ruler, Settings, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { updateProduct, getProductCategories, Product } from '@/services/productService';
import { SizeVariantManager } from './SizeVariantManager';

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
  const [showSizeManager, setShowSizeManager] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    base_price: 0,
    tax_rate: 8,
    available_sizes: [] as string[],
    requires_size: false,
    min_belt_level: '',
    max_belt_level: '',
    requires_belt_level: false,
    session_count: 0,
    validity_months: 0,
    is_recurring: false,
    is_active: true,
    metadata: {}
  });

  useEffect(() => {
    if (open && product) {
      loadCategories();
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category_id || 'none',
        base_price: Number(product.base_price) || 0,
        tax_rate: Number(product.tax_rate) || 8,
        available_sizes: product.available_sizes || [],
        requires_size: product.requires_size || false,
        min_belt_level: product.min_belt_level || 'none',
        max_belt_level: product.max_belt_level || 'none',
        requires_belt_level: product.requires_belt_level || false,
        session_count: product.session_count || 0,
        validity_months: product.validity_months || 0,
        is_recurring: product.is_recurring || false,
        is_active: product.is_active,
        metadata: product.metadata || {}
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

  const handleRemoveSize = (sizeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      available_sizes: prev.available_sizes.filter(s => s !== sizeToRemove)
    }));
  };

  if (!product) return null;

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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-name" className="text-xs">Product Name *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter product name"
                      className="h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-sku" className="text-xs">SKU *</Label>
                    <Input
                      id="edit-sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="Enter product SKU"
                      className="h-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-description" className="text-xs">Description</Label>
                  <Textarea
                    id="edit-description"
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
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-category" className="text-xs">Category</Label>
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
                  <Label htmlFor="edit-base_price" className="text-xs">Base Price *</Label>
                  <Input
                    id="edit-base_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-tax_rate" className="text-xs">Tax Rate (%)</Label>
                  <Input
                    id="edit-tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                    placeholder="8.00"
                    className="h-9"
                  />
                </div>
              </div>
            </section>

            {/* Belt Level Requirements Section */}
            <section className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Award className="w-4 h-4" />
                Belt Level Requirements
              </h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-requires_belt_level"
                  checked={formData.requires_belt_level}
                  onCheckedChange={(checked) => handleInputChange('requires_belt_level', checked)}
                />
                <Label htmlFor="edit-requires_belt_level" className="text-xs">Requires specific belt level</Label>
              </div>

              {formData.requires_belt_level && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-min_belt_level" className="text-xs">Minimum Belt Level</Label>
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
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-max_belt_level" className="text-xs">Maximum Belt Level</Label>
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
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </section>

            {/* Sessions & Validity Section */}
            <section className="rounded-lg bg-accent/30 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="w-4 h-4" />
                Sessions & Validity
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-session_count" className="text-xs">Session Count</Label>
                  <Input
                    id="edit-session_count"
                    type="number"
                    min="0"
                    value={formData.session_count}
                    onChange={(e) => handleInputChange('session_count', parseInt(e.target.value) || 0)}
                    placeholder="10"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-validity_months" className="text-xs">Validity (months)</Label>
                  <Input
                    id="edit-validity_months"
                    type="number"
                    min="0"
                    value={formData.validity_months}
                    onChange={(e) => handleInputChange('validity_months', parseInt(e.target.value) || 0)}
                    placeholder="12"
                    className="h-9"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-is_recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => handleInputChange('is_recurring', checked)}
                    />
                    <Label htmlFor="edit-is_recurring" className="text-xs">Recurring</Label>
                  </div>
                </div>
              </div>
            </section>

            {/* Size Options Section */}
            <section className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Ruler className="w-4 h-4" />
                Size Options
              </h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-requires_size"
                  checked={formData.requires_size}
                  onCheckedChange={(checked) => handleInputChange('requires_size', checked)}
                />
                <Label htmlFor="edit-requires_size" className="text-xs">Product has size variants</Label>
              </div>

              {formData.requires_size && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Available Sizes ({formData.available_sizes.length})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSizeManager(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Manage Sizes
                    </Button>
                  </div>
                  
                  {formData.available_sizes.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-background/50 border">
                      {formData.available_sizes.map((size, index) => (
                        <Badge key={`${size}-${index}`} variant="secondary" className="flex items-center gap-1">
                          {size}
                          <button
                            type="button"
                            onClick={() => handleRemoveSize(size)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground p-3 rounded-lg bg-background/50 border text-center">
                      No sizes configured. Click "Manage Sizes" to add.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Status Section */}
            <section className="rounded-lg bg-accent/30 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Settings className="w-4 h-4" />
                Status
              </h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="edit-is_active" className="text-xs">Active Product</Label>
              </div>
            </section>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Size Variant Manager Dialog */}
      <SizeVariantManager
        sizes={formData.available_sizes}
        onSizesChange={(sizes) => handleInputChange('available_sizes', sizes)}
        open={showSizeManager}
        onOpenChange={setShowSizeManager}
      />
    </>
  );
};
