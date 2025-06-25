
export interface AllowanceDeduction {
  id: number;
  name: string;
  amount: number;
  type?: 'Fixed' | 'Percentage' | 'Manual';
}

export interface EmployeeProfile {
  id: string;
  name: string;
  nric: string;
  dateOfBirth: string;
  residencyStatus: string;
  type: 'Full-Time' | 'Casual';
  baseSalary?: number;
  hourlyRate?: number;
  dailyRate?: number;
  paymentType?: 'Monthly' | 'Hourly' | 'Daily';
  allowances: AllowanceDeduction[];
  deductions: AllowanceDeduction[];
  bankAccount: string;
  bankName: string;
  branch?: string; // Changed from department to branch
  position?: string;
  phone?: string;
  address?: string;
  email?: string;
  resignDate?: string; // Added resign date
  certificates?: CertificateUpload[];
  adminAccess?: AdminAccessPermissions;
}

export interface AdminAccessPermissions {
  employees?: boolean;
  payroll?: boolean;
  leaveManagement?: boolean;
  claims?: boolean;
  attendance?: boolean;
  slotBooking?: boolean;
  reports?: boolean;
}

export interface CertificateUpload {
  id: string;
  name: string;
  fileName: string;
  uploadDate: string;
  fileSize: number;
  fileType: string;
}

export interface PayrollEmployee {
  id: string;
  name: string;
  type: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  cpf: number;
  total: number;
}

export interface CasualEmployeePayroll {
  id: string;
  name: string;
  type: string;
  hourlyRate: number;
  hoursWorked: number;
  daysWorked: number;
  totalPay: number;
  employeeCPF: number;
  employerCPF: number;
}
