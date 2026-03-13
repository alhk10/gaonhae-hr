/**
 * Inventory Adjustment Dialog
 * Dialog for adjusting inventory levels at specific locations
 * Supports branch-restricted mode with transfer option
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Minus, Package, ArrowRightLeft } from 'lucide-react';
import { adjustInventory, getInventoryLocations, InventoryLocation } from '@/services/inventoryService';
import { createTransferRequest } from '@/services/inventoryTransferService';
import { Product } from '@/services/productService';
import { useBranches } from '@/hooks/useBranches';
import { supabase } from '@/integrations/supabase/client';

interface InventoryAdjustmentDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjustmentComplete?: () => void;
  branchId?: string;
}

export const InventoryAdjustmentDialog: React.FC<InventoryAdjustmentDialogProps> = ({
  product,
  open,
  onOpenChange,
  onAdjustmentComplete,
  branchId
}) => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [branchLocationId, setBranchLocationId] = useState<string>('');
  const { branches } = useBranches();
  const [formData, setFormData] = useState({
    location_id: '',
    quantity: '',
    adjustment_type: 'add' as 'add' | 'remove' | 'transfer',
    reason: '',
    size_variant: '',
    color_variant: '',
    transfer_to_branch_id: ''
  });

  const isBranchMode = !!branchId;

  useEffect(() => {
    if (open) {
      if (isBranchMode) {
        loadBranchLocation();
      } else {
        loadLocations();
      }
      resetForm();
    }
  }, [open, branchId]);

  const loadBranchLocation = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_locations')
        .select('id, name')
        .eq('branch_id', branchId!)
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        setBranchLocationId(data[0].id);
        setFormData(prev => ({ ...prev, location_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error loading branch location:', error);
    }
  };

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
      size_variant: '',
      color_variant: '',
      transfer_to_branch_id: ''
    });
    setBranchLocationId('');
  };

  const otherBranches = branches.filter(b => b.id !== branchId);

  const hasSize = product?.requires_size && product?.available_sizes && product.available_sizes.length > 0;
  const hasColor = product?.requires_color && product?.available_variants?.colors && product.available_variants.colors.length > 0;

  const getCombinedVariant = (): string | undefined => {
    const parts = [formData.color_variant, formData.size_variant].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;

    const locationId = isBranchMode ? branchLocationId : formData.location_id;
    
    if (!locationId) {
      toast.error('Please select a location');
      return;
    }
    
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (hasSize && !formData.size_variant) {
      toast.error('Please select a size variant');
      return;
    }

    if (hasColor && !formData.color_variant) {
      toast.error('Please select a color variant');
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    const combinedVariant = getCombinedVariant();

    if (formData.adjustment_type === 'transfer') {
      if (!formData.transfer_to_branch_id) {
        toast.error('Please select a destination branch');
        return;
      }

      setLoading(true);
      try {
        const branchName = branches.find(b => b.id === branchId)?.name || branchId || 'Unknown';
        const success = await createTransferRequest({
          from_branch_id: branchId!,
          to_branch_id: formData.transfer_to_branch_id,
          product_id: product.id,
          quantity,
          size_variant: combinedVariant,
          reason: formData.reason.trim(),
          requested_by: branchName,
        });
        if (success) {
          onOpenChange(false);
          onAdjustmentComplete?.();
        }
      } catch (error) {
        console.error('Error creating transfer request:', error);
        toast.error('Failed to create transfer request');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const quantityDelta = formData.adjustment_type === 'add' ? quantity : -quantity;
      
      await adjustInventory(
        product.id,
        locationId,
        quantityDelta,
        formData.reason.trim(),
        combinedVariant
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
          {/* Location - hidden in branch mode */}
          {!isBranchMode && (
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
          )}

          {/* Color Variant (if product has colors) */}
          {hasColor && (
            <div className="space-y-2">
              <Label>Color Variant *</Label>
              <Select
                value={formData.color_variant}
                onValueChange={(value) => setFormData(prev => ({ ...prev, color_variant: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {product!.available_variants!.colors!.map((color) => (
                    <SelectItem key={color} value={color}>
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Size Variant (if product has sizes) */}
          {hasSize && (
            <div className="space-y-2">
              <Label>Size Variant *</Label>
              <Select
                value={formData.size_variant}
                onValueChange={(value) => setFormData(prev => ({ ...prev, size_variant: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {product!.available_sizes!.map((size) => (
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
                onClick={() => setFormData(prev => ({ ...prev, adjustment_type: 'add', transfer_to_branch_id: '' }))}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
              <Button
                type="button"
                variant={formData.adjustment_type === 'remove' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setFormData(prev => ({ ...prev, adjustment_type: 'remove', transfer_to_branch_id: '' }))}
              >
                <Minus className="w-4 h-4 mr-1" />
                Remove
              </Button>
              {isBranchMode && (
                <Button
                  type="button"
                  variant={formData.adjustment_type === 'transfer' ? 'default' : 'outline'}
                  className={`flex-1 ${formData.adjustment_type === 'transfer' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, adjustment_type: 'transfer' }))}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-1" />
                  Transfer
                </Button>
              )}
            </div>
          </div>

          {/* Transfer To Branch - only when transfer type selected */}
          {formData.adjustment_type === 'transfer' && (
            <div className="space-y-2">
              <Label>Transfer To Branch *</Label>
              <Select
                value={formData.transfer_to_branch_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, transfer_to_branch_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination branch" />
                </SelectTrigger>
                <SelectContent>
                  {otherBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Transfer requests require superadmin approval before stock is moved.
              </p>
            </div>
          )}

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
              placeholder={formData.adjustment_type === 'transfer' 
                ? "Enter reason for transfer request" 
                : "Enter reason for adjustment (e.g., Stock received, Damaged goods, Correction)"}
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
              {formData.adjustment_type === 'transfer' ? 'Submit Transfer Request' : 'Confirm Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryAdjustmentDialog;
