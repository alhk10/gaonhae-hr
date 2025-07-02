import { supabase } from '@/integrations/supabase/client';
import type { EmployeeProfile, AdminAccessPermissions, EmployeePageAccessPermissions } from '@/types/employee';

export const getEmployees = async (): Promise<EmployeeProfile[]> => {
  try {
    console.log('Fetching active employees from Supabase...');
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        *,
        allowances(*),
        deductions(*),
        admin_access(*),
        employee_page_access(*),
        certificates(*)
      `)
      .is('resign_date', null) // Only get active employees
      .order('name');

    if (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }

    console.log('Raw employee data from Supabase:', employees);
    const transformedEmployees = employees?.map(transformEmployeeData) || [];
    console.log('Transformed employees:', transformedEmployees);
    
    return transformedEmployees;
  } catch (error) {
    console.error('Error in getEmployees:', error);
    throw error;
  }
};

export const getAllEmployees = async (): Promise<EmployeeProfile[]> => {
  try {
    console.log('Fetching all employees from Supabase...');
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        *,
        allowances(*),
        deductions(*),
        admin_access(*),
        employee_page_access(*),
        certificates(*)
      `)
      .order('name');

    if (error) {
      console.error('Error fetching all employees:', error);
      throw error;
    }

    console.log('All employees fetched:', employees?.length || 0);
    return employees?.map(transformEmployeeData) || [];
  } catch (error) {
    console.error('Error in getAllEmployees:', error);
    throw error;
  }
};

export const getCasualEmployees = async (): Promise<EmployeeProfile[]> => {
  try {
    console.log('Fetching casual employees from Supabase...');
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        *,
        allowances(*),
        deductions(*),
        admin_access(*),
        employee_page_access(*),
        certificates(*)
      `)
      .eq('type', 'Casual')
      .is('resign_date', null) // Only get active casual employees
      .order('name');

    if (error) {
      console.error('Error fetching casual employees:', error);
      throw error;
    }

    console.log('Casual employees fetched:', employees?.length || 0);
    return employees?.map(transformEmployeeData) || [];
  } catch (error) {
    console.error('Error in getCasualEmployees:', error);
    throw error;
  }
};

export const getFullTimeEmployees = async (): Promise<EmployeeProfile[]> => {
  try {
    console.log('Fetching full-time employees from Supabase...');
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        *,
        allowances(*),
        deductions(*),
        admin_access(*),
        employee_page_access(*),
        certificates(*)
      `)
      .eq('type', 'Full-Time')
      .is('resign_date', null) // Only get active full-time employees
      .order('name');

    if (error) {
      console.error('Error fetching full-time employees:', error);
      throw error;
    }

    console.log('Full-time employees fetched:', employees?.length || 0);
    return employees?.map(transformEmployeeData) || [];
  } catch (error) {
    console.error('Error in getFullTimeEmployees:', error);
    throw error;
  }
};

export const getActiveEmployeeCount = async (): Promise<number> => {
  try {
    console.log('Fetching active employee count...');
    const { count, error } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .is('resign_date', null);

    if (error) {
      console.error('Error getting active employee count:', error);
      throw error;
    }

    console.log('Active employee count:', count || 0);
    return count || 0;
  } catch (error) {
    console.error('Error in getActiveEmployeeCount:', error);
    return 0;
  }
};

const transformEmployeeData = (employeeData: any): EmployeeProfile => {
  console.log('Transforming employee data:', employeeData);
  
  return {
    id: employeeData.id,
    name: employeeData.name,
    email: employeeData.email,
    phone: employeeData.phone,
    nric: employeeData.nric,
    dateOfBirth: employeeData.date_of_birth,
    address: employeeData.address,
    position: employeeData.position,
    department: employeeData.department,
    branch: employeeData.department || 'Main Office', // Use department as branch or default
    type: employeeData.type,
    residencyStatus: employeeData.residency_status,
    baseSalary: employeeData.base_salary,
    hourlyRate: employeeData.hourly_rate,
    dailyRate: employeeData.daily_rate,
    dailyWeekdayRate: employeeData.daily_weekday_rate,
    dailyWeekendRate: employeeData.daily_weekend_rate,
    paymentType: employeeData.payment_type,
    bankName: employeeData.bank_name,
    bankAccount: employeeData.bank_account,
    joinDate: employeeData.join_date,
    resignDate: employeeData.resign_date,
    allowances: employeeData.allowances?.map((a: any) => ({
      id: a.id.toString(),
      name: a.name,
      amount: Number(a.amount),
      type: a.type || 'Fixed'
    })) || [],
    deductions: employeeData.deductions?.map((d: any) => ({
      id: d.id.toString(),
      name: d.name,
      amount: Number(d.amount),
      type: d.type || 'Fixed'
    })) || [],
    certificates: employeeData.certificates?.map((c: any) => ({
      id: c.id,
      name: c.name,
      fileName: c.file_name,
      fileType: c.file_type,
      fileSize: c.file_size,
      uploadDate: c.upload_date
    })) || [],
    adminAccess: {
      employees: employeeData.admin_access?.[0]?.employees || false,
      payroll: employeeData.admin_access?.[0]?.payroll || false,
      leaveManagement: employeeData.admin_access?.[0]?.leave_management || false,
      claims: employeeData.admin_access?.[0]?.claims || false,
      attendance: employeeData.admin_access?.[0]?.attendance || false,
      slotBooking: employeeData.admin_access?.[0]?.slot_booking || false,
      reports: employeeData.admin_access?.[0]?.reports || false
    },
    pageAccess: {
      profile: employeeData.employee_page_access?.[0]?.profile !== false,
      applyLeave: employeeData.employee_page_access?.[0]?.apply_leave !== false,
      submitClaim: employeeData.employee_page_access?.[0]?.submit_claim !== false,
      payslips: employeeData.employee_page_access?.[0]?.payslips !== false,
      myAttendance: employeeData.employee_page_access?.[0]?.my_attendance !== false,
      slotBookingEmployee: employeeData.employee_page_access?.[0]?.slot_booking_employee !== false
    }
  };
};

export const getEmployeeById = async (id: string): Promise<EmployeeProfile | null> => {
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        *,
        allowances(*),
        deductions(*),
        admin_access(*),
        employee_page_access(*),
        certificates(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching employee by ID:', error);
      return null;
    }

    return employee ? transformEmployeeData(employee) : null;
  } catch (error) {
    console.error('Error in getEmployeeById:', error);
    return null;
  }
};

export const createEmployee = async (employeeData: Partial<EmployeeProfile>): Promise<EmployeeProfile | null> => {
  try {
    const employeeId = `EMP${Date.now()}`;
    
    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        id: employeeId,
        name: employeeData.name,
        email: employeeData.email,
        phone: employeeData.phone,
        nric: employeeData.nric,
        date_of_birth: employeeData.dateOfBirth,
        address: employeeData.address,
        position: employeeData.position,
        department: employeeData.department,
        type: employeeData.type,
        residency_status: employeeData.residencyStatus,
        base_salary: employeeData.baseSalary,
        hourly_rate: employeeData.hourlyRate,
        daily_rate: employeeData.dailyRate,
        daily_weekday_rate: employeeData.dailyWeekdayRate,
        daily_weekend_rate: employeeData.dailyWeekendRate,
        payment_type: employeeData.paymentType,
        bank_name: employeeData.bankName,
        bank_account: employeeData.bankAccount,
        join_date: employeeData.joinDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      throw error;
    }

    return employee ? transformEmployeeData(employee) : null;
  } catch (error) {
    console.error('Error in createEmployee:', error);
    throw error;
  }
};

export const updateEmployee = async (id: string, employeeData: Partial<EmployeeProfile>): Promise<EmployeeProfile | null> => {
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .update({
        name: employeeData.name,
        email: employeeData.email,
        phone: employeeData.phone,
        nric: employeeData.nric,
        date_of_birth: employeeData.dateOfBirth,
        address: employeeData.address,
        position: employeeData.position,
        department: employeeData.department,
        type: employeeData.type,
        residency_status: employeeData.residencyStatus,
        base_salary: employeeData.baseSalary,
        hourly_rate: employeeData.hourlyRate,
        daily_rate: employeeData.dailyRate,
        daily_weekday_rate: employeeData.dailyWeekdayRate,
        daily_weekend_rate: employeeData.dailyWeekendRate,
        payment_type: employeeData.paymentType,
        bank_name: employeeData.bankName,
        bank_account: employeeData.bankAccount,
        join_date: employeeData.joinDate,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      throw error;
    }

    return employee ? transformEmployeeData(employee) : null;
  } catch (error) {
    console.error('Error in updateEmployee:', error);
    throw error;
  }
};

export const updateEmployeeAdminAccess = async (employeeId: string, adminAccess: AdminAccessPermissions): Promise<void> => {
  try {
    const { error: deleteError } = await supabase
      .from('admin_access')
      .delete()
      .eq('employee_id', employeeId);

    if (deleteError) {
      console.error('Error deleting existing admin access:', deleteError);
    }

    const { error: insertError } = await supabase
      .from('admin_access')
      .insert({
        employee_id: employeeId,
        employees: adminAccess.employees,
        payroll: adminAccess.payroll,
        leave_management: adminAccess.leaveManagement,
        claims: adminAccess.claims,
        attendance: adminAccess.attendance,
        slot_booking: adminAccess.slotBooking,
        reports: adminAccess.reports
      });

    if (insertError) {
      console.error('Error inserting admin access:', insertError);
      throw insertError;
    }
  } catch (error) {
    console.error('Error in updateEmployeeAdminAccess:', error);
    throw error;
  }
};

export const updateEmployeePageAccess = async (employeeId: string, pageAccess: EmployeePageAccessPermissions): Promise<void> => {
  try {
    const { error: deleteError } = await supabase
      .from('employee_page_access')
      .delete()
      .eq('employee_id', employeeId);

    if (deleteError) {
      console.error('Error deleting existing page access:', deleteError);
    }

    const { error: insertError } = await supabase
      .from('employee_page_access')
      .insert({
        employee_id: employeeId,
        profile: pageAccess.profile,
        apply_leave: pageAccess.applyLeave,
        submit_claim: pageAccess.submitClaim,
        payslips: pageAccess.payslips,
        my_attendance: pageAccess.myAttendance,
        slot_booking_employee: pageAccess.slotBookingEmployee
      });

    if (insertError) {
      console.error('Error inserting page access:', insertError);
      throw insertError;
    }
  } catch (error) {
    console.error('Error in updateEmployeePageAccess:', error);
    throw error;
  }
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('employees')
      .update({ resign_date: new Date().toISOString().split('T')[0] })
      .eq('id', employeeId);

    if (error) {
      console.error('Error setting resign date for employee:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteEmployee:', error);
    throw error;
  }
};
