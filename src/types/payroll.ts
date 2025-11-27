import { EmployeeProfile, EmployeeAllowance, EmployeeDeduction } from './employee';

export interface FullTimeEmployee {
  id: string;
  name: string;
  employeeId: string;
  baseSalary: number;
  allowances: number;
  cpfContribution: number;
  netPay: number;
  grossPay: number;
  cpfEmployee: number;
  cpfEmployer: number;
  paymentType?: 'Monthly' | 'Hourly' | 'Daily';
  claims?: number;
  allowancesArray?: EmployeeAllowance[];
  deductions?: EmployeeDeduction[];
}

export interface CasualEmployee {
  id: string;
  name: string;
  employeeId: string;
  hourlyRate: number;
  hoursWorked: number;
  totalPay: number;
  employeeCPF: number;
  claims?: number;
  employerCPF: number;
  grossPay: number;
  daysWorked?: number;
  paymentType?: string;
  dailyRate?: number;
  dailyWeekdayRate?: number;
  dailyWeekendRate?: number;
  baseSalary?: number;
  allowances?: any[];
  deductions?: any[];
  cpfEmployee?: number;
  cpfEmployer?: number;
  netPay?: number;
  cpf?: number;
  total?: number;
  slotBookingPay?: number;
  slotBookingMetadata?: {
    totalSlots: number;
    hasBookings: boolean;
    breakdown?: Array<{
      date: string;
      branchName: string;
      pay: number;
    }>;
    calculationMethod?: 'dynamic_pricing' | 'legacy_rates';
  };
  warnings?: string[];
}

export interface PayrollState {
  fullTimeEmployees: FullTimeEmployee[];
  casualEmployees: CasualEmployee[];
  currentPeriod: string;
  status: 'draft' | 'processing' | 'approved' | 'paid' | 'completed';
  lastUpdated: Date;
  isLoading: boolean;
  availableEmployees: EmployeeProfile[];
  totalAmount: number;
  encashmentData: any[];
}
