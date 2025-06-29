
// Service for managing system settings data
export interface Branch {
  id: number;
  name: string;
  address: string;
}

// For now, we'll use localStorage to store branch data
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
