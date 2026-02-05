
export interface AdminAccessPermissions {
  employees: boolean;
  payroll: boolean;
  leaveManagement: boolean;
  claims: boolean;
  attendance: boolean;
  slotBooking: boolean;
  reports: boolean;
}

export interface EmployeePageAccessPermissions {
  profile: boolean;
  applyLeave: boolean;
  submitClaim: boolean;
  payslips: boolean;
  myAttendance: boolean;
  slotBookingEmployee: boolean;
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
  type: 'Fixed' | 'Percentage' | 'Manual' | 'Adhoc';
}

export interface EmployeeDeduction {
  id: string;
  name: string;
  amount: number;
  type: 'Fixed' | 'Percentage' | 'Manual' | 'Adhoc';
}

export interface AllowanceDeduction {
  id: string;
  name: string;
  amount: number;
  type: 'Fixed' | 'Percentage' | 'Manual' | 'Adhoc';
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
  paymentType: 'Monthly' | 'Hourly' | 'Daily';
  allowances: EmployeeAllowance[];
  deductions: EmployeeDeduction[];
  hoursWorked?: number;
  daysWorked?: number;
  grossPay: number;
  cpfEmployee: number;
  cpfEmployer: number;
  netPay: number;
  // Legacy properties for backward compatibility
  cpf: number;
  total: number;
}

export interface CasualEmployeePayroll extends PayrollEmployee {
  hoursWorked: number;
  daysWorked: number;
  totalPay: number;
  employeeCPF: number;
  employerCPF: number;
  slotBookingPay?: number;
  slotBookingMetadata?: {
    totalSlots: number;
    hasBookings: boolean;
  };
}

export interface EmployeeQualifications {
  danFirst?: boolean;
  danSecond?: boolean;
  danThird?: boolean;
  danFourthAbove?: boolean;
  stfPoomsaeCoachLevel1?: boolean;
  stfPoomsaeCoachLevel2?: boolean;
  stfPoomsaeCoachLevel3?: boolean;
  sgCoachLevel1?: boolean;
  sgCoachLevel2?: boolean;
  sgCoachLevel3?: boolean;
  stfCoachInduction?: boolean;
  stfPoomsaeReferee?: boolean;
  stfKyorugiReferee?: boolean;
  kukkiwonMastersClass3?: boolean;
  kukkiwonMastersClass2?: boolean;
  kukkiwonMastersClass1?: boolean;
  kukkiwonPoomDanExaminerClass3?: boolean;
  kukkiwonPoomDanExaminerClass2?: boolean;
  kukkiwonPoomDanExaminerClass1?: boolean;
  wtKyorugiCoachLevel1?: boolean;
  wtKyorugiCoachLevel2?: boolean;
  wtPoomsaeCoach?: boolean;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  nric: string;
  dateOfBirth: string;
  residencyStatus: string;
  type: 'Full-Time' | 'Casual';
  baseSalary?: number;
  hourlyRate?: number;
  paymentType: 'Monthly' | 'Hourly' | 'Daily';
  bankName: string;
  bankAccount: string;
  branch: string;
  department?: string;
  position: string;
  phone: string;
  address: string;
  email?: string | null; // Updated to match database schema - can be null/undefined
  joinDate?: string;
  resignDate?: string;
  profilePhoto?: string;
  allowances: EmployeeAllowance[];
  deductions: EmployeeDeduction[];
  certificates: EmployeeCertificate[];
  adminAccess: AdminAccessPermissions;
  pageAccess: EmployeePageAccessPermissions;
  qualifications?: EmployeeQualifications;
}

export interface InvoiceAccessPermission {
  branch_id: string;
  branch_name?: string;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}
