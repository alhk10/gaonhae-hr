/**
 * Invoice Deletion Request Service
 * Handles approval workflow for invoice deletions
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { deleteInvoice } from './invoiceService';

export interface InvoiceDeletionRequest {
  id: string;
  invoice_id: string;
  requested_by: string;
  requested_by_email: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined fields
  invoice_number?: string;
  total_amount?: number;
  student_name?: string;
}

/**
 * Create a deletion request for an invoice
 */
export const createInvoiceDeletionRequest = async (
  invoiceId: string,
  reason?: string
): Promise<InvoiceDeletionRequest> => {
  try {
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check for existing pending deletion request
    const hasPending = await hasPendingInvoiceDeletionRequest(invoiceId);
    if (hasPending) {
      throw new Error('A pending deletion request already exists for this invoice');
    }

    // Get employee ID from email
    const { data: employee } = await supabase
      .from('employees')
      .select('id, name')
      .eq('email', user.email)
      .single();

    const { data, error } = await supabase
      .from('invoice_deletion_requests')
      .insert([{
        invoice_id: invoiceId,
        requested_by: employee?.id || user.id,
        requested_by_email: user.email,
        reason: reason || null,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create deletion request: ${error.message}`);
    }

    return data as InvoiceDeletionRequest;
  } catch (error) {
    logger.error('Error in createInvoiceDeletionRequest', error);
    throw error;
  }
};

/**
 * Get all pending invoice deletion requests (for superadmin dashboard)
 */
export const getPendingInvoiceDeletionRequests = async (): Promise<InvoiceDeletionRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('invoice_deletion_requests')
      .select(`
        *,
        invoices(
          invoice_number,
          total_amount,
          students(first_name, last_name)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending deletion requests: ${error.message}`);
    }

    // Transform the data to include joined fields
    return (data || []).map((request: any) => ({
      ...request,
      invoice_number: request.invoices?.invoice_number,
      total_amount: request.invoices?.total_amount,
      student_name: request.invoices?.students
        ? `${request.invoices.students.first_name} ${request.invoices.students.last_name}`
        : 'Unknown Student'
    })) as InvoiceDeletionRequest[];
  } catch (error) {
    logger.error('Error in getPendingInvoiceDeletionRequests', error);
    throw error;
  }
};

/**
 * Get count of pending invoice deletion requests
 */
export const getPendingInvoiceDeletionRequestsCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('invoice_deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to fetch pending count: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    logger.error('Error in getPendingInvoiceDeletionRequestsCount', error);
    return 0;
  }
};

/**
 * Approve a deletion request and execute the invoice deletion
 */
export const approveInvoiceDeletionRequest = async (requestId: string): Promise<void> => {
  try {
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the request to find the invoice ID
    const { data: request, error: fetchError } = await supabase
      .from('invoice_deletion_requests')
      .select('invoice_id')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new Error('Deletion request not found');
    }

    // Delete the actual invoice
    await deleteInvoice(request.invoice_id);

    // Update request status to approved
    const { error: updateError } = await supabase
      .from('invoice_deletion_requests')
      .update({
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(`Failed to update request status: ${updateError.message}`);
    }
  } catch (error) {
    logger.error('Error in approveInvoiceDeletionRequest', error);
    throw error;
  }
};

/**
 * Reject an invoice deletion request
 */
export const rejectInvoiceDeletionRequest = async (requestId: string): Promise<void> => {
  try {
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('invoice_deletion_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      throw new Error(`Failed to reject request: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in rejectInvoiceDeletionRequest', error);
    throw error;
  }
};

/**
 * Check if an invoice has a pending deletion request
 */
export const hasPendingInvoiceDeletionRequest = async (invoiceId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('invoice_deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('invoice_id', invoiceId)
      .eq('status', 'pending');

    if (error) {
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    return false;
  }
};
