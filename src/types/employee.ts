
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
  allowances: AllowanceDeduction[];
  deductions: AllowanceDeduction[];
  bankAccount: string;
  bankName: string;
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  email?: string;
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
