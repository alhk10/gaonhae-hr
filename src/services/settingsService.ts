
// Service for managing system settings data
export interface Branch {
  id: number;
  name: string;
  address: string;
}

export interface SystemAllowance {
  id: number;
  name: string;
  type: string;
  amount: string;
}

export interface SystemDeduction {
  id: number;
  name: string;
  type: string;
  amount: string;
}

// For now, we'll use localStorage to store settings data
// In a real app, this would be stored in the database
export const getBranches = (): Branch[] => {
  const stored = localStorage.getItem('system_branches');
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Default branches if none stored
  const defaultBranches = [
    { id: 1, name: 'Headquarters', address: '123 Business District, #12-34, Singapore 068123' },
    { id: 2, name: 'Balmoral', address: '456 Balmoral Road, #05-67, Singapore 259856' },
    { id: 3, name: 'Jurong West', address: '789 Jurong West Central, #08-90, Singapore 640789' },
    { id: 4, name: 'Kembangan', address: '321 Kembangan Road, #03-45, Singapore 419642' },
    { id: 5, name: 'Yishun', address: '654 Yishun Ring Road, #07-12, Singapore 760654' },
    { id: 6, name: 'Bukit Merah', address: '987 Bukit Merah Central, #04-56, Singapore 150987' },
  ];
  
  localStorage.setItem('system_branches', JSON.stringify(defaultBranches));
  return defaultBranches;
};

export const saveBranches = (branches: Branch[]) => {
  localStorage.setItem('system_branches', JSON.stringify(branches));
};

export const getSystemAllowances = (): SystemAllowance[] => {
  const stored = localStorage.getItem('system_allowances');
  if (stored) {
    return JSON.parse(stored);
  }
  
  const defaultAllowances = [
    { id: 1, name: 'Transport Allowance', type: 'Fixed', amount: '200' },
    { id: 2, name: 'Meal Allowance', type: 'Fixed', amount: '150' },
    { id: 3, name: 'Performance Bonus', type: 'Percentage', amount: '10' },
    { id: 4, name: 'Phone Allowance', type: 'Fixed', amount: '50' },
    { id: 5, name: 'Overtime Allowance', type: 'Hourly', amount: '25' },
    { id: 6, name: 'Travel Allowance', type: 'Fixed', amount: '300' },
  ];
  
  localStorage.setItem('system_allowances', JSON.stringify(defaultAllowances));
  return defaultAllowances;
};

export const saveSystemAllowances = (allowances: SystemAllowance[]) => {
  localStorage.setItem('system_allowances', JSON.stringify(allowances));
};

export const getSystemDeductions = (): SystemDeduction[] => {
  const stored = localStorage.getItem('system_deductions');
  if (stored) {
    return JSON.parse(stored);
  }
  
  const defaultDeductions = [
    { id: 1, name: 'Insurance Premium', type: 'Fixed', amount: '100' },
    { id: 2, name: 'Union Dues', type: 'Percentage', amount: '2' },
    { id: 3, name: 'Medical Insurance', type: 'Fixed', amount: '80' },
    { id: 4, name: 'Parking Fee', type: 'Fixed', amount: '30' },
    { id: 5, name: 'Late Penalty', type: 'Fixed', amount: '50' },
  ];
  
  localStorage.setItem('system_deductions', JSON.stringify(defaultDeductions));
  return defaultDeductions;
};

export const saveSystemDeductions = (deductions: SystemDeduction[]) => {
  localStorage.setItem('system_deductions', JSON.stringify(deductions));
};
