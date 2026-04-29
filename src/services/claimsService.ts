import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { postClaimJournal } from './accountingPostings';

export interface Claim {
  id: number;
  employeeId: string;
  employee: string;
  type: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  description: string;
  receipt_url?: string;
  branch_id?: string;
}

// Partner claim types that should flow to Branch P&L
const PARTNER_CLAIM_TYPES = [
  'Business Development',
  'Client Entertainment',
  'Marketing & Promotion',
  'Partnership Expense',
  'Branch Operations',
  'Training & Development',
  'Transport',
  'Other Business Expense',
];

export const getClaims = async (): Promise<Claim[]> => {
  try {
    logger.debug('Fetching all claims');
    
    const { data: claimsData, error } = await supabase
      .from('claims')
      .select(`
        *,
        employees!inner(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching claims:', error);
      throw error;
    }

    const transformedData: Claim[] = (claimsData || []).map((item: any) => ({
      id: item.id,
      employeeId: item.employee_id,
      employee: item.employees?.name || 'Unknown Employee',
      type: item.type,
      amount: parseFloat(item.amount),
      date: item.submitted_date ? new Date(item.submitted_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: item.status,
      description: item.description,
      receipt_url: item.receipt_url,
      branch_id: item.branch_id
    }));

    logger.debug(`Fetched ${transformedData.length} claims`);
    return transformedData;
  } catch (error) {
    logger.error('Error in getClaims:', error);
    throw error;
  }
};

export const getEmployeeClaims = async (employeeId: string): Promise<Claim[]> => {
  try {
    logger.debug('Fetching claims for employee', { employeeId });
    
    const { data: claimsData, error } = await supabase
      .from('claims')
      .select(`
        *,
        employees!inner(name)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching employee claims:', error);
      throw error;
    }

    const transformedData: Claim[] = (claimsData || []).map((item: any) => ({
      id: item.id,
      employeeId: item.employee_id,
      employee: item.employees?.name || 'Unknown Employee',
      type: item.type,
      amount: parseFloat(item.amount),
      date: item.submitted_date ? new Date(item.submitted_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: item.status,
      description: item.description,
      receipt_url: item.receipt_url,
      branch_id: item.branch_id
    }));

    return transformedData;
  } catch (error) {
    logger.error('Error in getEmployeeClaims:', error);
    throw error;
  }
};

export const createClaim = async (claim: Omit<Claim, 'id'> & { receipt_url?: string }, requireReceipt: boolean = true): Promise<void> => {
  try {
    logger.debug('Creating new claim', { claim });

    // Validate required fields
    if (requireReceipt && !claim.receipt_url) {
      throw new Error('Receipt is required to submit a claim');
    }

    const insertData: any = {
      employee_id: claim.employeeId,
      type: claim.type,
      amount: claim.amount,
      description: claim.description,
      status: claim.status || 'Pending',
      receipt_url: claim.receipt_url || null,
      submitted_date: new Date().toISOString()
    };

    // Add branch_id if provided
    if (claim.branch_id) {
      insertData.branch_id = claim.branch_id;
    }

    logger.debug('Inserting claim data', { insertData });

    const { error } = await supabase
      .from('claims')
      .insert([insertData]);

    if (error) {
      logger.error('Error inserting claim:', error);
      throw error;
    }

    logger.info('Claim created successfully');
  } catch (error) {
    logger.error('Error in createClaim:', error);
    throw error;
  }
};

export const updateClaim = async (
  id: number,
  updates: { type?: string; amount?: number; description?: string }
): Promise<void> => {
  try {
    logger.debug('Updating claim', { id, updates });
    const { error } = await supabase
      .from('claims')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    logger.info('Claim updated successfully');
  } catch (error) {
    logger.error('Error in updateClaim:', error);
    throw error;
  }
};

export const updateClaimStatus = async (
  id: number, 
  status: 'Approved' | 'Rejected'
): Promise<void> => {
  try {
    logger.debug('Updating claim status', { id, status });

    // First, get the claim details to check if it's a partner claim with branch
    const { data: claimData, error: fetchError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      logger.error('Error fetching claim for status update:', fetchError);
      throw fetchError;
    }

    // Update the claim status
    const { error } = await supabase
      .from('claims')
      .update({
        status,
        reviewed_date: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      logger.error('Error updating claim status:', error);
      throw error;
    }

    // If approved and it's a partner claim with a branch, sync to Branch P&L
    if (status === 'Approved' && claimData.branch_id && PARTNER_CLAIM_TYPES.includes(claimData.type)) {
      await syncClaimToBranchPL(claimData);
    }

    logger.info('Claim status updated successfully');
  } catch (error) {
    logger.error('Error in updateClaimStatus:', error);
    throw error;
  }
};

// Sync approved partner claim to Branch P&L as an expense
const syncClaimToBranchPL = async (claim: any): Promise<void> => {
  try {
    const submittedDate = new Date(claim.submitted_date);
    const month = submittedDate.getMonth() + 1; // 1-12
    const year = submittedDate.getFullYear();

    // Check if an entry already exists for this claim
    const { data: existingEntry } = await supabase
      .from('branch_profit_loss_entries')
      .select('id')
      .eq('branch_id', claim.branch_id)
      .eq('month', month)
      .eq('year', year)
      .eq('category', 'Partner Claims')
      .eq('subcategory', claim.type)
      .single();

    if (existingEntry) {
      // Update existing entry by adding the amount
      const { data: currentEntry } = await supabase
        .from('branch_profit_loss_entries')
        .select('amount, description')
        .eq('id', existingEntry.id)
        .single();

      if (currentEntry) {
        const newAmount = Number(currentEntry.amount) + Number(claim.amount);
        const newDescription = `${currentEntry.description || ''} | Claim #${claim.id}`.trim();
        
        await supabase
          .from('branch_profit_loss_entries')
          .update({
            amount: newAmount,
            description: newDescription.substring(0, 500), // Limit description length
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id);
      }
    } else {
      // Create new entry
      await supabase
        .from('branch_profit_loss_entries')
        .insert({
          branch_id: claim.branch_id,
          month,
          year,
          category: 'Partner Claims',
          subcategory: claim.type,
          description: `Partner claim #${claim.id}: ${claim.description?.substring(0, 200) || 'Business expense'}`,
          amount: Number(claim.amount),
          share_percentage: 100,
          type: 'expense',
          created_by: 'system'
        });
    }

    logger.info('Partner claim synced to Branch P&L', { claimId: claim.id, branchId: claim.branch_id });
  } catch (error) {
    logger.error('Error syncing claim to Branch P&L:', error);
    // Don't throw - this is a secondary operation
  }
};
