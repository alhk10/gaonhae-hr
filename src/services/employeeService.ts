import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile, AdminAccessPermissions } from '@/types/employee';

export const getEmployees = async (): Promise<EmployeeProfile[]> => {
  console.log('EmployeeService: Fetching employees from Supabase...');
  
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
    console.error('EmployeeService: Error fetching employees:', error);
    throw error;
  }

  console.log('EmployeeService: Fetched employees count:', employees?.length || 0);
  console.log('EmployeeService: Employee emails found:', employees?.map(emp => emp.email).filter(Boolean) || []);

  return employees?.map(emp => ({
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
    joinDate: emp.created_at ? new Date(emp.created_at).toISOString().split('T')[0] : undefined,
    resignDate: emp.resign_date || undefined,
    allowances: emp.allowances?.map(a => ({
      id: String(a.id),
      name: a.name,
      amount: Number(a.amount),
      type: (a.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    deductions: emp.deductions?.map(d => ({
      id: String(d.id),
      name: d.name,
      amount: Number(d.amount),
      type: (d.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    certificates: emp.certificates?.map(cert => ({
      id: cert.id,
      name: cert.name,
      fileName: cert.file_name,
      uploadDate: cert.upload_date,
      fileSize: cert.file_size,
      fileType: cert.file_type
    })) || [],
    adminAccess: emp.admin_access?.length > 0 ? {
      employees: emp.admin_access[0]?.employees || false,
      payroll: emp.admin_access[0]?.payroll || false,
      leaveManagement: emp.admin_access[0]?.leave_management || false,
      claims: emp.admin_access[0]?.claims || false,
      attendance: emp.admin_access[0]?.attendance || false,
      slotBooking: emp.admin_access[0]?.slot_booking || false,
      reports: emp.admin_access[0]?.reports || false
    } : {
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: false,
      attendance: false,
      slotBooking: false,
      reports: false
    }
  })) || [];
};

export const getCasualEmployees = async (): Promise<EmployeeProfile[]> => {
  console.log('EmployeeService: Fetching casual employees from Supabase...');
  
  const { data: employees, error } = await supabase
    .from('employees')
    .select(`
      *,
      allowances (*),
      deductions (*),
      admin_access (*),
      certificates (*)
    `)
    .eq('type', 'Casual');

  if (error) {
    console.error('EmployeeService: Error fetching casual employees:', error);
    throw error;
  }

  console.log('EmployeeService: Fetched casual employees:', employees);

  return employees?.map(emp => ({
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
    joinDate: emp.created_at ? new Date(emp.created_at).toISOString().split('T')[0] : undefined,
    resignDate: emp.resign_date || undefined,
    allowances: emp.allowances?.map(a => ({
      id: String(a.id),
      name: a.name,
      amount: Number(a.amount),
      type: (a.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    deductions: emp.deductions?.map(d => ({
      id: String(d.id),
      name: d.name,
      amount: Number(d.amount),
      type: (d.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    certificates: emp.certificates?.map(cert => ({
      id: cert.id,
      name: cert.name,
      fileName: cert.file_name,
      uploadDate: cert.upload_date,
      fileSize: cert.file_size,
      fileType: cert.file_type
    })) || [],
    adminAccess: emp.admin_access?.length > 0 ? {
      employees: emp.admin_access[0]?.employees || false,
      payroll: emp.admin_access[0]?.payroll || false,
      leaveManagement: emp.admin_access[0]?.leave_management || false,
      claims: emp.admin_access[0]?.claims || false,
      attendance: emp.admin_access[0]?.attendance || false,
      slotBooking: emp.admin_access[0]?.slot_booking || false,
      reports: emp.admin_access[0]?.reports || false
    } : {
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: false,
      attendance: false,
      slotBooking: false,
      reports: false
    }
  })) || [];
};

export const getEmployeeById = async (id: string): Promise<EmployeeProfile | null> => {
  console.log('EmployeeService: Fetching employee by ID from Supabase:', id);
  
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
    console.error('EmployeeService: Error fetching employee by ID:', error);
    return null;
  }

  if (!employee) {
    console.log('EmployeeService: No employee found with ID:', id);
    return null;
  }

  console.log('EmployeeService: Found employee:', employee.name, employee.email);

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
    joinDate: employee.created_at ? new Date(employee.created_at).toISOString().split('T')[0] : undefined,
    resignDate: employee.resign_date || undefined,
    allowances: employee.allowances?.map(a => ({
      id: String(a.id),
      name: a.name,
      amount: Number(a.amount),
      type: (a.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    deductions: employee.deductions?.map(d => ({
      id: String(d.id),
      name: d.name,
      amount: Number(d.amount),
      type: (d.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    certificates: employee.certificates?.map(cert => ({
      id: cert.id,
      name: cert.name,
      fileName: cert.file_name,
      uploadDate: cert.upload_date,
      fileSize: cert.file_size,
      fileType: cert.file_type
    })) || [],
    adminAccess: employee.admin_access?.length > 0 ? {
      employees: employee.admin_access[0]?.employees || false,
      payroll: employee.admin_access[0]?.payroll || false,
      leaveManagement: employee.admin_access[0]?.leave_management || false,
      claims: employee.admin_access[0]?.claims || false,
      attendance: employee.admin_access[0]?.attendance || false,
      slotBooking: employee.admin_access[0]?.slot_booking || false,
      reports: employee.admin_access[0]?.reports || false
    } : {
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: false,
      attendance: false,
      slotBooking: false,
      reports: false
    }
  };
};

export const createEmployee = async (employeeData: any) => {
  console.log('EmployeeService: Creating employee in Supabase:', employeeData);
  
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
    console.error('EmployeeService: Error creating employee:', error);
    throw error;
  }

  return employee;
};

export const addEmployee = async (employeeData: any) => {
  console.log('EmployeeService: Adding employee (alias for createEmployee):', employeeData);
  return await createEmployee(employeeData);
};

export const updateEmployee = async (id: string, employeeData: any) => {
  console.log('EmployeeService: Updating employee in Supabase:', id, employeeData);
  
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
    console.error('EmployeeService: Error updating employee:', error);
    throw error;
  }

  return employee;
};

export const deleteEmployee = async (id: string) => {
  console.log('EmployeeService: Deleting employee from Supabase:', id);
  
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('EmployeeService: Error deleting employee:', error);
    throw error;
  }
};

export const updateEmployeeResignDate = async (id: string, resignDate: string) => {
  console.log('EmployeeService: Updating employee resign date in Supabase:', id, resignDate);
  
  const { error } = await supabase
    .from('employees')
    .update({ resign_date: resignDate })
    .eq('id', id);

  if (error) {
    console.error('EmployeeService: Error updating resign date:', error);
    throw error;
  }
};

export const updateEmployeeAdminAccess = async (employeeId: string, adminAccess: AdminAccessPermissions) => {
  console.log('EmployeeService: Updating employee admin access in Supabase:', employeeId, adminAccess);
  
  // First, check if admin access record exists
  const { data: existingAccess, error: fetchError } = await supabase
    .from('admin_access')
    .select('*')
    .eq('employee_id', employeeId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
    console.error('EmployeeService: Error fetching admin access:', fetchError);
    throw fetchError;
  }

  const accessData = {
    employee_id: employeeId,
    employees: adminAccess.employees,
    payroll: adminAccess.payroll,
    leave_management: adminAccess.leaveManagement,
    claims: adminAccess.claims,
    attendance: adminAccess.attendance,
    slot_booking: adminAccess.slotBooking,
    reports: adminAccess.reports
  };

  if (existingAccess) {
    // Update existing record
    const { error } = await supabase
      .from('admin_access')
      .update(accessData)
      .eq('employee_id', employeeId);

    if (error) {
      console.error('EmployeeService: Error updating admin access:', error);
      throw error;
    }
  } else {
    // Create new record
    const { error } = await supabase
      .from('admin_access')
      .insert([accessData]);

    if (error) {
      console.error('EmployeeService: Error creating admin access:', error);
      throw error;
    }
  }

  console.log('EmployeeService: Admin access updated successfully');
};
