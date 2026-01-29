/**
 * Invoice Change Log Service
 * Handles logging and retrieval of invoice change history
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface InvoiceChangeLog {
  id: string;
  invoice_id: string;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changes?: Record<string, any>;
  changed_by?: string;
  changed_by_email?: string;
  created_at: string;
}

export type InvoiceChangeAction = 
  | 'created'
  | 'status_changed'
  | 'payment_added'
  | 'payment_removed'
  | 'item_added'
  | 'item_removed'
  | 'item_updated'
  | 'field_updated'
  | 'deleted';

/**
 * Log a change to an invoice
 */
export const logInvoiceChange = async (params: {
  invoice_id: string;
  action: InvoiceChangeAction;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changes?: Record<string, any>;
}): Promise<void> => {
  try {
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('invoice_change_logs')
      .insert([{
        invoice_id: params.invoice_id,
        action: params.action,
        field_name: params.field_name,
        old_value: params.old_value,
        new_value: params.new_value,
        changes: params.changes,
        changed_by_email: user?.email
      }]);

    if (error) {
      logger.error('Error logging invoice change', error);
      // Don't throw - logging failures shouldn't break the main operation
    }
  } catch (error) {
    logger.error('Error in logInvoiceChange', error);
    // Silent fail - logging shouldn't break main operations
  }
};

/**
 * Get change logs for an invoice
 */
export const getInvoiceChangeLogs = async (invoiceId: string): Promise<InvoiceChangeLog[]> => {
  try {
    const { data, error } = await supabase
      .from('invoice_change_logs')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching invoice change logs', error);
      throw new Error(`Failed to fetch change logs: ${error.message}`);
    }

    return (data || []) as InvoiceChangeLog[];
  } catch (error) {
    logger.error('Error in getInvoiceChangeLogs', error);
    throw error;
  }
};

/**
 * Helper to format action for display
 */
export const formatActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    created: 'Invoice Created',
    status_changed: 'Status Changed',
    payment_added: 'Payment Added',
    payment_removed: 'Payment Removed',
    item_added: 'Item Added',
    item_removed: 'Item Removed',
    item_updated: 'Item Updated',
    field_updated: 'Field Updated',
    deleted: 'Invoice Deleted'
  };
  return labels[action] || action;
};

/**
 * Helper to get action color for UI
 */
export const getActionColor = (action: string): string => {
  const colors: Record<string, string> = {
    created: 'text-green-600',
    status_changed: 'text-blue-600',
    payment_added: 'text-emerald-600',
    payment_removed: 'text-red-600',
    item_added: 'text-teal-600',
    item_removed: 'text-orange-600',
    item_updated: 'text-amber-600',
    field_updated: 'text-purple-600',
    deleted: 'text-destructive'
  };
  return colors[action] || 'text-muted-foreground';
};
