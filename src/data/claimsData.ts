
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

// Centralized claims data
const claimsData: Claim[] = [
  { 
    id: 1, 
    employeeId: 'EMP001',
    employee: 'John Tan', 
    type: 'Travel', 
    amount: 45.50, 
    date: '2024-12-20', 
    status: 'Pending',
    description: 'Taxi fare for client meeting'
  },
  { 
    id: 2, 
    employeeId: 'EMP002',
    employee: 'Mary Ng', 
    type: 'Meals', 
    amount: 25.00, 
    date: '2024-12-19', 
    status: 'Approved',
    description: 'Lunch with client'
  },
  { 
    id: 3, 
    employeeId: 'EMP003',
    employee: 'David Lim', 
    type: 'Office Supplies', 
    amount: 120.30, 
    date: '2024-12-18', 
    status: 'Rejected',
    description: 'Stationery for department'
  },
  {
    id: 4,
    employeeId: 'EMP001',
    employee: 'John Tan',
    type: 'Medical',
    amount: 85.00,
    date: '2024-12-15',
    status: 'Approved',
    description: 'Medical consultation'
  },
  {
    id: 5,
    employeeId: 'EMP002',
    employee: 'Mary Ng',
    type: 'Training',
    amount: 150.00,
    date: '2024-12-10',
    status: 'Approved',
    description: 'Professional development course'
  }
];

export const getAllClaims = (): Claim[] => {
  console.log('Getting all claims:', claimsData);
  return [...claimsData];
};

export const getEmployeeClaims = (employeeId: string): Claim[] => {
  const employeeClaims = claimsData.filter(claim => claim.employeeId === employeeId);
  console.log(`Getting claims for employee ${employeeId}:`, employeeClaims);
  return employeeClaims;
};

export const updateClaimStatus = (claimId: number, status: 'Pending' | 'Approved' | 'Rejected'): void => {
  const claimIndex = claimsData.findIndex(claim => claim.id === claimId);
  if (claimIndex !== -1) {
    claimsData[claimIndex].status = status;
    console.log(`Updated claim ${claimId} status to ${status}`);
  }
};

export const addClaim = (claim: Omit<Claim, 'id'>): void => {
  const newClaim = {
    ...claim,
    id: Math.max(...claimsData.map(c => c.id)) + 1
  };
  claimsData.push(newClaim);
  console.log('Added new claim:', newClaim);
};
