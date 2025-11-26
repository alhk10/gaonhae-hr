import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile, AdminAccessPermissions, EmployeePageAccessPermissions } from '@/types/employee';
import { createSingleSupabaseAuthUser } from './bulkUserCreationService';
import { logger } from '@/utils/logger';

export const getEmployees = async (): Promise<EmployeeProfile[]> => {
  logger.debug('Fetching employees list');
  
  try {
    // Optimized query - fetch essential fields plus admin access for list view
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id, name, nric, type, email, join_date, resign_date, position, department,
        admin_access (*)
      `)
      .order('name')
      .limit(100);

    if (error) {
      logger.error('Error fetching employees:', error);
      throw error;
    }

    if (!employees || employees.length === 0) {
      logger.warn('No employees found in database');
      return [];
    }

    logger.debug(`Fetched ${employees.length} employees`);

    // Fetch page access data separately for the employee IDs
    const employeeIds = employees.map(emp => emp.id);
    const { data: pageAccessData, error: pageAccessError } = await supabase
      .from('employee_page_access')
      .select('*')
      .in('employee_id', employeeIds);

    if (pageAccessError) {
      logger.error('Error fetching page access:', pageAccessError);
    }

    // Return minimal data for list view - load details on demand
    return employees.map((emp: any) => {
      const pageAccess = pageAccessData?.find(pa => pa.employee_id === emp.id);
      
      return {
        id: emp.id,
        name: emp.name,
        nric: emp.nric || '',
        dateOfBirth: '', // Load on demand
        residencyStatus: '', // Load on demand
        type: emp.type as 'Full-Time' | 'Casual',
        baseSalary: 0, // Load on demand
        hourlyRate: 0, // Load on demand
        dailyRate: 0, // Load on demand
        dailyWeekdayRate: 0, // Load on demand
        dailyWeekendRate: 0, // Load on demand
        paymentType: 'Monthly' as 'Monthly' | 'Hourly' | 'Daily', // Load on demand
        bankName: '', // Load on demand
        bankAccount: '', // Load on demand
        branch: '', // Load on demand
        department: emp.department || '',
        position: emp.position || '',
        phone: '', // Load on demand
        address: '', // Load on demand
        email: emp.email || null,
        joinDate: emp.join_date || undefined,
        resignDate: emp.resign_date || undefined,
        allowances: [], // Load on demand
        deductions: [], // Load on demand
        certificates: [], // Load on demand
        adminAccess: emp.admin_access ? {
          employees: emp.admin_access.employees || false,
          payroll: emp.admin_access.payroll || false,
          leaveManagement: emp.admin_access.leave_management || false,
          claims: emp.admin_access.claims || false,
          attendance: emp.admin_access.attendance || false,
          slotBooking: emp.admin_access.slotBooking || emp.admin_access.slot_booking || false,
          reports: emp.admin_access.reports || false
        } : {
          employees: false,
          payroll: false,
          leaveManagement: false,
          claims: false,
          attendance: false,
          slotBooking: false,
          reports: false
        },
        pageAccess: pageAccess ? {
          profile: pageAccess.profile ?? true,
          applyLeave: pageAccess.apply_leave ?? true,
          submitClaim: pageAccess.submit_claim ?? true,
          payslips: pageAccess.payslips ?? true,
          myAttendance: pageAccess.my_attendance ?? true,
          slotBookingEmployee: pageAccess.slot_booking_employee ?? true
        } : {
          profile: true,
          applyLeave: true,
          submitClaim: true,
          payslips: true,
          myAttendance: true,
          slotBookingEmployee: true
        }
      };
    });
  } catch (error) {
    console.error('EmployeeService: Error in getEmployees:', error);
    throw error;
  }
};

export const getEmployeesForPayroll = async (): Promise<EmployeeProfile[]> => {
  console.log('EmployeeService: Fetching employees with full payroll data...');
  
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        *,
        allowances (*),
        deductions (*),
        admin_access (*),
        certificates (*)
      `)
      .order('name')
      .limit(200);

    if (error) {
      console.error('EmployeeService: Error fetching employees for payroll:', error);
      throw error;
    }

    if (!employees || employees.length === 0) {
      console.log('EmployeeService: No employees found for payroll');
      return [];
    }

    console.log('EmployeeService: Full payroll employees fetched:', employees.length);

    // Fetch page access data separately since there's no foreign key relationship
    const employeeIds = employees.map(emp => emp.id);
    const { data: pageAccessData, error: pageAccessError } = await supabase
      .from('employee_page_access')
      .select('*')
      .in('employee_id', employeeIds);

    if (pageAccessError) {
      console.error('EmployeeService: Error fetching page access:', pageAccessError);
    }

    return employees.map((emp: any) => {
      const pageAccess = pageAccessData?.find(pa => pa.employee_id === emp.id);
      
      return {
        id: emp.id,
        name: emp.name,
        nric: emp.nric || '',
        dateOfBirth: emp.date_of_birth || '',
        residencyStatus: emp.residency_status || '',
        type: emp.type as 'Full-Time' | 'Casual',
        baseSalary: emp.base_salary || 0,
        hourlyRate: emp.hourly_rate || 0,
        dailyRate: emp.daily_rate || 0,
        dailyWeekdayRate: emp.daily_weekday_rate || 0,
        dailyWeekendRate: emp.daily_weekend_rate || 0,
        paymentType: emp.payment_type as 'Monthly' | 'Hourly' | 'Daily' || 'Monthly',
        bankName: emp.bank_name || '',
        bankAccount: emp.bank_account || '',
        branch: '', // This field doesn't exist in DB
        department: emp.department || '',
        position: emp.position || '',
        phone: emp.phone || '',
        address: emp.address || '',
        email: emp.email || null,
        joinDate: emp.join_date || undefined,
        resignDate: emp.resign_date || undefined,
        allowances: (emp.allowances || []).map((allowance: any) => ({
          id: allowance.id.toString(),
          name: allowance.name,
          amount: allowance.amount,
          type: allowance.type
        })),
        deductions: (emp.deductions || []).map((deduction: any) => ({
          id: deduction.id.toString(),
          name: deduction.name,
          amount: deduction.amount,
          type: deduction.type
        })),
        certificates: (emp.certificates || []).map((cert: any) => ({
          id: cert.id,
          name: cert.name,
          fileName: cert.file_name,
          uploadDate: cert.upload_date,
          fileSize: cert.file_size,
          fileType: cert.file_type
        })),
        qualifications: (emp.qualifications as any) || {},
        adminAccess: emp.admin_access ? {
          employees: emp.admin_access.employees || false,
          payroll: emp.admin_access.payroll || false,
          leaveManagement: emp.admin_access.leave_management || false,
          claims: emp.admin_access.claims || false,
          attendance: emp.admin_access.attendance || false,
          slotBooking: emp.admin_access.slotBooking || false,
          reports: emp.admin_access.reports || false
        } : {
          employees: false,
          payroll: false,
          leaveManagement: false,
          claims: false,
          attendance: false,
          slotBooking: false,
          reports: false
        },
        pageAccess: pageAccess ? {
          profile: pageAccess.profile ?? true,
          applyLeave: pageAccess.apply_leave ?? true,
          submitClaim: pageAccess.submit_claim ?? true,
          payslips: pageAccess.payslips ?? true,
          myAttendance: pageAccess.my_attendance ?? true,
          slotBookingEmployee: pageAccess.slot_booking_employee ?? true
        } : {
          profile: true,
          applyLeave: true,
          submitClaim: true,
          payslips: true,
          myAttendance: true,
          slotBookingEmployee: true
        }
      };
    });
  } catch (error) {
    console.error('EmployeeService: Error in getEmployeesForPayroll:', error);
    throw error;
  }
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
    .eq('type', 'Casual')
    .is('resign_date', null);

  if (error) {
    console.error('EmployeeService: Error fetching casual employees:', error);
    throw error;
  }

  console.log('EmployeeService: Fetched casual employees:', employees);

  const employeeIds = employees?.map(emp => emp.id) || [];
  const { data: pageAccessData, error: pageAccessError } = await supabase
    .from('employee_page_access')
    .select('*')
    .in('employee_id', employeeIds);

  if (pageAccessError) {
    console.error('EmployeeService: Error fetching page access:', pageAccessError);
  }

  return employees?.map(emp => {
    const pageAccess = pageAccessData?.find(pa => pa.employee_id === emp.id);
    
    return {
      id: emp.id,
      name: emp.name,
      nric: emp.nric || '',
      dateOfBirth: emp.date_of_birth,
      residencyStatus: emp.residency_status,
      type: emp.type as 'Full-Time' | 'Casual',
      baseSalary: emp.base_salary || undefined,
      hourlyRate: emp.hourly_rate || undefined,
      dailyRate: emp.daily_rate || undefined,
      dailyWeekdayRate: emp.daily_weekday_rate || undefined,
      dailyWeekendRate: emp.daily_weekend_rate || undefined,
      paymentType: emp.payment_type as 'Monthly' | 'Hourly' | 'Daily',
      bankName: emp.bank_name || '',
      bankAccount: emp.bank_account || '',
      branch: emp.department || 'Main Office',
      department: emp.department || '',
      position: emp.position || '',
      phone: emp.phone || '',
      address: emp.address || '',
      email: emp.email || null, // Handle nullable email
      joinDate: emp.join_date || (emp.created_at ? new Date(emp.created_at).toISOString().split('T')[0] : undefined),
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
      qualifications: (emp.qualifications as any) || {},
      adminAccess: emp.admin_access?.length > 0 ? {
        employees: emp.admin_access[0]?.employees || false,
        payroll: emp.admin_access[0]?.payroll || false,
        leaveManagement: emp.admin_access[0]?.leave_management || false,
        claims: emp.admin_access[0]?.claims || false,
        attendance: emp.admin_access[0]?.attendance || false,
        slotBooking: emp.admin_access[0]?.slotBooking || false,
        reports: emp.admin_access[0]?.reports || false
      } : {
        employees: false,
        payroll: false,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: false,
        reports: false
      },
      pageAccess: pageAccess ? {
        profile: pageAccess.profile || false,
        applyLeave: pageAccess.apply_leave || false,
        submitClaim: pageAccess.submit_claim || false,
        payslips: pageAccess.payslips || false,
        myAttendance: pageAccess.my_attendance || false,
        slotBookingEmployee: pageAccess.slot_booking_employee || false
      } : {
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
      }
    };
  }) || [];
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
    .maybeSingle();

  if (error) {
    console.error('EmployeeService: Error fetching employee by ID:', error);
    throw error;
  }

  if (!employee) {
    console.log('EmployeeService: No employee found with ID:', id);
    return null;
  }

  console.log('EmployeeService: Found employee:', employee.name, employee.email || 'No email');

  const { data: pageAccess, error: pageAccessError } = await supabase
    .from('employee_page_access')
    .select('*')
    .eq('employee_id', id)
    .maybeSingle();

  if (pageAccessError) {
    console.error('EmployeeService: Error fetching page access:', pageAccessError);
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
    dailyWeekdayRate: employee.daily_weekday_rate || undefined,
    dailyWeekendRate: employee.daily_weekend_rate || undefined,
    paymentType: employee.payment_type as 'Monthly' | 'Hourly' | 'Daily',
    bankName: employee.bank_name || '',
    bankAccount: employee.bank_account || '',
    branch: employee.department || 'Main Office',
    department: employee.department || '',
    position: employee.position || '',
    phone: employee.phone || '',
    address: employee.address || '',
    email: employee.email || null, // Handle nullable email
    joinDate: employee.join_date || (employee.created_at ? new Date(employee.created_at).toISOString().split('T')[0] : undefined),
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
      slotBooking: employee.admin_access[0]?.slotBooking || false,
      reports: employee.admin_access[0]?.reports || false
    } : {
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: false,
      attendance: false,
      slotBooking: false,
      reports: false
    },
    qualifications: (employee.qualifications as any) || {},
    pageAccess: pageAccess ? {
      profile: pageAccess.profile || false,
      applyLeave: pageAccess.apply_leave || false,
      submitClaim: pageAccess.submit_claim || false,
      payslips: pageAccess.payslips || false,
      myAttendance: pageAccess.my_attendance || false,
      slotBookingEmployee: pageAccess.slot_booking_employee || false
    } : {
      profile: true,
      applyLeave: true,
      submitClaim: true,
      payslips: true,
      myAttendance: true,
      slotBookingEmployee: true
    }
  };
};

export const createEmployee = async (employeeData: any) => {
  console.log('EmployeeService: Starting employee creation process...');
  console.log('EmployeeService: Employee data received:', employeeData);
  
  try {
    const requiredFields = ['name', 'email', 'nric', 'dateOfBirth', 'type', 'residencyStatus', 'bankName', 'bankAccount'];
    const missingFields = requiredFields.filter(field => !employeeData[field]);
    
    if (missingFields.length > 0) {
      const error = `Missing required fields: ${missingFields.join(', ')}`;
      console.error('EmployeeService: Validation error:', error);
      throw new Error(error);
    }

    const employeeId = `EMP${Date.now()}`;
    console.log('EmployeeService: Generated employee ID:', employeeId);
    
    const insertData = {
      id: employeeId,
      name: employeeData.name,
      nric: employeeData.nric,
      date_of_birth: employeeData.dateOfBirth,
      residency_status: employeeData.residencyStatus,
      type: employeeData.type,
      base_salary: employeeData.baseSalary,
      hourly_rate: employeeData.hourlyRate,
      daily_rate: employeeData.dailyRate,
      daily_weekday_rate: employeeData.dailyWeekdayRate,
      daily_weekend_rate: employeeData.dailyWeekendRate,
      payment_type: employeeData.paymentType || 'Monthly',
      bank_name: employeeData.bankName,
      bank_account: employeeData.bankAccount,
      department: employeeData.branch || employeeData.department || '',
      position: employeeData.position || '',
      phone: employeeData.phone || '',
      address: employeeData.address || '',
      email: employeeData.email,
      join_date: employeeData.joinDate || null
    };

    console.log('EmployeeService: Prepared data for insertion:', insertData);
    console.log('EmployeeService: Starting database insertion...');
    
    // Add timeout to the database operation
    const insertPromise = supabase
      .from('employees')
      .insert([insertData])
      .select()
      .single();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database insertion timeout after 180 seconds'));
      }, 180000);
    });

    const employee = await Promise.race([insertPromise, timeoutPromise]) as any;

    if (employee.error) {
      console.error('EmployeeService: Database insertion error:', employee.error);
      throw new Error(`Database error: ${employee.error.message}`);
    }

    if (!employee.data) {
      console.error('EmployeeService: No data returned from insertion');
      throw new Error('No employee data returned from database');
    }

    console.log('EmployeeService: Employee inserted successfully:', employee.data);

    // Create Supabase Auth user with timeout
    if (employeeData.email) {
      console.log('EmployeeService: Creating Supabase Auth user...');
      try {
        const authPromise = createSingleSupabaseAuthUser(employeeData.email, employeeData.name);
        const authTimeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.warn('EmployeeService: Auth user creation timeout, continuing...');
            resolve(false);
          }, 30000); // Shorter timeout for auth creation
        });

        const authCreated = await Promise.race([authPromise, authTimeoutPromise]);
        
        if (authCreated) {
          console.log('EmployeeService: Supabase Auth user created successfully');
        } else {
          console.warn('EmployeeService: Auth user creation timed out or failed');
        }
      } catch (authError) {
        console.error('EmployeeService: Error creating Supabase Auth user:', authError);
        // Don't fail the employee creation if auth creation fails
      }
    }

    console.log('EmployeeService: Employee creation process completed successfully');
    return employee.data;
    
  } catch (error) {
    console.error('EmployeeService: Critical error in createEmployee:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Connection timeout - please check your internet connection and try again');
      } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
        throw new Error('An employee with this email or NRIC already exists');
      } else if (error.message.includes('permission') || error.message.includes('RLS')) {
        throw new Error('Permission denied - please contact your administrator');
      } else {
        throw new Error(`Failed to create employee: ${error.message}`);
      }
    } else {
      throw new Error('An unexpected error occurred while creating the employee');
    }
  }
};

export const addEmployee = async (employeeData: any) => {
  console.log('EmployeeService: Adding employee (alias for createEmployee):', employeeData);
  return await createEmployee(employeeData);
};

export const updateEmployee = async (id: string, employeeData: any) => {
  console.log('EmployeeService: Updating employee in Supabase:', id, employeeData);
  
  const updateData = {
    name: employeeData.name,
    nric: employeeData.nric,
    date_of_birth: employeeData.dateOfBirth,
    residency_status: employeeData.residencyStatus,
    type: employeeData.type,
    base_salary: employeeData.baseSalary !== null && employeeData.baseSalary !== undefined ? Number(employeeData.baseSalary) : null,
    hourly_rate: employeeData.hourlyRate !== null && employeeData.hourlyRate !== undefined ? Number(employeeData.hourlyRate) : null,
    daily_rate: employeeData.dailyRate !== null && employeeData.dailyRate !== undefined ? Number(employeeData.dailyRate) : null,
    daily_weekday_rate: employeeData.dailyWeekdayRate !== null && employeeData.dailyWeekdayRate !== undefined ? Number(employeeData.dailyWeekdayRate) : null,
    daily_weekend_rate: employeeData.dailyWeekendRate !== null && employeeData.dailyWeekendRate !== undefined ? Number(employeeData.dailyWeekendRate) : null,
    payment_type: employeeData.paymentType,
    bank_name: employeeData.bankName,
    bank_account: employeeData.bankAccount,
    department: employeeData.branch || employeeData.department,
    position: employeeData.position,
    phone: employeeData.phone,
    address: employeeData.address,
    email: employeeData.email,
    join_date: employeeData.joinDate || null,
    qualifications: employeeData.qualifications || {}
  };

  console.log('EmployeeService: Processed update data for Supabase:', updateData);

  const { data: employee, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('EmployeeService: Error updating employee:', error);
    throw error;
  }

  console.log('EmployeeService: Employee updated successfully:', employee);
  return employee;
};

export const deleteEmployee = async (id: string) => {
  console.log('EmployeeService: Soft deleting employee (setting resign date) in Supabase:', id);
  
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from('employees')
    .update({ resign_date: today })
    .eq('id', id);

  if (error) {
    console.error('EmployeeService: Error soft deleting employee:', error);
    throw error;
  }

  console.log('EmployeeService: Employee soft deleted successfully (resign date set)');
};

export const updateEmployeeResignDate = async (id: string, resignDate: string) => {
  console.log('EmployeeService: Updating employee resign date in Supabase:', id, resignDate);
  
  const { error } = await supabase
    .from('employees')
    .update({ resign_date: resignDate || null })
    .eq('id', id);

  if (error) {
    console.error('EmployeeService: Error updating resign date:', error);
    throw error;
  }
};

export const updateEmployeeAdminAccess = async (employeeId: string, adminAccess: AdminAccessPermissions) => {
  console.log('EmployeeService: Updating employee admin access in Supabase:', employeeId, adminAccess);
  
  const { data: existingAccess, error: fetchError } = await supabase
    .from('admin_access')
    .select('*')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (fetchError) {
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
    slotBooking: adminAccess.slotBooking,
    reports: adminAccess.reports
  };

  if (existingAccess) {
    const { error } = await supabase
      .from('admin_access')
      .update(accessData)
      .eq('employee_id', employeeId);

    if (error) {
      console.error('EmployeeService: Error updating admin access:', error);
      throw error;
    }
  } else {
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

export const updateEmployeePageAccess = async (employeeId: string, pageAccess: EmployeePageAccessPermissions) => {
  console.log('EmployeeService: Updating employee page access in Supabase:', employeeId, pageAccess);
  
  const { data: existingAccess, error: fetchError } = await supabase
    .from('employee_page_access')
    .select('*')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (fetchError) {
    console.error('EmployeeService: Error fetching page access:', fetchError);
    throw fetchError;
  }

  const accessData = {
    employee_id: employeeId,
    profile: pageAccess.profile,
    apply_leave: pageAccess.applyLeave,
    submit_claim: pageAccess.submitClaim,
    payslips: pageAccess.payslips,
    my_attendance: pageAccess.myAttendance,
    slot_booking_employee: pageAccess.slotBookingEmployee
  };

  if (existingAccess) {
    const { error } = await supabase
      .from('employee_page_access')
      .update(accessData)
      .eq('employee_id', employeeId);

    if (error) {
      console.error('EmployeeService: Error updating page access:', error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('employee_page_access')
      .insert([accessData]);

    if (error) {
      console.error('EmployeeService: Error creating page access:', error);
      throw error;
    }
  }

  console.log('EmployeeService: Page access updated successfully');
};
