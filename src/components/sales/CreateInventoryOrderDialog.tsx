/**
 * Create Inventory Order Dialog
 * Form for creating new purchase orders
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createInventoryOrder } from '@/services/inventoryOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface CreateInventoryOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateInventoryOrderDialog: React.FC<CreateInventoryOrderDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { userDetails, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [sizeVariant, setSizeVariant] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch products (physical products that are not services/lessons)
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('is_active', true)
        .eq('is_service', false)
        .eq('is_lesson', false)
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-for-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_locations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId || !locationId || !quantity || !unitCost) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createInventoryOrder({
        product_id: productId,
        location_id: locationId,
        size_variant: sizeVariant || undefined,
        quantity: parseInt(quantity),
        unit_cost: parseFloat(unitCost),
        notes: notes || undefined,
        requested_by: userDetails?.id || '',
        requested_by_email: user?.email || undefined
      });

      if (result) {
        queryClient.invalidateQueries({ queryKey: ['inventory-orders'] });
        queryClient.invalidateQueries({ queryKey: ['pending-orders-count'] });
        resetForm();
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setProductId('');
    setLocationId('');
    setSizeVariant('');
    setQuantity('');
    setUnitCost('');
    setNotes('');
  };

  const totalCost = quantity && unitCost 
    ? (parseInt(quantity) * parseFloat(unitCost)).toFixed(2) 
    : '0.00';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sizeVariant">Size/Variant (optional)</Label>
            <Input
              id="sizeVariant"
              value={sizeVariant}
              onChange={(e) => setSizeVariant(e.target.value)}
              placeholder="e.g., Large, XL, 32"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost ($) *</Label>
              <Input
                id="unitCost"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Cost:</span>
              <span className="font-bold">${totalCost}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !productId || !locationId || !quantity || !unitCost}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInventoryOrderDialog;
