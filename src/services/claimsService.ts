
import { supabase } from '@/integrations/supabase/client';

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
}

export const getClaims = async (): Promise<Claim[]> => {
  try {
    console.log('Fetching all claims...');
    
    const { data: claimsData, error } = await supabase
      .from('claims')
      .select(`
        *,
        employees!inner(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching claims:', error);
      throw error;
    }

    console.log('Raw claims data from database:', claimsData);

    const transformedData: Claim[] = (claimsData || []).map((item: any) => ({
      id: item.id,
      employeeId: item.employee_id,
      employee: item.employees?.name || 'Unknown Employee',
      type: item.type,
      amount: parseFloat(item.amount),
      date: item.submitted_date ? new Date(item.submitted_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: item.status,
      description: item.description,
      receipt_url: item.receipt_url
    }));

    console.log('Transformed claims data:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Error in getClaims:', error);
    throw error;
  }
};

export const getEmployeeClaims = async (employeeId: string): Promise<Claim[]> => {
  try {
    console.log('Fetching claims for employee:', employeeId);
    
    const { data: claimsData, error } = await supabase
      .from('claims')
      .select(`
        *,
        employees!inner(name)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employee claims:', error);
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
      receipt_url: item.receipt_url
    }));

    return transformedData;
  } catch (error) {
    console.error('Error in getEmployeeClaims:', error);
    throw error;
  }
};

export const createClaim = async (claim: Omit<Claim, 'id'> & { receipt_url?: string }, requireReceipt: boolean = true): Promise<void> => {
  try {
    console.log('Creating new claim:', claim);

    // Validate required fields
    if (requireReceipt && !claim.receipt_url) {
      throw new Error('Receipt is required to submit a claim');
    }

    const insertData = {
      employee_id: claim.employeeId,
      type: claim.type,
      amount: claim.amount,
      description: claim.description,
      status: claim.status || 'Pending',
      receipt_url: claim.receipt_url || null,
      submitted_date: new Date().toISOString()
    };

    console.log('Inserting claim data:', insertData);

    const { error } = await supabase
      .from('claims')
      .insert([insertData]);

    if (error) {
      console.error('Error inserting claim:', error);
      throw error;
    }

    console.log('Claim created successfully');
  } catch (error) {
    console.error('Error in createClaim:', error);
    throw error;
  }
};

export const updateClaimStatus = async (
  id: number, 
  status: 'Approved' | 'Rejected'
): Promise<void> => {
  try {
    console.log(`Updating claim ${id} status to ${status}`);

    const { error } = await supabase
      .from('claims')
      .update({
        status,
        reviewed_date: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating claim status:', error);
      throw error;
    }

    console.log('Claim status updated successfully');
  } catch (error) {
    console.error('Error in updateClaimStatus:', error);
    throw error;
  }
};
