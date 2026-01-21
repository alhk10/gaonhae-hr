/**
 * Price Rules Service
 * Manages branch-specific pricing and tax rates with currency support
 */

import { supabase } from '@/integrations/supabase/client';

export interface PriceRule {
  id: string;
  product_id: string;
  rule_name: string;
  branch_id: string | null;
  branch_name?: string;
  branch_currency?: string;
  price_override: number | null;
  tax_rate: number | null;
  discount_percentage: number | null;
  belt_min: string | null;
  belt_max: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchPrice {
  branch_id: string;
  branch_name: string;
  branch_currency: string;
  branch_country: string;
  price: number | null;
  tax_rate: number | null;
  tax_included: boolean | null;
  rule_id?: string;
}

export interface CreatePriceRuleData {
  product_id: string;
  rule_name: string;
  branch_id: string | null;
  price_override: number | null;
  tax_rate?: number | null;
  tax_included?: boolean | null;
  discount_percentage?: number | null;
  belt_min?: string | null;
  belt_max?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean;
}

/**
 * Get all price rules for a product
 */
export async function getProductPriceRules(productId: string): Promise<PriceRule[]> {
  const { data, error } = await supabase
    .from('price_rules')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching price rules:', error);
    throw error;
  }

  // Fetch branch info separately
  if (data && data.length > 0) {
    const branchIds = data.filter(r => r.branch_id).map(r => r.branch_id);
    if (branchIds.length > 0) {
      const { data: branches } = await supabase
        .from('branches')
        .select('id, name, currency')
        .in('id', branchIds);

      const branchMap = new Map(branches?.map(b => [b.id, b]) || []);
      
      return data.map(rule => ({
        ...rule,
        is_active: rule.is_active ?? true,
        branch_name: rule.branch_id ? branchMap.get(rule.branch_id)?.name : undefined,
        branch_currency: rule.branch_id ? branchMap.get(rule.branch_id)?.currency || 'SGD' : undefined,
      }));
    }
  }

  return (data || []).map(rule => ({
    ...rule,
    is_active: rule.is_active ?? true,
  }));
}

/**
 * Get branch prices for a product (simplified view)
 */
export async function getProductBranchPrices(productId: string): Promise<BranchPrice[]> {
  // Get all branches with currency and country
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id, name, currency, country')
    .not('name', 'in', '("Competition","Headquarters")')
    .order('name');

  if (branchError) {
    console.error('Error fetching branches:', branchError);
    throw branchError;
  }

  // Get branch-specific price rules for this product
  const { data: rules, error: rulesError } = await supabase
    .from('price_rules')
    .select('*')
    .eq('product_id', productId)
    .not('branch_id', 'is', null)
    .eq('is_active', true);

  if (rulesError) {
    console.error('Error fetching price rules:', rulesError);
    throw rulesError;
  }

  const ruleMap = new Map(rules?.map(r => [r.branch_id, r]) || []);

  return (branches || []).map(branch => ({
    branch_id: branch.id,
    branch_name: branch.name,
    branch_currency: branch.currency || 'SGD',
    branch_country: branch.country || 'Singapore',
    price: ruleMap.get(branch.id)?.price_override ?? null,
    tax_rate: ruleMap.get(branch.id)?.tax_rate ?? null,
    tax_included: ruleMap.get(branch.id)?.tax_included ?? null,
    rule_id: ruleMap.get(branch.id)?.id,
  }));
}

/**
 * Create a new price rule
 */
export async function createPriceRule(data: CreatePriceRuleData): Promise<PriceRule> {
  const { data: result, error } = await supabase
    .from('price_rules')
    .insert({
      product_id: data.product_id,
      rule_name: data.rule_name,
      branch_id: data.branch_id,
      price_override: data.price_override,
      tax_rate: data.tax_rate ?? null,
      tax_included: data.tax_included ?? null,
      discount_percentage: data.discount_percentage || null,
      belt_min: data.belt_min || null,
      belt_max: data.belt_max || null,
      effective_from: data.effective_from || null,
      effective_to: data.effective_to || null,
      is_active: data.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating price rule:', error);
    throw error;
  }

  return { ...result, is_active: result.is_active ?? true };
}

/**
 * Update an existing price rule
 */
export async function updatePriceRule(
  ruleId: string,
  data: Partial<CreatePriceRuleData>
): Promise<PriceRule> {
  const { data: result, error } = await supabase
    .from('price_rules')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ruleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating price rule:', error);
    throw error;
  }

  return { ...result, is_active: result.is_active ?? true };
}

/**
 * Delete a price rule
 */
export async function deletePriceRule(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from('price_rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    console.error('Error deleting price rule:', error);
    throw error;
  }
}

/**
 * Upsert branch price, tax rate, and tax inclusion (create or update)
 */
export async function upsertBranchPrice(
  productId: string,
  branchId: string,
  branchName: string,
  price: number | null,
  taxRate: number | null,
  taxIncluded: boolean | null,
  existingRuleId?: string
): Promise<void> {
  // If all values are null and rule exists, delete the rule
  if (price === null && taxRate === null && taxIncluded === null) {
    if (existingRuleId) {
      await deletePriceRule(existingRuleId);
    }
    return;
  }

  if (existingRuleId) {
    // Update existing rule
    await updatePriceRule(existingRuleId, {
      price_override: price,
      tax_rate: taxRate,
      tax_included: taxIncluded,
    });
  } else {
    // Create new rule
    await createPriceRule({
      product_id: productId,
      rule_name: `${branchName} Price`,
      branch_id: branchId,
      price_override: price,
      tax_rate: taxRate,
      tax_included: taxIncluded,
      is_active: true,
    });
  }
}

/**
 * Bulk update branch prices and tax rates for a product
 */
export async function bulkUpdateBranchPrices(
  productId: string,
  branchPrices: BranchPrice[]
): Promise<void> {
  for (const bp of branchPrices) {
    await upsertBranchPrice(
      productId,
      bp.branch_id,
      bp.branch_name,
      bp.price,
      bp.tax_rate,
      bp.tax_included,
      bp.rule_id
    );
  }
}
