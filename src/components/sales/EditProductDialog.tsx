import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateProduct, getProductCategories, Product } from '@/services/productService';

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

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export const EditProductDialog: React.FC<EditProductDialogProps> = ({
  product,
  open,
  onOpenChange,
  onProductUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
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
    if (open) {
      loadCategories();
      // Pre-populate form with product data
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
        return;
      }

      if (!formData.sku.trim()) {
        toast.error('SKU is required');
        return;
      }

      if (formData.base_price <= 0) {
        toast.error('Base price must be greater than 0');
        return;
      }

      await updateProduct(product.id, {
        ...formData,
        category_id: formData.category_id && formData.category_id !== 'none' ? formData.category_id : undefined,
        min_belt_level: formData.min_belt_level && formData.min_belt_level !== 'none' ? formData.min_belt_level : undefined,
        max_belt_level: formData.max_belt_level && formData.max_belt_level !== 'none' ? formData.max_belt_level : undefined,
        updated_by: 'current_user' // This should be replaced with actual user context
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSizeToggle = (size: string) => {
    setFormData(prev => ({
      ...prev,
      available_sizes: prev.available_sizes.includes(size)
        ? prev.available_sizes.filter(s => s !== size)
        : [...prev.available_sizes, size]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Enter SKU"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => handleInputChange('category_id', value)}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="base_price">Base Price *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Belt Level Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Belt Level Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.requires_belt_level}
                  onCheckedChange={(checked) => handleInputChange('requires_belt_level', checked)}
                />
                <Label>Requires specific belt level</Label>
              </div>

              {formData.requires_belt_level && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_belt_level">Minimum Belt Level</Label>
                    <Select
                      value={formData.min_belt_level}
                      onValueChange={(value) => handleInputChange('min_belt_level', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select minimum belt level" />
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
                  <div>
                    <Label htmlFor="max_belt_level">Maximum Belt Level</Label>
                    <Select
                      value={formData.max_belt_level}
                      onValueChange={(value) => handleInputChange('max_belt_level', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select maximum belt level" />
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
            </CardContent>
          </Card>

          {/* Sessions & Validity */}
          <Card>
            <CardHeader>
              <CardTitle>Sessions & Validity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="session_count">Session Count</Label>
                  <Input
                    id="session_count"
                    type="number"
                    min="0"
                    value={formData.session_count}
                    onChange={(e) => handleInputChange('session_count', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="validity_months">Validity (Months)</Label>
                  <Input
                    id="validity_months"
                    type="number"
                    min="0"
                    value={formData.validity_months}
                    onChange={(e) => handleInputChange('validity_months', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => handleInputChange('is_recurring', checked)}
                  />
                  <Label>Recurring Product</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Size Options */}
          <Card>
            <CardHeader>
              <CardTitle>Size Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.requires_size}
                  onCheckedChange={(checked) => handleInputChange('requires_size', checked)}
                />
                <Label>Requires size selection</Label>
              </div>

              {formData.requires_size && (
                <div>
                  <Label>Available Sizes</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SIZE_OPTIONS.map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant={formData.available_sizes.includes(size) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSizeToggle(size)}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label>Active Product</Label>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};