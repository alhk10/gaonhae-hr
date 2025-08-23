/**
 * Add Product Dialog Component
 * Form for creating new products in the sales module
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createProduct, getProductCategories } from '@/services/productService';
import { Loader2 } from 'lucide-react';

interface AddProductDialogProps {
  trigger: React.ReactNode;
  onProductAdded?: () => void;
}

const AddProductDialog: React.FC<AddProductDialogProps> = ({ trigger, onProductAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    base_price: '',
    tax_rate: '',
    available_sizes: [] as string[],
    requires_size: false,
    min_belt_level: '',
    max_belt_level: '',
    requires_belt_level: false,
    session_count: '',
    validity_months: '',
    is_recurring: false,
    is_active: true
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
        category_id: formData.category_id || undefined,
        base_price: formData.base_price ? parseFloat(formData.base_price) : 0,
        tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) : undefined,
        available_sizes: formData.available_sizes.length > 0 ? formData.available_sizes : undefined,
        requires_size: formData.requires_size,
        min_belt_level: formData.min_belt_level.trim() || undefined,
        max_belt_level: formData.max_belt_level.trim() || undefined,
        requires_belt_level: formData.requires_belt_level,
        session_count: formData.session_count ? parseInt(formData.session_count) : undefined,
        validity_months: formData.validity_months ? parseInt(formData.validity_months) : undefined,
        is_recurring: formData.is_recurring,
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
      tax_rate: '',
      available_sizes: [],
      requires_size: false,
      min_belt_level: '',
      max_belt_level: '',
      requires_belt_level: false,
      session_count: '',
      validity_months: '',
      is_recurring: false,
      is_active: true
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        <DialogDescription>
          Create a new product for your catalog. This can be a training program, class, or physical item.
        </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="Enter product SKU"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
                <Label htmlFor="base_price">Base Price *</Label>
                <Input
                  id="base_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => handleInputChange('base_price', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) => handleInputChange('tax_rate', e.target.value)}
                  placeholder="8.00"
                />
              </div>
            </div>
          </div>

          {/* Belt Level Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Belt Level Requirements</h3>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="requires_belt_level"
                checked={formData.requires_belt_level}
                onCheckedChange={(checked) => handleInputChange('requires_belt_level', checked)}
              />
              <Label htmlFor="requires_belt_level">Requires specific belt level</Label>
            </div>

            {formData.requires_belt_level && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_belt_level">Minimum Belt Level</Label>
                  <Input
                    id="min_belt_level"
                    value={formData.min_belt_level}
                    onChange={(e) => handleInputChange('min_belt_level', e.target.value)}
                    placeholder="e.g., White Belt"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_belt_level">Maximum Belt Level</Label>
                  <Input
                    id="max_belt_level"
                    value={formData.max_belt_level}
                    onChange={(e) => handleInputChange('max_belt_level', e.target.value)}
                    placeholder="e.g., Black Belt"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sessions & Validity */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sessions & Validity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session_count">Session Count</Label>
                <Input
                  id="session_count"
                  type="number"
                  min="1"
                  value={formData.session_count}
                  onChange={(e) => handleInputChange('session_count', e.target.value)}
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validity_months">Validity (months)</Label>
                <Input
                  id="validity_months"
                  type="number"
                  min="1"
                  value={formData.validity_months}
                  onChange={(e) => handleInputChange('validity_months', e.target.value)}
                  placeholder="12"
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => handleInputChange('is_recurring', checked)}
                />
                <Label htmlFor="is_recurring">Recurring product</Label>
              </div>
            </div>
          </div>

          {/* Size Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Size Options</h3>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="requires_size"
                checked={formData.requires_size}
                onCheckedChange={(checked) => handleInputChange('requires_size', checked)}
              />
              <Label htmlFor="requires_size">Product has size variants</Label>
            </div>

            {formData.requires_size && (
              <div className="space-y-2">
                <Label>Available Sizes</Label>
                <div className="text-sm text-muted-foreground">
                  Size management will be available in the product details page
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active Product</Label>
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductDialog;