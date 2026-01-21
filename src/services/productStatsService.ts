/**
 * Product Stats Service
 * Provides aggregated statistics for the product management dashboard
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  activeCategories: number;
  totalInventoryItems: number;
  lowStockCount: number;
  outOfStockCount: number;
}

/**
 * Get aggregated product statistics for the dashboard
 */
export const getProductStats = async (): Promise<ProductStats> => {
  try {
    // Fetch all stats in parallel for efficiency
    const [productsResult, categoriesResult, inventoryResult] = await Promise.all([
      supabase.from('products').select('id, is_active', { count: 'exact' }),
      supabase.from('product_categories').select('id, is_active', { count: 'exact' }),
      supabase.from('inventory_items').select('id, quantity_on_hand, quantity_reserved, reorder_point')
    ]);

    if (productsResult.error) {
      logger.error('Error fetching products stats', productsResult.error);
    }
    if (categoriesResult.error) {
      logger.error('Error fetching categories stats', categoriesResult.error);
    }
    if (inventoryResult.error) {
      logger.error('Error fetching inventory stats', inventoryResult.error);
    }

    const products = productsResult.data || [];
    const categories = categoriesResult.data || [];
    const inventoryItems = inventoryResult.data || [];

    // Calculate product stats
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.is_active).length;

    // Calculate category stats
    const totalCategories = categories.length;
    const activeCategories = categories.filter(c => c.is_active).length;

    // Calculate inventory stats
    const totalInventoryItems = inventoryItems.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventoryItems.forEach(item => {
      const availableQty = item.quantity_on_hand - item.quantity_reserved;
      if (availableQty <= 0) {
        outOfStockCount++;
      } else if (item.reorder_point && item.quantity_on_hand <= item.reorder_point) {
        lowStockCount++;
      }
    });

    return {
      totalProducts,
      activeProducts,
      totalCategories,
      activeCategories,
      totalInventoryItems,
      lowStockCount,
      outOfStockCount
    };
  } catch (error) {
    logger.error('Error in getProductStats', error);
    return {
      totalProducts: 0,
      activeProducts: 0,
      totalCategories: 0,
      activeCategories: 0,
      totalInventoryItems: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    };
  }
};

/**
 * Bulk update product status
 */
export const bulkUpdateProductStatus = async (
  productIds: string[],
  isActive: boolean
): Promise<{ success: number; failed: number }> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .in('id', productIds)
      .select('id');

    if (error) {
      logger.error('Error in bulk update', error);
      throw error;
    }

    return {
      success: data?.length || 0,
      failed: productIds.length - (data?.length || 0)
    };
  } catch (error) {
    logger.error('Error in bulkUpdateProductStatus', error);
    throw error;
  }
};

/**
 * Bulk delete products
 */
export const bulkDeleteProducts = async (
  productIds: string[]
): Promise<{ success: number; failed: number }> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .in('id', productIds)
      .select('id');

    if (error) {
      logger.error('Error in bulk delete', error);
      throw error;
    }

    return {
      success: data?.length || 0,
      failed: productIds.length - (data?.length || 0)
    };
  } catch (error) {
    logger.error('Error in bulkDeleteProducts', error);
    throw error;
  }
};
