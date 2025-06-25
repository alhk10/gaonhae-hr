
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/types/employee';

export const getEmployees = async (): Promise<EmployeeProfile[]> => {
  console.log('Fetching employees from Supabase...');
  
  const { data: employees, error } = await supabase
    .from('employees')
    .select(`
      *,
      allowances (*),
      deductions (*),
      admin_access (*),
      certificates (*)
    `);

  if (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }

  console.log('Fetched employees:', employees);

  return employees.map(emp => ({
    id: emp.id,
    name: emp.name,
    nric: emp.nric || '',
    dateOfBirth: emp.date_of_birth,
    residencyStatus: emp.residency_status,
    type: emp.type as 'Full-Time' | 'Casual',
    baseSalary: emp.base_salary || undefined,
    hourlyRate: emp.hourly_rate || undefined,
    dailyRate: emp.daily_rate || undefined,
    paymentType: emp.payment_type as 'Monthly' | 'Hourly' | 'Daily',
    bankName: emp.bank_name || '',
    bankAccount: emp.bank_account || '',
    branch: emp.department || '',
    position: emp.position || '',
    phone: emp.phone || '',
    address: emp.address || '',
    email: emp.email || '',
    resignDate: emp.resign_date || undefined,
    allowances: emp.allowances?.map(a => ({
      id: a.id,
      name: a.name,
      amount: Number(a.amount),
      type: a.type || 'Fixed'
    })) || [],
    deductions: emp.deductions?.map(d => ({
      id: d.id,
      name: d.name,
      amount: Number(d.amount),
      type: d.type || 'Fixed'
    })) || [],
    certificates: emp.certificates || [],
    adminAccess: emp.admin_access?.length > 0 ? {
      employees: emp.admin_access[0]?.employees || false,
      payroll: emp.admin_access[0]?.payroll || false,
      leaveManagement: emp.admin_access[0]?.leave_management || false,
      claims: emp.admin_access[0]?.claims || false,
      attendance: emp.admin_access[0]?.attendance || false,
      slotBooking: emp.admin_access[0]?.slot_booking || false,
      reports: emp.admin_access[0]?.reports || false
    } : undefined
  }));
};

export const getEmployeeById = async (id: string): Promise<EmployeeProfile | null> => {
  console.log('Fetching employee by ID from Supabase:', id);
  
  const { data: employee, error } = await supabase
    .from('employees')
    .select(`
      *,
      allowances (*),
      deductions (*),
      admin_access (*),
      certificates (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching employee by ID:', error);
    return null;
  }

  if (!employee) {
    return null;
  }

  return {
    id: employee.id,
    name: employee.name,
    nric: employee.nric || '',
    dateOfBirth: employee.date_of_birth,
    residencyStatus: employee.residency_status,
    type: employee.type as 'Full-Time' | 'Casual',
    baseSalary: employee.base_salary || undefined,
    hourlyRate: employee.hourly_rate || undefined,
    dailyRate: employee.daily_rate || undefined,
    paymentType: employee.payment_type as 'Monthly' | 'Hourly' | 'Daily',
    bankName: employee.bank_name || '',
    bankAccount: employee.bank_account || '',
    branch: employee.department || '',
    position: employee.position || '',
    phone: employee.phone || '',
    address: employee.address || '',
    email: employee.email || '',
    resignDate: employee.resign_date || undefined,
    allowances: employee.allowances?.map(a => ({
      id: a.id,
      name: a.name,
      amount: Number(a.amount),
      type: a.type || 'Fixed'
    })) || [],
    deductions: employee.deductions?.map(d => ({
      id: d.id,
      name: d.name,
      amount: Number(d.amount),
      type: d.type || 'Fixed'
    })) || [],
    certificates: employee.certificates || [],
    adminAccess: employee.admin_access?.length > 0 ? {
      employees: employee.admin_access[0]?.employees || false,
      payroll: employee.admin_access[0]?.payroll || false,
      leaveManagement: employee.admin_access[0]?.leave_management || false,
      claims: employee.admin_access[0]?.claims || false,
      attendance: employee.admin_access[0]?.attendance || false,
      slotBooking: employee.admin_access[0]?.slot_booking || false,
      reports: employee.admin_access[0]?.reports || false
    } : undefined
  };
};

export const createEmployee = async (employeeData: any) => {
  console.log('Creating employee in Supabase:', employeeData);
  
  // Generate employee ID
  const employeeId = `EMP${Date.now()}`;
  
  const { data: employee, error } = await supabase
    .from('employees')
    .insert([{
      id: employeeId,
      name: employeeData.name,
      nric: employeeData.nric || '',
      date_of_birth: employeeData.dateOfBirth,
      residency_status: employeeData.residencyStatus,
      type: employeeData.type,
      base_salary: employeeData.baseSalary,
      hourly_rate: employeeData.hourlyRate,
      daily_rate: employeeData.dailyRate,
      payment_type: employeeData.paymentType,
      bank_name: employeeData.bankName || '',
      bank_account: employeeData.bankAccount || '',
      department: employeeData.branch || '',
      position: employeeData.position || '',
      phone: employeeData.phone || '',
      address: employeeData.address || '',
      email: employeeData.email || ''
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    throw error;
  }

  return employee;
};

export const updateEmployee = async (id: string, employeeData: any) => {
  console.log('Updating employee in Supabase:', id, employeeData);
  
  const { data: employee, error } = await supabase
    .from('employees')
    .update({
      name: employeeData.name,
      nric: employeeData.nric,
      date_of_birth: employeeData.dateOfBirth,
      residency_status: employeeData.residencyStatus,
      type: employeeData.type,
      base_salary: employeeData.baseSalary,
      hourly_rate: employeeData.hourlyRate,
      daily_rate: employeeData.dailyRate,
      payment_type: employeeData.paymentType,
      bank_name: employeeData.bankName,
      bank_account: employeeData.bankAccount,
      department: employeeData.branch,
      position: employeeData.position,
      phone: employeeData.phone,
      address: employeeData.address,
      email: employeeData.email
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating employee:', error);
    throw error;
  }

  return employee;
};

export const deleteEmployee = async (id: string) => {
  console.log('Deleting employee from Supabase:', id);
  
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

export const updateEmployeeResignDate = async (id: string, resignDate: string) => {
  console.log('Updating employee resign date in Supabase:', id, resignDate);
  
  const { error } = await supabase
    .from('employees')
    .update({ resign_date: resignDate })
    .eq('id', id);

  if (error) {
    console.error('Error updating resign date:', error);
    throw error;
  }
};
