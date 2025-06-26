
export interface AdminAccessPermissions {
  employees: boolean;
  payroll: boolean;
  leaveManagement: boolean;
  claims: boolean;
  attendance: boolean;
  slotBooking: boolean;
}

export interface ExtendedAdminAccessPermissions extends AdminAccessPermissions {
  profile: boolean;
  applyLeave: boolean;
  submitClaim: boolean;
  payslips: boolean;
  myAttendance: boolean;
  slotBookingEmployee: boolean;
}

export interface EmployeeAllowance {
  id: string;
  name: string;
  amount: number;
  type: 'Fixed' | 'Percentage' | 'Manual';
}

export interface EmployeeDeduction {
  id: string;
  name: string;
  amount: number;
  type: 'Fixed' | 'Percentage' | 'Manual';
}

export interface AllowanceDeduction {
  id: string;
  name: string;
  amount: number;
  type: 'Fixed' | 'Percentage' | 'Manual';
}

export interface EmployeeCertificate {
  id: string;
  name: string;
  fileName: string;
  uploadDate: string;
  fileSize: number;
  fileType: string;
}

export interface CertificateUpload {
  id: string;
  file: File;
  name: string;
  fileName: string;
  uploadDate: string;
  fileSize: number;
  fileType: string;
}

export interface PayrollEmployee {
  id: string;
  name: string;
  type: 'Full-Time' | 'Casual';
  baseSalary?: number;
  hourlyRate?: number;
  dailyRate?: number;
  paymentType: 'Monthly' | 'Hourly' | 'Daily';
  allowances: EmployeeAllowance[];
  deductions: EmployeeDeduction[];
  hoursWorked?: number;
  daysWorked?: number;
  grossPay: number;
  cpfEmployee: number;
  cpfEmployer: number;
  netPay: number;
}

export interface CasualEmployeePayroll extends PayrollEmployee {
  hoursWorked: number;
  daysWorked: number;
  totalPay: number;
  employeeCPF: number;
  employerCPF: number;
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
  paymentType: 'Monthly' | 'Hourly' | 'Daily';
  bankName: string;
  bankAccount: string;
  branch: string;
  position: string;
  phone: string;
  address: string;
  email: string;
  joinDate?: string;
  resignDate?: string;
  profilePhoto?: string;
  allowances: EmployeeAllowance[];
  deductions: EmployeeDeduction[];
  certificates: EmployeeCertificate[];
  adminAccess: AdminAccessPermissions;
}
