import type { EmployeeProfile, AdminAccessPermissions } from '@/types/employee';

const mockEmployees: EmployeeProfile[] = [
  {
    id: 'EMP001',
    name: 'John Doe',
    nric: 'S1234567A',
    dateOfBirth: '1990-05-15',
    residencyStatus: 'Citizen',
    type: 'Full-Time',
    baseSalary: 4500,
    paymentType: 'Monthly',
    bankName: 'DBS Bank',
    bankAccount: '123-456789-0',
    branch: 'Orchard Branch',
    position: 'Senior Developer',
    phone: '+65 9123 4567',
    address: '123 Marina Bay, Singapore 018956',
    email: 'john.doe@company.com',
    joinDate: '2022-01-15',
    allowances: [
      { id: '1', name: 'Transport Allowance', amount: 200, type: 'Fixed' },
      { id: '2', name: 'Phone Allowance', amount: 100, type: 'Fixed' }
    ],
    deductions: [
      { id: '1', name: 'Medical Insurance', amount: 50, type: 'Fixed' }
    ],
    certificates: [],
    adminAccess: {
      employees: true,
      payroll: true,
      leaveManagement: true,
      claims: true,
      attendance: true,
      slotBooking: true
    }
  },
  {
    id: 'EMP002',
    name: 'Jane Smith',
    nric: 'S2345678B',
    dateOfBirth: '1985-08-22',
    residencyStatus: 'PR',
    type: 'Full-Time',
    baseSalary: 5500,
    paymentType: 'Monthly',
    bankName: 'OCBC Bank',
    bankAccount: '234-567890-1',
    branch: 'Raffles Place Branch',
    position: 'Project Manager',
    phone: '+65 9234 5678',
    address: '456 Sentosa Cove, Singapore 098234',
    email: 'jane.smith@company.com',
    joinDate: '2021-03-10',
    allowances: [
      { id: '3', name: 'Car Allowance', amount: 800, type: 'Fixed' },
      { id: '4', name: 'Meal Allowance', amount: 300, type: 'Fixed' }
    ],
    deductions: [],
    certificates: [],
    adminAccess: {
      employees: false,
      payroll: false,
      leaveManagement: true,
      claims: true,
      attendance: false,
      slotBooking: false
    }
  },
  {
    id: 'EMP003',
    name: 'Michael Chen',
    nric: 'S3456789C',
    dateOfBirth: '1992-12-03',
    residencyStatus: 'Citizen',
    type: 'Full-Time',
    baseSalary: 3800,
    paymentType: 'Monthly',
    bankName: 'UOB Bank',
    bankAccount: '345-678901-2',
    branch: 'Tanjong Pagar Branch',
    position: 'Junior Developer',
    phone: '+65 9345 6789',
    address: '789 Jurong East, Singapore 609734',
    email: 'michael.chen@company.com',
    joinDate: '2023-06-01',
    allowances: [
      { id: '5', name: 'Transport Allowance', amount: 150, type: 'Fixed' }
    ],
    deductions: [
      { id: '2', name: 'Medical Insurance', amount: 50, type: 'Fixed' }
    ],
    certificates: [],
    adminAccess: {
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: true,
      attendance: false,
      slotBooking: false
    }
  },
  {
    id: 'CAS001',
    name: 'Sarah Wilson',
    nric: 'S4567890D',
    dateOfBirth: '1995-04-18',
    residencyStatus: 'Citizen',
    type: 'Casual',
    hourlyRate: 25,
    paymentType: 'Hourly',
    bankName: 'DBS Bank',
    bankAccount: '456-789012-3',
    branch: 'Tampines Branch',
    position: 'Part-time Designer',
    phone: '+65 9456 7890',
    address: '321 Tampines Street 32, Singapore 529323',
    email: 'sarah.wilson@company.com',
    joinDate: '2023-09-15',
    allowances: [],
    deductions: [],
    certificates: [],
    adminAccess: {
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: false,
      attendance: false,
      slotBooking: false
    }
  },
  {
    id: 'CAS002',
    name: 'David Lee',
    nric: 'S5678901E',
    dateOfBirth: '1988-11-25',
    residencyStatus: 'PR',
    type: 'Casual',
    hourlyRate: 30,
    paymentType: 'Hourly',
    bankName: 'OCBC Bank',
    bankAccount: '567-890123-4',
    branch: 'Woodlands Branch',
    position: 'Freelance Consultant',
    phone: '+65 9567 8901',
    address: '654 Woodlands Drive 62, Singapore 730654',
    email: 'david.lee@company.com',
    joinDate: '2023-11-01',
    allowances: [],
    deductions: [],
    certificates: [],
    adminAccess: {
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: false,
      attendance: false,
      slotBooking: false
    }
  },
  {
    id: 'CAS003',
    name: 'Emily Taylor',
    nric: 'S6789012F',
    dateOfBirth: '1993-07-09',
    residencyStatus: 'Citizen',
    type: 'Casual',
    hourlyRate: 22,
    paymentType: 'Hourly',
    bankName: 'UOB Bank',
    bankAccount: '678-901234-5',
    branch: 'Clementi Branch',
    position: 'Part-time Writer',
    phone: '+65 9678 9012',
    address: '987 Clementi West Street 1, Singapore 120987',
    email: 'emily.taylor@company.com',
    joinDate: '2024-01-15',
    allowances: [],
    deductions: [],
    certificates: [],
    adminAccess: {
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: false,
      attendance: false,
      slotBooking: false
    }
  },
  {
    id: 'EMP004',
    name: 'Kim Ha-sung',
    nric: 'S7890123G',
    dateOfBirth: '1987-02-14',
    residencyStatus: 'Citizen',
    type: 'Full-Time',
    baseSalary: 6200,
    paymentType: 'Monthly',
    bankName: 'DBS Bank',
    bankAccount: '789-012345-6',
    branch: 'Marina Bay Branch',
    position: 'Team Lead',
    phone: '+65 9789 0123',
    address: '159 Marina Boulevard, Singapore 018971',
    email: 'kim.hasung@company.com',
    joinDate: '2020-08-01',
    allowances: [
      { id: '6', name: 'Leadership Allowance', amount: 500, type: 'Fixed' },
      { id: '7', name: 'Transport Allowance', amount: 250, type: 'Fixed' }
    ],
    deductions: [
      { id: '3', name: 'Medical Insurance', amount: 75, type: 'Fixed' }
    ],
    certificates: [],
    adminAccess: {
      employees: true,
      payroll: true,
      leaveManagement: true,
      claims: true,
      attendance: true,
      slotBooking: true
    }
  }
];

export const getEmployees = (): EmployeeProfile[] => {
  return mockEmployees;
};

export const getEmployeeById = (id: string): EmployeeProfile | undefined => {
  return mockEmployees.find(employee => employee.id === id);
};

export const systemAllowances = [
  { id: '101', name: 'Transport Allowance', amount: 100 },
  { id: '102', name: 'Meal Allowance', amount: 50 },
  { id: '103', name: 'Overtime Allowance', amount: 200 },
];

export const systemDeductions = [
  { id: '201', name: 'CPF Contribution', amount: 20 },
  { id: '202', name: 'Income Tax', amount: 150 },
  { id: '203', name: 'Medical Insurance', amount: 80 },
];
