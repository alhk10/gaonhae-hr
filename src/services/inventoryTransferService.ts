import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { adjustInventory } from './inventoryService';

export interface TransferRequest {
  id: string;
  from_branch_id: string;
  to_branch_id: string;
  product_id: string;
  quantity: number;
  size_variant?: string;
  reason?: string;
  status: string;
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TransferRequestWithDetails extends TransferRequest {
  from_branch_name?: string;
  to_branch_name?: string;
  product_name?: string;
}

export const createTransferRequest = async (data: {
  from_branch_id: string;
  to_branch_id: string;
  product_id: string;
  quantity: number;
  size_variant?: string;
  reason?: string;
  requested_by: string;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('inventory_transfer_requests')
      .insert(data);
    if (error) throw error;
    toast.success('Transfer request submitted for approval');
    return true;
  } catch (error) {
    console.error('Error creating transfer request:', error);
    toast.error('Failed to create transfer request');
    return false;
  }
};

export const getPendingTransferRequests = async (): Promise<TransferRequestWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_transfer_requests')
      .select('*, products(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Get branch names
    const branchIds = [...new Set((data || []).flatMap(r => [r.from_branch_id, r.to_branch_id]))];
    const { data: branches } = await supabase.from('branches').select('id, name').in('id', branchIds);
    const branchMap = new Map((branches || []).map(b => [b.id, b.name]));

    return (data || []).map(r => ({
      ...r,
      product_id: r.product_id as string,
      from_branch_name: branchMap.get(r.from_branch_id) || r.from_branch_id,
      to_branch_name: branchMap.get(r.to_branch_id) || r.to_branch_id,
      product_name: (r.products as any)?.name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching pending transfer requests:', error);
    return [];
  }
};

export const getPendingTransferRequestsCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('inventory_transfer_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching pending transfer count:', error);
    return 0;
  }
};

export const getTransferRequestsByBranch = async (branchId: string): Promise<TransferRequestWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_transfer_requests')
      .select('*, products(name)')
      .or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    const branchIds = [...new Set((data || []).flatMap(r => [r.from_branch_id, r.to_branch_id]))];
    const { data: branches } = await supabase.from('branches').select('id, name').in('id', branchIds);
    const branchMap = new Map((branches || []).map(b => [b.id, b.name]));

    return (data || []).map(r => ({
      ...r,
      product_id: r.product_id as string,
      from_branch_name: branchMap.get(r.from_branch_id) || r.from_branch_id,
      to_branch_name: branchMap.get(r.to_branch_id) || r.to_branch_id,
      product_name: (r.products as any)?.name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching branch transfer requests:', error);
    return [];
  }
};

export const approveTransferRequest = async (id: string, approvedBy: string): Promise<boolean> => {
  try {
    // Get the request details
    const { data: request, error: fetchError } = await supabase
      .from('inventory_transfer_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !request) throw fetchError || new Error('Request not found');

    // Get inventory locations for from and to branches
    const { data: fromLocations } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('branch_id', request.from_branch_id)
      .limit(1);
    
    const { data: toLocations } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('branch_id', request.to_branch_id)
      .limit(1);

    const fromLocationId = fromLocations?.[0]?.id;
    const toLocationId = toLocations?.[0]?.id;

    if (!fromLocationId || !toLocationId) {
      throw new Error('Inventory locations not found for one or both branches');
    }

    // Subtract from source
    await adjustInventory(
      request.product_id,
      fromLocationId,
      -request.quantity,
      `Stock transfer to ${request.to_branch_id} (approved)`,
      request.size_variant || undefined
    );

    // Add to destination
    await adjustInventory(
      request.product_id,
      toLocationId,
      request.quantity,
      `Stock transfer from ${request.from_branch_id} (approved)`,
      request.size_variant || undefined
    );

    // Update status
    const { error: updateError } = await supabase
      .from('inventory_transfer_requests')
      .update({ status: 'approved', approved_by: approvedBy, approved_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) throw updateError;

    toast.success('Transfer request approved and stock adjusted');
    return true;
  } catch (error) {
    console.error('Error approving transfer request:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to approve transfer');
    return false;
  }
};

export const rejectTransferRequest = async (id: string, rejectedBy: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('inventory_transfer_requests')
      .update({ status: 'rejected', approved_by: rejectedBy, approved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    toast.success('Transfer request rejected');
    return true;
  } catch (error) {
    console.error('Error rejecting transfer request:', error);
    toast.error('Failed to reject transfer request');
    return false;
  }
};
