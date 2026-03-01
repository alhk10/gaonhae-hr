import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface SlotBookingEditRequest {
  id: string;
  booking_id: string;
  request_type: string;
  requested_by: string;
  new_employee_id: string | null;
  new_employee_name: string | null;
  new_branch_id: string | null;
  new_branch_name: string | null;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const createEditRequest = async (params: {
  bookingId: string;
  requestType: 'cancel' | 'swap' | 'branch_change';
  requestedBy: string;
  reason: string;
  newEmployeeId?: string;
  newEmployeeName?: string;
  newBranchId?: string;
  newBranchName?: string;
}): Promise<void> => {
  const { error } = await supabase
    .from('slot_booking_edit_requests' as any)
    .insert({
      booking_id: params.bookingId,
      request_type: params.requestType,
      requested_by: params.requestedBy,
      reason: params.reason,
      new_employee_id: params.newEmployeeId || null,
      new_employee_name: params.newEmployeeName || null,
      new_branch_id: params.newBranchId || null,
      new_branch_name: params.newBranchName || null,
      status: 'pending',
    });

  if (error) {
    logger.error('Error creating edit request', error);
    throw new Error(`Failed to create edit request: ${error.message}`);
  }
};

export const getPendingEditRequests = async (): Promise<SlotBookingEditRequest[]> => {
  const { data, error } = await supabase
    .from('slot_booking_edit_requests' as any)
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching pending edit requests', error);
    return [];
  }

  return (data || []) as unknown as SlotBookingEditRequest[];
};

export const getPendingEditRequestsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('slot_booking_edit_requests' as any)
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    logger.error('Error fetching pending edit requests count', error);
    return 0;
  }

  return count || 0;
};

export const approveEditRequest = async (requestId: string, reviewedBy: string): Promise<void> => {
  const { data: request, error: fetchError } = await supabase
    .from('slot_booking_edit_requests' as any)
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw new Error('Failed to fetch edit request');
  }

  const req = request as unknown as SlotBookingEditRequest;

  if (req.request_type === 'cancel') {
    const { error: cancelError } = await supabase
      .from('slot_bookings_new')
      .update({ status: 'cancelled', notes: `Cancelled via approved edit request: ${req.reason}` })
      .eq('id', req.booking_id);

    if (cancelError) throw new Error(`Failed to cancel booking: ${cancelError.message}`);
  } else if (req.request_type === 'swap') {
    const { error: swapError } = await supabase
      .from('slot_bookings_new')
      .update({
        employee_id: req.new_employee_id,
        employee_name: req.new_employee_name,
        notes: `Swapped via approved edit request: ${req.reason}`,
      })
      .eq('id', req.booking_id);

    if (swapError) throw new Error(`Failed to swap employee: ${swapError.message}`);
  } else if (req.request_type === 'branch_change') {
    const { error: branchError } = await supabase
      .from('slot_bookings_new')
      .update({
        branch_id: req.new_branch_id,
        branch_name: req.new_branch_name,
        notes: `Branch changed via approved edit request: ${req.reason}`,
      })
      .eq('id', req.booking_id);

    if (branchError) throw new Error(`Failed to change branch: ${branchError.message}`);
  }

  const { error: updateError } = await supabase
    .from('slot_booking_edit_requests' as any)
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) throw new Error(`Failed to update request status: ${updateError.message}`);
};

export const rejectEditRequest = async (requestId: string, reviewedBy: string): Promise<void> => {
  const { error } = await supabase
    .from('slot_booking_edit_requests' as any)
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) throw new Error(`Failed to reject request: ${error.message}`);
};
