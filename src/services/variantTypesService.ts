/**
 * Variant Types Service
 * Handles fetching variant types and presets from the database
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface VariantPreset {
  name: string;
  options: string[];
}

export interface VariantType {
  id: string;
  name: string;
  code: string;
  presets: VariantPreset[];
  sort_order: number;
  is_active: boolean;
}

export interface ProductVariants {
  sizes?: string[];
  colors?: string[];
  competitions?: string[];
}

/**
 * Get all active variant types with their presets
 */
export const getVariantTypes = async (): Promise<VariantType[]> => {
  try {
    const { data, error } = await supabase
      .from('product_variant_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('Error fetching variant types', error);
      throw new Error(`Failed to fetch variant types: ${error.message}`);
    }

    // Parse presets from jsonb with proper typing
    return (data || []).map(vt => {
      let presets: VariantPreset[] = [];
      if (Array.isArray(vt.presets)) {
        presets = vt.presets.map((p: unknown) => {
          const preset = p as { name?: string; options?: string[] };
          return {
            name: preset.name || '',
            options: Array.isArray(preset.options) ? preset.options : []
          };
        });
      }
      return {
        id: vt.id,
        name: vt.name,
        code: vt.code,
        sort_order: vt.sort_order ?? 0,
        is_active: vt.is_active ?? true,
        presets
      };
    });
  } catch (error) {
    logger.error('Error in getVariantTypes', error);
    throw error;
  }
};

/**
 * Get a single variant type by code
 */
export const getVariantTypeByCode = async (code: string): Promise<VariantType | null> => {
  try {
    const { data, error } = await supabase
      .from('product_variant_types')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Error fetching variant type', error);
      throw new Error(`Failed to fetch variant type: ${error.message}`);
    }

    let presets: VariantPreset[] = [];
    if (Array.isArray(data.presets)) {
      presets = data.presets.map((p: unknown) => {
        const preset = p as { name?: string; options?: string[] };
        return {
          name: preset.name || '',
          options: Array.isArray(preset.options) ? preset.options : []
        };
      });
    }

    return {
      id: data.id,
      name: data.name,
      code: data.code,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
      presets
    };
  } catch (error) {
    logger.error('Error in getVariantTypeByCode', error);
    throw error;
  }
};

/**
 * Flatten product variants object to a combined list for display
 */
export const flattenVariants = (variants: ProductVariants): { type: string; values: string[] }[] => {
  const result: { type: string; values: string[] }[] = [];
  
  if (variants.sizes?.length) {
    result.push({ type: 'size', values: variants.sizes });
  }
  if (variants.colors?.length) {
    result.push({ type: 'color', values: variants.colors });
  }
  
  return result;
};

/**
 * Calculate total variant combinations
 */
export const calculateVariantCombinations = (variants: ProductVariants): number => {
  const sizes = variants.sizes?.length || 1;
  const colors = variants.colors?.length || 1;
  
  return sizes * colors;
};
