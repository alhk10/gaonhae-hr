
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  managerId?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; needsVerification?: boolean }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  updatePassword: (newPassword: string) => Promise<boolean>;
  userrole: 'employee' | 'admin' | 'superadmin' | null;
  userDetails: any;
  adminAccess: any;
  pageAccess: any;
}
