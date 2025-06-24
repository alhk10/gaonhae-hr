
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
    position: 'Senior Developer'
  },
  'EMP002': {
    id: 'EMP002',
    name: 'Mary Ng',
    nric: 'S2345678B',
    dateOfBirth: '1988-08-22',
    residencyStatus: 'Permanent Resident Year 2',
    type: 'Full-Time',
    baseSalary: 7200,
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
    position: 'Marketing Manager'
  },
  'EMP003': {
    id: 'EMP003',
    name: 'David Lim',
    nric: 'S3456789C',
    dateOfBirth: '1992-03-10',
    residencyStatus: 'Singapore Citizen',
    type: 'Full-Time',
    baseSalary: 3800,
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
    position: 'Operations Assistant'
  },
  'CAS001': {
    id: 'CAS001',
    name: 'Alice Wong',
    nric: 'S4567890D',
    dateOfBirth: '1995-03-10',
    residencyStatus: 'Singapore Citizen',
    type: 'Casual',
    hourlyRate: 25,
    allowances: [
      { id: 1, name: 'Performance Bonus', amount: 100, type: 'Fixed' }
    ],
    deductions: [],
    bankAccount: '4567-890123',
    bankName: 'UOB Bank',
    department: 'Teaching',
    position: 'Casual Teacher'
  },
  'CAS002': {
    id: 'CAS002',
    name: 'Bob Chen',
    nric: 'S5678901E',
    dateOfBirth: '1992-11-25',
    residencyStatus: 'Permanent Resident Year 1',
    type: 'Casual',
    hourlyRate: 22,
    allowances: [
      { id: 1, name: 'Performance Bonus', amount: 80, type: 'Fixed' }
    ],
    deductions: [],
    bankAccount: '5678-901234',
    bankName: 'DBS Bank',
    department: 'Teaching',
    position: 'Casual Teacher'
  },
  'CAS003': {
    id: 'CAS003',
    name: 'Sarah Lee',
    nric: 'S6789012F',
    dateOfBirth: '1993-07-18',
    residencyStatus: 'Singapore Citizen',
    type: 'Casual',
    hourlyRate: 28,
    allowances: [
      { id: 1, name: 'Performance Bonus', amount: 60, type: 'Fixed' }
    ],
    deductions: [],
    bankAccount: '6789-012345',
    bankName: 'OCBC Bank',
    department: 'Teaching',
    position: 'Casual Teacher'
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
