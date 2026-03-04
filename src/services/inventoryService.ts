/**
 * Inventory Service
 * Handles all inventory-related database operations
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InventoryItem {
  id: string;
  product_id: string;
  location_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_point?: number;
  reorder_quantity?: number;
  cost_per_unit?: number;
  size_variant?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
}

export interface ProductInventory {
  product_id: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  locations: Array<{
    location_id: string;
    location_name: string;
    quantity_on_hand: number;
    quantity_reserved: number;
    size_variant?: string;
  }>;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  reorder_needed: boolean;
}

/**
 * Get inventory for specific products
 */
export const getProductInventory = async (productIds: string[]): Promise<Record<string, ProductInventory>> => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        product_id,
        quantity_on_hand,
        quantity_reserved,
        size_variant,
        location_id,
        reorder_point
      `)
      .in('product_id', productIds);

    if (error) throw error;

    // Get location names
    const locationIds = [...new Set(data?.map(item => item.location_id) || [])];
    const { data: locations } = await supabase
      .from('branches')
      .select('id, name')
      .in('id', locationIds);

    const locationMap = new Map(locations?.map(loc => [loc.id, loc.name]) || []);

    // Group by product
    const inventory: Record<string, ProductInventory> = {};
    
    productIds.forEach(productId => {
      const productItems = data?.filter(item => item.product_id === productId) || [];
      
      const totalQuantity = productItems.reduce((sum, item) => sum + item.quantity_on_hand, 0);
      const reservedQuantity = productItems.reduce((sum, item) => sum + item.quantity_reserved, 0);
      const availableQuantity = totalQuantity - reservedQuantity;
      
      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'out_of_stock';
      if (availableQuantity > 0) {
        // Check if any location is below reorder point
        const hasLowStock = productItems.some(item => 
          item.reorder_point && item.quantity_on_hand <= item.reorder_point
        );
        status = hasLowStock ? 'low_stock' : 'in_stock';
      }

      inventory[productId] = {
        product_id: productId,
        total_quantity: totalQuantity,
        available_quantity: availableQuantity,
        reserved_quantity: reservedQuantity,
        locations: productItems.map(item => ({
          location_id: item.location_id,
          location_name: locationMap.get(item.location_id) || 'Unknown',
          quantity_on_hand: item.quantity_on_hand,
          quantity_reserved: item.quantity_reserved,
          size_variant: item.size_variant
        })),
        status,
        reorder_needed: productItems.some(item => 
          item.reorder_point && item.quantity_on_hand <= item.reorder_point
        )
      };
    });

    return inventory;
  } catch (error) {
    console.error('Error getting product inventory:', error);
    toast.error('Failed to load inventory data');
    return {};
  }
};

/**
 * Get inventory for a single product
 */
export const getSingleProductInventory = async (productId: string): Promise<ProductInventory | null> => {
  const result = await getProductInventory([productId]);
  return result[productId] || null;
};

/**
 * Adjust inventory for a product at a specific location
 */
export const adjustInventory = async (
  productId: string,
  locationId: string,
  quantityDelta: number,
  reason: string,
  sizeVariant?: string
): Promise<void> => {
  try {
    // First, get current inventory item
    let query = supabase
      .from('inventory_items')
      .select('*')
      .eq('product_id', productId)
      .eq('location_id', locationId);
    
    if (sizeVariant) {
      query = query.eq('size_variant', sizeVariant);
    } else {
      query = query.is('size_variant', null);
    }

    const { data: existing, error: fetchError } = await query.single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      // Update existing inventory
      const newQuantity = existing.quantity_on_hand + quantityDelta;
      
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          quantity_on_hand: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Create new inventory item
      const { error: insertError } = await supabase
        .from('inventory_items')
        .insert({
          product_id: productId,
          location_id: locationId,
          quantity_on_hand: quantityDelta,
          quantity_reserved: 0,
          size_variant: sizeVariant
        });

      if (insertError) throw insertError;
    }

    // Record inventory movement
    await supabase
      .from('inventory_movements')
      .insert({
        product_id: productId,
        location_id: locationId,
        quantity_delta: quantityDelta,
        movement_type: quantityDelta > 0 ? 'in' : 'out',
        reason,
        size_variant: sizeVariant
      });

    toast.success('Inventory updated successfully');
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to adjust inventory');
    throw error;
  }
};

/**
 * Get inventory locations
 */
export const getInventoryLocations = async (): Promise<InventoryLocation[]> => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id, name')
      .order('name');

    if (error) throw error;

    return data?.map(branch => ({
      id: branch.id,
      name: branch.name,
      is_active: true
    })) || [];
  } catch (error) {
    console.error('Error getting inventory locations:', error);
    toast.error('Failed to load inventory locations');
    return [];
  }
};