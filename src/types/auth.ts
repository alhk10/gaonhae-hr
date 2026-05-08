export type UserType = 'employee' | 'student';

// Basic student info for multi-student switching
export interface LinkedStudent {
  id: string;
  name: string;
  email: string;
  studentNumber?: string;
  currentBelt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'superadmin' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  studentId?: string;
  managerId?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; needsVerification?: boolean }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  userrole: 'employee' | 'admin' | 'superadmin' | null;
  userType: UserType | null;
  userDetails: any;
  adminAccess: any;
  pageAccess: any;
  // Multi-student support
  linkedStudents: LinkedStudent[];
  selectedStudentId: string | null;
  setSelectedStudent: (studentId: string) => void;
}
