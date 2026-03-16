/**
 * Invoice Action Request Service
 * Handles approval workflows for invoice adjustments and cancellations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface InvoiceActionRequest {
  id: string;
  invoice_id: string;
  action_type: 'adjustment' | 'cancellation' | 'item_refund';
  request_data: any;
  requested_by: string | null;
  requested_by_email: string | null;
  invoice_number: string | null;
  student_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

/**
 * Submit an action request for superadmin approval
 */
export const submitActionRequest = async (
  invoiceId: string,
  actionType: 'adjustment' | 'cancellation' | 'item_refund',
  requestData: any,
  invoiceNumber: string,
  studentName: string,
  requestedByEmail: string
): Promise<InvoiceActionRequest> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('invoice_action_requests')
    .insert({
      invoice_id: invoiceId,
      action_type: actionType,
      request_data: requestData,
      requested_by: user?.id || null,
      requested_by_email: requestedByEmail,
      invoice_number: invoiceNumber,
      student_name: studentName,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    logger.error('Error submitting action request', error);
    throw new Error(`Failed to submit request: ${error.message}`);
  }

  return data as InvoiceActionRequest;
};

/**
 * Get all pending action requests (for superadmin dashboard)
 */
export const getPendingActionRequests = async (): Promise<InvoiceActionRequest[]> => {
  const { data, error } = await supabase
    .from('invoice_action_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching pending action requests', error);
    return [];
  }

  return (data || []) as InvoiceActionRequest[];
};

/**
 * Get count of pending action requests
 */
export const getPendingActionRequestsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('invoice_action_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    logger.error('Error fetching pending action requests count', error);
    return 0;
  }

  return count || 0;
};

/**
 * Approve an action request
 */
export const approveActionRequest = async (requestId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('invoice_action_requests')
    .update({
      status: 'approved',
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) {
    logger.error('Error approving action request', error);
    throw new Error(`Failed to approve request: ${error.message}`);
  }
};

/**
 * Reject an action request
 */
export const rejectActionRequest = async (requestId: string, reason: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('invoice_action_requests')
    .update({
      status: 'rejected',
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason
    })
    .eq('id', requestId);

  if (error) {
    logger.error('Error rejecting action request', error);
    throw new Error(`Failed to reject request: ${error.message}`);
  }
};
