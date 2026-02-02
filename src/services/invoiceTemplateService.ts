/**
 * Invoice Template Service
 * Handles CRUD operations for invoice templates
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface TemplateItem {
  category_id?: string;
  product_id?: string;
  quantity?: number;
  unit_price?: number;
  description?: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description?: string;
  default_payment_terms_days: number;
  default_notes?: string;
  default_internal_notes?: string;
  template_items: TemplateItem[];
  is_active: boolean;
  branch_id?: string;
  country?: string;
  paynow_qr_url?: string;
  logo_url?: string;
  letterhead_url?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  default_payment_terms_days?: number;
  default_notes?: string;
  default_internal_notes?: string;
  template_items?: TemplateItem[];
  branch_id?: string;
  country?: string;
  paynow_qr_url?: string;
  logo_url?: string;
  letterhead_url?: string;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  default_payment_terms_days?: number;
  default_notes?: string;
  default_internal_notes?: string;
  template_items?: TemplateItem[];
  is_active?: boolean;
  branch_id?: string;
  country?: string;
  paynow_qr_url?: string;
  logo_url?: string;
  letterhead_url?: string;
}

/**
 * Get all invoice templates
 */
export const getInvoiceTemplates = async (activeOnly: boolean = true): Promise<InvoiceTemplate[]> => {
  try {
    let query = supabase
      .from('invoice_templates')
      .select('*')
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching invoice templates', error);
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    return (data || []).map(template => ({
      ...template,
      template_items: (template.template_items as TemplateItem[]) || []
    })) as InvoiceTemplate[];
  } catch (error) {
    logger.error('Error in getInvoiceTemplates', error);
    throw error;
  }
};

/**
 * Get a single template by ID
 */
export const getInvoiceTemplateById = async (templateId: string): Promise<InvoiceTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch template: ${error.message}`);
    }

    return {
      ...data,
      template_items: (data.template_items as TemplateItem[]) || []
    } as InvoiceTemplate;
  } catch (error) {
    logger.error('Error in getInvoiceTemplateById', error);
    throw error;
  }
};

/**
 * Create a new invoice template
 */
export const createInvoiceTemplate = async (templateData: CreateTemplateData): Promise<InvoiceTemplate> => {
  try {
    const { data, error } = await supabase
      .from('invoice_templates')
      .insert([{
        name: templateData.name,
        description: templateData.description,
        default_payment_terms_days: templateData.default_payment_terms_days || 30,
        default_notes: templateData.default_notes,
        default_internal_notes: templateData.default_internal_notes,
        template_items: JSON.parse(JSON.stringify(templateData.template_items || [])),
        branch_id: templateData.branch_id,
        country: templateData.country || 'SG',
        paynow_qr_url: templateData.paynow_qr_url,
        logo_url: templateData.logo_url,
        letterhead_url: templateData.letterhead_url,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    return {
      ...data,
      template_items: (data.template_items as TemplateItem[]) || []
    } as InvoiceTemplate;
  } catch (error) {
    logger.error('Error in createInvoiceTemplate', error);
    throw error;
  }
};

/**
 * Update an existing template
 */
export const updateInvoiceTemplate = async (
  templateId: string, 
  updates: UpdateTemplateData
): Promise<InvoiceTemplate> => {
  try {
    // Convert template_items to JSON-compatible format
    const updatePayload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    if (updates.template_items) {
      updatePayload.template_items = JSON.parse(JSON.stringify(updates.template_items));
    }

    const { data, error } = await supabase
      .from('invoice_templates')
      .update(updatePayload)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return {
      ...data,
      template_items: (data.template_items as TemplateItem[]) || []
    } as InvoiceTemplate;
  } catch (error) {
    logger.error('Error in updateInvoiceTemplate', error);
    throw error;
  }
};

/**
 * Delete a template (soft delete by setting is_active = false)
 */
export const deleteInvoiceTemplate = async (templateId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoice_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', templateId);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in deleteInvoiceTemplate', error);
    throw error;
  }
};

/**
 * Permanently delete a template
 */
export const permanentlyDeleteInvoiceTemplate = async (templateId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoice_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      throw new Error(`Failed to permanently delete template: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in permanentlyDeleteInvoiceTemplate', error);
    throw error;
  }
};
