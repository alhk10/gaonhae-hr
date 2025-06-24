import { EmployeeProfile } from '@/types/employee';

export const employeeDatabase: { [key: string]: EmployeeProfile } = {
  'EMP001': {
    id: 'EMP001',
    name: 'John Tan',
    nric: 'S1234567A',
    dateOfBirth: '1990-05-15',
    residencyStatus: 'Singapore Citizen',
    type: 'Full-Time',
    baseSalary: 8500,
    paymentType: 'Monthly',
    allowances: [
      { id: 1, name: 'Transport Allowance', amount: 200, type: 'Fixed' },
      { id: 2, name: 'Meal Allowance', amount: 150, type: 'Fixed' }
    ],
    deductions: [
      { id: 1, name: 'Insurance', amount: 100, type: 'Fixed' }
    ],
    bankAccount: '1234-567890',
    bankName: 'DBS Bank',
    department: 'Engineering',
    position: 'Senior Developer',
    phone: '+65 9123 4567',
    address: '123 Orchard Road, #12-34, Singapore 238858',
    email: 'john.tan@company.sg',
    certificates: [],
    adminAccess: {
      employees: true,
      attendance: true,
      reports: true
    }
  },
  'EMP002': {
    id: 'EMP002',
    name: 'Mary Ng',
    nric: 'S2345678B',
    dateOfBirth: '1988-08-22',
    residencyStatus: 'Permanent Resident Year 2',
    type: 'Full-Time',
    baseSalary: 7200,
    paymentType: 'Monthly',
    allowances: [
      { id: 1, name: 'Transport Allowance', amount: 200, type: 'Fixed' },
      { id: 2, name: 'Meal Allowance', amount: 150, type: 'Fixed' }
    ],
    deductions: [
      { id: 1, name: 'Insurance', amount: 50, type: 'Fixed' }
    ],
    bankAccount: '2345-678901',
    bankName: 'OCBC Bank',
    department: 'Marketing',
    position: 'Marketing Manager',
    phone: '+65 9234 5678',
    address: '456 Marina Bay, #08-21, Singapore 018956',
    email: 'mary.ng@company.sg',
    certificates: [],
    adminAccess: {
      leaveManagement: true,
      claims: true,
      reports: true
    }
  },
  'EMP003': {
    id: 'EMP003',
    name: 'David Lim',
    nric: 'S3456789C',
    dateOfBirth: '1992-03-10',
    residencyStatus: 'Singapore Citizen',
    type: 'Full-Time',
    baseSalary: 3800,
    paymentType: 'Monthly',
    allowances: [
      { id: 1, name: 'Transport Allowance', amount: 200, type: 'Fixed' },
      { id: 2, name: 'Meal Allowance', amount: 150, type: 'Fixed' }
    ],
    deductions: [
      { id: 1, name: 'Insurance', amount: 100, type: 'Fixed' }
    ],
    bankAccount: '3456-789012',
    bankName: 'UOB Bank',
    department: 'Operations',
    position: 'Operations Assistant',
    phone: '+65 9345 6789',
    address: '789 Jurong East, #15-67, Singapore 609729',
    email: 'david.lim@company.sg',
    certificates: []
  },
  'CAS001': {
    id: 'CAS001',
    name: 'Alice Wong',
    nric: 'S4567890D',
    dateOfBirth: '1995-03-10',
    residencyStatus: 'Singapore Citizen',
    type: 'Casual',
    hourlyRate: 25,
    paymentType: 'Hourly',
    allowances: [
      { id: 1, name: 'Performance Bonus', amount: 100, type: 'Fixed' }
    ],
    deductions: [],
    bankAccount: '4567-890123',
    bankName: 'UOB Bank',
    department: 'Teaching',
    position: 'Casual Teacher',
    phone: '+65 9456 7890',
    address: '321 Tampines, #22-11, Singapore 529543',
    email: 'alice.wong@company.sg',
    certificates: []
  },
  'CAS002': {
    id: 'CAS002',
    name: 'Bob Chen',
    nric: 'S5678901E',
    dateOfBirth: '1992-11-25',
    residencyStatus: 'Permanent Resident Year 1',
    type: 'Casual',
    dailyRate: 180,
    paymentType: 'Daily',
    allowances: [
      { id: 1, name: 'Performance Bonus', amount: 80, type: 'Fixed' }
    ],
    deductions: [],
    bankAccount: '5678-901234',
    bankName: 'DBS Bank',
    department: 'Teaching',
    position: 'Casual Teacher',
    phone: '+65 9567 8901',
    address: '654 Woodlands, #05-43, Singapore 730654',
    email: 'bob.chen@company.sg',
    certificates: []
  },
  'CAS003': {
    id: 'CAS003',
    name: 'Sarah Lee',
    nric: 'S6789012F',
    dateOfBirth: '1993-07-18',
    residencyStatus: 'Singapore Citizen',
    type: 'Casual',
    hourlyRate: 28,
    paymentType: 'Hourly',
    allowances: [
      { id: 1, name: 'Performance Bonus', amount: 60, type: 'Fixed' }
    ],
    deductions: [],
    bankAccount: '6789-012345',
    bankName: 'OCBC Bank',
    department: 'Teaching',
    position: 'Casual Teacher',
    phone: '+65 9678 9012',
    address: '987 Yishun, #18-29, Singapore 760987',
    email: 'sarah.lee@company.sg',
    certificates: []
  }
};

export const getAllEmployees = (): EmployeeProfile[] => {
  return Object.values(employeeDatabase);
};

export const getEmployeeById = (id: string): EmployeeProfile | undefined => {
  return employeeDatabase[id];
};

export const getFullTimeEmployees = (): EmployeeProfile[] => {
  return getAllEmployees().filter(emp => emp.type === 'Full-Time');
};

export const getCasualEmployees = (): EmployeeProfile[] => {
  return getAllEmployees().filter(emp => emp.type === 'Casual');
};

// System allowances and deductions for consistency
export const systemAllowances = [
  { id: 1, name: 'Transport Allowance', type: 'Monthly', amount: 200 },
  { id: 2, name: 'Meal Allowance', type: 'Monthly', amount: 150 },
  { id: 3, name: 'Performance Bonus', type: 'One-time', amount: 100 },
  { id: 4, name: 'Overtime Allowance', type: 'Variable', amount: 50 },
  { id: 5, name: 'Phone Allowance', type: 'Monthly', amount: 80 }
];

export const systemDeductions = [
  { id: 1, name: 'Insurance Premium', type: 'Monthly', amount: 100 },
  { id: 2, name: 'Union Fees', type: 'Monthly', amount: 25 },
  { id: 3, name: 'Parking Fee', type: 'Monthly', amount: 60 },
  { id: 4, name: 'Medical Insurance', type: 'Monthly', amount: 75 }
];
