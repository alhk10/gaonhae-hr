
import { supabase } from "@/integrations/supabase/client";
import { EmployeeProfile, AllowanceDeduction, AdminAccessPermissions, CertificateUpload } from "@/types/employee";

export const getEmployees = async (): Promise<EmployeeProfile[]> => {
  console.log('Fetching employees from Supabase...');
  
  const { data: employees, error } = await supabase
    .from('employees')
    .select(`
      *,
      allowances:allowances(*),
      deductions:deductions(*),
      admin_access:admin_access(*),
      certificates:certificates(*)
    `);

  if (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }

  console.log('Fetched employees:', employees);

  return employees.map(emp => ({
    id: emp.id,
    name: emp.name,
    nric: emp.nric,
    dateOfBirth: emp.date_of_birth,
    residencyStatus: emp.residency_status,
    type: emp.type as 'Full-Time' | 'Casual',
    baseSalary: emp.base_salary,
    hourlyRate: emp.hourly_rate,
    dailyRate: emp.daily_rate,
    paymentType: emp.payment_type as 'Monthly' | 'Hourly' | 'Daily',
    allowances: emp.allowances?.map((a: any) => ({
      id: a.id,
      name: a.name,
      amount: a.amount,
      type: a.type as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    deductions: emp.deductions?.map((d: any) => ({
      id: d.id,
      name: d.name,
      amount: d.amount,
      type: d.type as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    bankAccount: emp.bank_account,
    bankName: emp.bank_name,
    department: emp.department,
    position: emp.position,
    phone: emp.phone,
    address: emp.address,
    email: emp.email,
    certificates: emp.certificates?.map((c: any) => ({
      id: c.id,
      name: c.name,
      fileName: c.file_name,
      uploadDate: c.upload_date,
      fileSize: c.file_size,
      fileType: c.file_type
    })) || [],
    adminAccess: emp.admin_access?.[0] ? {
      employees: emp.admin_access[0].employees,
      payroll: emp.admin_access[0].payroll,
      leaveManagement: emp.admin_access[0].leave_management,
      claims: emp.admin_access[0].claims,
      attendance: emp.admin_access[0].attendance,
      slotBooking: emp.admin_access[0].slot_booking,
      reports: emp.admin_access[0].reports
    } : undefined
  }));
};

export const getEmployeeById = async (id: string): Promise<EmployeeProfile | null> => {
  console.log('Fetching employee by ID:', id);
  
  const { data: employee, error } = await supabase
    .from('employees')
    .select(`
      *,
      allowances:allowances(*),
      deductions:deductions(*),
      admin_access:admin_access(*),
      certificates:certificates(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching employee:', error);
    return null;
  }

  if (!employee) return null;

  return {
    id: employee.id,
    name: employee.name,
    nric: employee.nric,
    dateOfBirth: employee.date_of_birth,
    residencyStatus: employee.residency_status,
    type: employee.type as 'Full-Time' | 'Casual',
    baseSalary: employee.base_salary,
    hourlyRate: employee.hourly_rate,
    dailyRate: employee.daily_rate,
    paymentType: employee.payment_type as 'Monthly' | 'Hourly' | 'Daily',
    allowances: employee.allowances?.map((a: any) => ({
      id: a.id,
      name: a.name,
      amount: a.amount,
      type: a.type as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    deductions: employee.deductions?.map((d: any) => ({
      id: d.id,
      name: d.name,
      amount: d.amount,
      type: d.type as 'Fixed' | 'Percentage' | 'Manual'
    })) || [],
    bankAccount: employee.bank_account,
    bankName: employee.bank_name,
    department: employee.department,
    position: employee.position,
    phone: employee.phone,
    address: employee.address,
    email: employee.email,
    certificates: employee.certificates?.map((c: any) => ({
      id: c.id,
      name: c.name,
      fileName: c.file_name,
      uploadDate: c.upload_date,
      fileSize: c.file_size,
      fileType: c.file_type
    })) || [],
    adminAccess: employee.admin_access?.[0] ? {
      employees: employee.admin_access[0].employees,
      payroll: employee.admin_access[0].payroll,
      leaveManagement: employee.admin_access[0].leave_management,
      claims: employee.admin_access[0].claims,
      attendance: employee.admin_access[0].attendance,
      slotBooking: employee.admin_access[0].slot_booking,
      reports: employee.admin_access[0].reports
    } : undefined
  };
};

export const createEmployee = async (employee: Omit<EmployeeProfile, 'id' | 'allowances' | 'deductions' | 'certificates' | 'adminAccess'>) => {
  console.log('Creating new employee:', employee);
  
  const { data, error } = await supabase
    .from('employees')
    .insert({
      id: `EMP${Date.now()}`, // Generate a unique ID
      name: employee.name,
      nric: employee.nric,
      date_of_birth: employee.dateOfBirth,
      residency_status: employee.residencyStatus,
      type: employee.type,
      base_salary: employee.baseSalary,
      hourly_rate: employee.hourlyRate,
      daily_rate: employee.dailyRate,
      payment_type: employee.paymentType,
      bank_account: employee.bankAccount,
      bank_name: employee.bankName,
      department: employee.department,
      position: employee.position,
      phone: employee.phone,
      address: employee.address,
      email: employee.email
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    throw error;
  }

  return data;
};
