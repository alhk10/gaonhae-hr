/**
 * Inventory Adjustment Dialog
 * Dialog for adjusting inventory levels at specific locations
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Minus, Package } from 'lucide-react';
import { adjustInventory, getInventoryLocations, InventoryLocation } from '@/services/inventoryService';
import { Product } from '@/services/productService';

interface InventoryAdjustmentDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjustmentComplete?: () => void;
}

export const InventoryAdjustmentDialog: React.FC<InventoryAdjustmentDialogProps> = ({
  product,
  open,
  onOpenChange,
  onAdjustmentComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [formData, setFormData] = useState({
    location_id: '',
    quantity: '',
    adjustment_type: 'add' as 'add' | 'remove',
    reason: '',
    size_variant: ''
  });

  useEffect(() => {
    if (open) {
      loadLocations();
      resetForm();
    }
  }, [open]);

  const loadLocations = async () => {
    try {
      const data = await getInventoryLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      location_id: '',
      quantity: '',
      adjustment_type: 'add',
      reason: '',
      size_variant: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    if (!formData.location_id) {
      toast.error('Please select a location');
      return;
    }
    
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    setLoading(true);
    try {
      const quantityDelta = formData.adjustment_type === 'add' ? quantity : -quantity;
      
      await adjustInventory(
        product.id,
        formData.location_id,
        quantityDelta,
        formData.reason.trim(),
        formData.size_variant || undefined
      );
      
      toast.success('Inventory adjusted successfully');
      onOpenChange(false);
      onAdjustmentComplete?.();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to adjust inventory');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Adjust Inventory
          </DialogTitle>
          <DialogDescription>
            Adjust stock levels for {product.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Select
              value={formData.location_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, location_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Size Variant (if product has sizes) */}
          {product.requires_size && product.available_sizes && product.available_sizes.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="size_variant">Size Variant</Label>
              <Select
                value={formData.size_variant}
                onValueChange={(value) => setFormData(prev => ({ ...prev, size_variant: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific size</SelectItem>
                  {product.available_sizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label>Adjustment Type *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.adjustment_type === 'add' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormData(prev => ({ ...prev, adjustment_type: 'add' }))}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
              <Button
                type="button"
                variant={formData.adjustment_type === 'remove' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setFormData(prev => ({ ...prev, adjustment_type: 'remove' }))}
              >
                <Minus className="w-4 h-4 mr-2" />
                Remove Stock
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              placeholder="Enter quantity"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Enter reason for adjustment (e.g., Stock received, Damaged goods, Correction)"
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryAdjustmentDialog;
