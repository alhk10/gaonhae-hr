
// This file now serves as a fallback and type definitions
// The actual data is now fetched from Supabase via claimsService.ts

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
  reviewed_by?: string;
  reviewed_date?: string;
  submitted_date?: string;
  created_at?: string;
}

// Re-export the service functions for backward compatibility
export { 
  getClaims, 
  getEmployeeClaims, 
  updateClaimStatus, 
  createClaim as addClaim 
} from '@/services/claimsService';

// Legacy function name for backward compatibility
export const getAllClaims = async (): Promise<Claim[]> => {
  const { getClaims } = await import('@/services/claimsService');
  return getClaims();
};
