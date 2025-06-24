
import { supabase } from "@/integrations/supabase/client";

export interface Claim {
  id: number;
  employeeId: string;
  employee: string;
  type: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  description: string;
}

export const getClaims = async (): Promise<Claim[]> => {
  console.log('Fetching claims from Supabase...');
  
  const { data: claims, error } = await supabase
    .from('claims')
    .select(`
      *,
      employees:employee_id(name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching claims:', error);
    throw error;
  }

  return claims.map(claim => ({
    id: claim.id,
    employeeId: claim.employee_id,
    employee: (claim.employees as any)?.name || 'Unknown',
    type: claim.type,
    amount: claim.amount,
    date: claim.submitted_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    status: claim.status as 'Pending' | 'Approved' | 'Rejected',
    description: claim.description
  }));
};

export const getEmployeeClaims = async (employeeId: string): Promise<Claim[]> => {
  console.log('Fetching claims for employee:', employeeId);
  
  const { data: claims, error } = await supabase
    .from('claims')
    .select(`
      *,
      employees:employee_id(name)
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee claims:', error);
    throw error;
  }

  return claims.map(claim => ({
    id: claim.id,
    employeeId: claim.employee_id,
    employee: (claim.employees as any)?.name || 'Unknown',
    type: claim.type,
    amount: claim.amount,
    date: claim.submitted_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    status: claim.status as 'Pending' | 'Approved' | 'Rejected',
    description: claim.description
  }));
};

export const updateClaimStatus = async (claimId: number, status: 'Pending' | 'Approved' | 'Rejected'): Promise<void> => {
  console.log('Updating claim status:', claimId, status);
  
  const { error } = await supabase
    .from('claims')
    .update({
      status,
      reviewed_date: new Date().toISOString()
    })
    .eq('id', claimId);

  if (error) {
    console.error('Error updating claim status:', error);
    throw error;
  }
};

export const createClaim = async (claim: Omit<Claim, 'id' | 'employee' | 'date' | 'status'>): Promise<void> => {
  console.log('Creating new claim:', claim);
  
  const { error } = await supabase
    .from('claims')
    .insert({
      employee_id: claim.employeeId,
      type: claim.type,
      amount: claim.amount,
      description: claim.description,
      status: 'Pending'
    });

  if (error) {
    console.error('Error creating claim:', error);
    throw error;
  }
};
