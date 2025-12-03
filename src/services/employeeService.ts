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
    logger.error('EmployeeService: Error in getEmployees:', error);
    throw error;
  }
};

export const getEmployeesForPayroll = async (): Promise<EmployeeProfile[]> => {
  logger.debug('Fetching employees with full payroll data');
  
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
      logger.error('Error fetching employees for payroll:', error);
      throw error;
    }

    if (!employees || employees.length === 0) {
      logger.warn('No employees found for payroll');
      return [];
    }

    logger.debug(`Full payroll employees fetched: ${employees.length}`);

    // Fetch page access data separately since there's no foreign key relationship
    const employeeIds = employees.map(emp => emp.id);
    const { data: pageAccessData, error: pageAccessError } = await supabase
      .from('employee_page_access')
      .select('*')
      .in('employee_id', employeeIds);

    if (pageAccessError) {
      logger.error('Error fetching page access:', pageAccessError);
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
    logger.error('Error in getEmployeesForPayroll:', error);
    throw error;
  }
};

export const getCasualEmployees = async (): Promise<EmployeeProfile[]> => {
  logger.debug('Fetching casual employees');
  
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
    logger.error('Error fetching casual employees:', error);
    throw error;
  }

  logger.debug(`Fetched ${employees?.length || 0} casual employees`);

  const employeeIds = employees?.map(emp => emp.id) || [];
  const { data: pageAccessData, error: pageAccessError } = await supabase
    .from('employee_page_access')
    .select('*')
    .in('employee_id', employeeIds);

  if (pageAccessError) {
    logger.error('Error fetching page access:', pageAccessError);
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
          slotBooking: emp.admin_access[0]?.slotBooking || emp.admin_access[0]?.slot_booking || false,
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
  }) || [];
};

export const getEmployeeById = async (id: string): Promise<EmployeeProfile | null> => {
  logger.debug('Fetching employee by ID', { id });
  
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
    logger.error('Error fetching employee by ID:', error);
    throw error;
  }

  if (!employee) {
    logger.warn('No employee found with ID', { id });
    return null;
  }

  logger.debug('Found employee', { name: employee.name, email: employee.email || 'No email' });

  const { data: pageAccess, error: pageAccessError } = await supabase
    .from('employee_page_access')
    .select('*')
    .eq('employee_id', id)
    .maybeSingle();

  if (pageAccessError) {
    logger.error('Error fetching page access:', pageAccessError);
  }

  return {
    id: employee.id,
    name: employee.name,
    display_name: employee.display_name || '',
    nric: employee.nric || '',
    dateOfBirth: employee.date_of_birth,
    residencyStatus: employee.residency_status,
    type: employee.type as 'Full-Time' | 'Casual',
    baseSalary: employee.base_salary || undefined,
    hourlyRate: employee.hourly_rate || undefined,
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
      slotBooking: employee.admin_access[0]?.slotBooking || employee.admin_access[0]?.slot_booking || false,
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
};

export const createEmployee = async (employeeData: any) => {
  logger.info('Starting employee creation process');
  logger.debug('Employee data received', { name: employeeData.name, email: employeeData.email });
  
  try {
    const requiredFields = ['name', 'email', 'nric', 'dateOfBirth', 'type', 'residencyStatus', 'bankName', 'bankAccount'];
    const missingFields = requiredFields.filter(field => !employeeData[field]);
    
    if (missingFields.length > 0) {
      const error = `Missing required fields: ${missingFields.join(', ')}`;
      logger.error('Validation error:', error);
      throw new Error(error);
    }

    const employeeId = `EMP${Date.now()}`;
    logger.debug('Generated employee ID', { employeeId });
    
    const insertData = {
      id: employeeId,
      name: employeeData.name,
      nric: employeeData.nric,
      date_of_birth: employeeData.dateOfBirth,
      residency_status: employeeData.residencyStatus,
      type: employeeData.type,
      base_salary: employeeData.baseSalary,
      hourly_rate: employeeData.hourlyRate,
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

    logger.debug('Prepared data for insertion');
    logger.debug('Starting database insertion');
    
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
      logger.error('Database insertion error:', employee.error);
      throw new Error(`Database error: ${employee.error.message}`);
    }

    if (!employee.data) {
      logger.error('No data returned from insertion');
      throw new Error('No employee data returned from database');
    }

    logger.info('Employee inserted successfully', { id: employee.data.id });

    // Create Supabase Auth user with timeout
    if (employeeData.email) {
      logger.debug('Creating Supabase Auth user');
      try {
        const authPromise = createSingleSupabaseAuthUser(employeeData.email, employeeData.name);
        const authTimeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            logger.warn('Auth user creation timeout, continuing');
            resolve(false);
          }, 30000); // Shorter timeout for auth creation
        });

        const authCreated = await Promise.race([authPromise, authTimeoutPromise]);
        
        if (authCreated) {
          logger.info('Supabase Auth user created successfully');
        } else {
          logger.warn('Auth user creation timed out or failed');
        }
      } catch (authError) {
        logger.error('Error creating Supabase Auth user:', authError);
        // Don't fail the employee creation if auth creation fails
      }
    }

    logger.info('Employee creation process completed successfully');
    return employee.data;
    
  } catch (error) {
    logger.error('Critical error in createEmployee:', error);
    
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
  logger.debug('Adding employee (alias for createEmployee)');
  return await createEmployee(employeeData);
};

export const updateEmployee = async (id: string, employeeData: any) => {
  logger.debug('Updating employee', { id });
  
  const updateData = {
    name: employeeData.name,
    display_name: employeeData.display_name || employeeData.displayName || null,
    nric: employeeData.nric,
    date_of_birth: employeeData.dateOfBirth,
    residency_status: employeeData.residencyStatus,
    type: employeeData.type,
    base_salary: employeeData.baseSalary !== null && employeeData.baseSalary !== undefined ? Number(employeeData.baseSalary) : null,
    hourly_rate: employeeData.hourlyRate !== null && employeeData.hourlyRate !== undefined ? Number(employeeData.hourlyRate) : null,
    payment_type: employeeData.paymentType,
    bank_name: employeeData.bankName,
    bank_account: employeeData.bankAccount,
    department: employeeData.branch || employeeData.department,
    position: employeeData.position,
    phone: employeeData.phone,
    address: employeeData.address,
    email: employeeData.email,
    join_date: employeeData.joinDate || null,
    resign_date: employeeData.resignDate || null,
    qualifications: employeeData.qualifications || {}
  };

  logger.debug('Processed update data for Supabase');

  const { data: employee, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating employee:', error);
    throw error;
  }

  logger.info('Employee updated successfully', { id });
  return employee;
};

export const deleteEmployee = async (id: string) => {
  logger.debug('Soft deleting employee (setting resign date)', { id });
  
  const { error } = await supabase
    .from('employees')
    .update({ resign_date: new Date().toISOString().split('T')[0] })
    .eq('id', id);

  if (error) {
    logger.error('Error soft deleting employee:', error);
    throw error;
  }

  logger.info('Employee soft deleted successfully (resign date set)', { id });
};

export const updateEmployeeResignDate = async (id: string, resignDate: string) => {
  logger.debug('Updating employee resign date', { id, resignDate });
  
  const { error } = await supabase
    .from('employees')
    .update({ resign_date: resignDate || null })
    .eq('id', id);

  if (error) {
    logger.error('Error updating resign date:', error);
    throw error;
  }
};

export const updateEmployeeAdminAccess = async (employeeId: string, adminAccess: AdminAccessPermissions) => {
  logger.debug('Updating employee admin access', { employeeId });
  
  const { data: existingAccess, error: fetchError } = await supabase
    .from('admin_access')
    .select('*')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (fetchError) {
    logger.error('Error fetching admin access:', fetchError);
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
    slot_booking: adminAccess.slotBooking,
    reports: adminAccess.reports
  };

  if (existingAccess) {
    const { error } = await supabase
      .from('admin_access')
      .update(accessData)
      .eq('employee_id', employeeId);

    if (error) {
      logger.error('Error updating admin access:', error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('admin_access')
      .insert([accessData]);

    if (error) {
      logger.error('Error creating admin access:', error);
      throw error;
    }
  }

  logger.info('Admin access updated successfully');
};

export const updateEmployeePageAccess = async (employeeId: string, pageAccess: EmployeePageAccessPermissions) => {
  logger.debug('Updating employee page access', { employeeId });
  
  const { data: existingAccess, error: fetchError } = await supabase
    .from('employee_page_access')
    .select('*')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (fetchError) {
    logger.error('Error fetching page access:', fetchError);
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
      logger.error('Error updating page access:', error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('employee_page_access')
      .insert([accessData]);

    if (error) {
      logger.error('Error creating page access:', error);
      throw error;
    }
  }

  logger.info('Page access updated successfully');
};
