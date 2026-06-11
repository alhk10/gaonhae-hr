/**
 * Product Service
 * Handles all product-related database operations for the Sales Module
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface ProductVariants {
  sizes?: string[];
  colors?: string[];
  competitions?: string[];
}

// Helper to parse variants from database JSON
const parseVariants = (data: unknown): ProductVariants | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const obj = data as Record<string, unknown>;
  return {
    sizes: Array.isArray(obj.sizes) ? obj.sizes : undefined,
    colors: Array.isArray(obj.colors) ? obj.colors : undefined,
    competitions: Array.isArray(obj.competitions) ? obj.competitions : undefined
  };
};

// Helper to transform raw product data to Product type
const transformProduct = (raw: any): Product => ({
  id: raw.id,
  name: raw.name,
  sku: raw.sku,
  description: raw.description,
  category_id: raw.category_id,
  category_name: raw.product_categories?.name,
  base_price: raw.base_price,
  tax_rate: raw.tax_rate,
  available_sizes: raw.available_sizes,
  requires_size: raw.requires_size,
  available_variants: parseVariants(raw.available_variants),
  requires_color: raw.requires_color,
  requires_belt_rank: raw.requires_belt_rank,
  min_belt_level: raw.min_belt_level,
  max_belt_level: raw.max_belt_level,
  requires_belt_level: raw.requires_belt_level,
  allowed_belt_levels: raw.allowed_belt_levels,
  session_count: raw.session_count,
  validity_type: raw.validity_type,
  validity_months: raw.validity_months,
  term_id: raw.term_id,
  is_recurring: raw.is_recurring,
  is_service: raw.is_service,
  is_lesson: raw.is_lesson,
  is_adhoc_lesson: raw.is_adhoc_lesson,
  lessons_per_week: raw.lessons_per_week,
  lesson_days: raw.lesson_days,
  allowed_class_types: raw.allowed_class_types,
  is_active: raw.is_active,
  metadata: raw.metadata,
  created_at: raw.created_at,
  updated_at: raw.updated_at,
  created_by: raw.created_by,
  updated_by: raw.updated_by
});

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category_id?: string;
  category_name?: string; // Joined from product_categories
  base_price: number;
  tax_rate?: number;
  available_sizes?: string[];
  requires_size?: boolean;
  // New variant fields
  available_variants?: ProductVariants;
  requires_color?: boolean;
  requires_belt_rank?: boolean;
  // Belt level requirements
  min_belt_level?: string;
  max_belt_level?: string;
  requires_belt_level?: boolean;
  allowed_belt_levels?: string[];
  // Age requirements
  min_age?: number | null;
  max_age?: number | null;
  session_count?: number;
  validity_type?: 'months' | 'term';
  validity_months?: number;
  term_id?: string;
  is_recurring?: boolean;
  is_service?: boolean; // Service products don't track inventory
  // Lesson configuration
  is_lesson?: boolean;
  is_adhoc_lesson?: boolean;
  lessons_per_week?: number;
  lesson_days?: string[];
  allowed_class_types?: string[];
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
}

/**
 * Get products with pagination and filtering
 */
export const getProducts = async (
  page: number = 1,
  limit: number = 20,
  searchQuery?: string,
  categoryFilter?: string
): Promise<ProductsResponse> => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        product_categories(name)
      `, { count: 'exact' });

    // Apply search filter
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
    }

    // Apply category filter
    if (categoryFilter) {
      query = query.eq('category_id', categoryFilter);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by name
    query = query.order('name', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching products', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    // Transform the data using helper
    const transformedProducts = (data || []).map(transformProduct);

    return {
      products: transformedProducts,
      total: count || 0
    };
  } catch (error) {
    logger.error('Error in getProducts', error);
    throw error;
  }
};

/**
 * Search products by name or description
 */
export const searchProducts = async (
  searchTerm: string,
  limit: number = 10
): Promise<Partial<Product>[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        description,
        base_price,
        is_active,
        product_categories(name)
      `)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
      .eq('is_active', true)
      .limit(limit)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error searching products', error);
      throw new Error(`Failed to search products: ${error.message}`);
    }

    // Transform the data
    return (data || []).map(product => ({
      ...product,
      category_name: product.product_categories?.name
    }));
  } catch (error) {
    logger.error('Error in searchProducts', error);
    throw error;
  }
};

/**
 * Get a single product by ID
 */
export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories(name)
      `)
      .eq('id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Product not found
      }
      logger.error('Error fetching product', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return transformProduct(data);
  } catch (error) {
    logger.error('Error in getProductById', error);
    throw error;
  }
};

/**
 * Create a new product
 */
export const createProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> => {
  try {
    // Prepare the insert data, converting ProductVariants to plain object for JSON storage
    const insertData: Record<string, unknown> = {
      name: productData.name,
      sku: productData.sku,
      description: productData.description,
      category_id: productData.category_id,
      base_price: productData.base_price,
      tax_rate: productData.tax_rate,
      available_sizes: productData.available_sizes,
      requires_size: productData.requires_size,
      available_variants: productData.available_variants ? { ...productData.available_variants } : null,
      requires_color: productData.requires_color,
      requires_belt_rank: productData.requires_belt_rank,
      min_belt_level: productData.min_belt_level,
      max_belt_level: productData.max_belt_level,
      requires_belt_level: productData.requires_belt_level,
      allowed_belt_levels: productData.allowed_belt_levels,
      session_count: productData.session_count,
      validity_months: productData.validity_months,
      is_recurring: productData.is_recurring,
      is_service: productData.is_service,
      is_lesson: productData.is_lesson,
      is_adhoc_lesson: productData.is_lesson ? productData.is_adhoc_lesson : false,
      lessons_per_week: productData.is_lesson && !productData.is_adhoc_lesson ? productData.lessons_per_week : null,
      lesson_days: productData.is_lesson && !productData.is_adhoc_lesson ? productData.lesson_days : null,
      allowed_class_types: productData.is_lesson ? productData.allowed_class_types : null,
      is_active: productData.is_active,
      min_age: productData.min_age ?? null,
      max_age: productData.max_age ?? null,
      metadata: productData.metadata,
      created_by: productData.created_by,
      updated_by: productData.updated_by
    };

    const { data, error } = await supabase
      .from('products')
      .insert([insertData as any])
      .select(`
        *,
        product_categories(name)
      `)
      .single();

    if (error) {
      logger.error('Error creating product', error);
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return transformProduct(data);
  } catch (error) {
    logger.error('Error in createProduct', error);
    throw error;
  }
};

/**
 * Update an existing product
 */
export const updateProduct = async (
  productId: string, 
  updates: Partial<Omit<Product, 'id' | 'created_at'>>
): Promise<Product> => {
  try {
    // Convert ProductVariants to plain object for JSON storage
    const updateData: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Handle available_variants conversion
    if (updates.available_variants) {
      updateData.available_variants = { ...updates.available_variants };
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData as any)
      .eq('id', productId)
      .select(`
        *,
        product_categories(name)
      `)
      .single();

    if (error) {
      logger.error('Error updating product', error);
      throw new Error(`Failed to update product: ${error.message}`);
    }

    return transformProduct(data);
  } catch (error) {
    logger.error('Error in updateProduct', error);
    throw error;
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      logger.error('Error deleting product', error);
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in deleteProduct', error);
    throw error;
  }
};

/**
 * Get product categories
 */
export const getProductCategories = async (): Promise<Array<{id: string, name: string}>> => {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('Error fetching product categories', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getProductCategories', error);
    throw error;
  }
};