
import { supabase } from '@/integrations/supabase/client';

const sampleEmployees = [
  {
    id: 'EMP001',
    name: 'John Doe',
    nric: 'S1234567A',
    date_of_birth: '1990-05-15',
    residency_status: 'Citizen',
    type: 'Full-Time',
    base_salary: 4500,
    payment_type: 'Monthly',
    bank_name: 'DBS Bank',
    bank_account: '123-456789-0',
    department: 'IT Department',
    position: 'Senior Developer',
    phone: '+65 9123 4567',
    address: '123 Marina Bay, Singapore 018956',
    email: 'john.doe@company.com',
    join_date: '2022-01-15'
  },
  {
    id: 'EMP002',
    name: 'Jane Smith',
    nric: 'S2345678B',
    date_of_birth: '1985-08-22',
    residency_status: 'PR',
    type: 'Full-Time',
    base_salary: 5500,
    payment_type: 'Monthly',
    bank_name: 'OCBC Bank',
    bank_account: '234-567890-1',
    department: 'HR Department',
    position: 'Project Manager',
    phone: '+65 9234 5678',
    address: '456 Sentosa Cove, Singapore 098234',
    email: 'jane.smith@company.com',
    join_date: '2021-03-10'
  },
  {
    id: 'CAS001',
    name: 'Lim Zi Han',
    nric: 'S4567890D',
    date_of_birth: '1995-04-18',
    residency_status: 'Citizen',
    type: 'Casual',
    hourly_rate: 25,
    payment_type: 'Hourly',
    bank_name: 'DBS Bank',
    bank_account: '456-789012-3',
    department: 'Design Department',
    position: 'Part-time Designer',
    phone: '+65 9456 7890',
    address: '321 Tampines Street 32, Singapore 529323',
    email: 'lim.zihan@company.com',
    join_date: '2023-09-15'
  },
  {
    id: 'CAS002',
    name: 'Aw Yi Zhe Eldon',
    nric: 'S5678901E',
    date_of_birth: '1988-11-25',
    residency_status: 'PR',
    type: 'Casual',
    hourly_rate: 30,
    payment_type: 'Hourly',
    bank_name: 'OCBC Bank',
    bank_account: '567-890123-4',
    department: 'Consulting Department',
    position: 'Freelance Consultant',
    phone: '+65 9567 8901',
    address: '654 Woodlands Drive 62, Singapore 730654',
    email: 'aw.yizhe@company.com',
    join_date: '2023-11-01'
  }
];

export const seedEmployeeData = async () => {
  try {
    console.log('Seeding employee data...');
    
    // Insert employees
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .upsert(sampleEmployees, { onConflict: 'id' })
      .select();

    if (employeeError) {
      console.error('Error seeding employees:', employeeError);
      throw employeeError;
    }

    console.log('Employees seeded:', employees?.length);

    // Add admin access for John Doe
    const { error: adminError } = await supabase
      .from('admin_access')
      .upsert({
        employee_id: 'EMP001',
        employees: true,
        payroll: true,
        leave_management: true,
        claims: true,
        attendance: true,
        slot_booking: true,
        reports: true
      }, { onConflict: 'employee_id' });

    if (adminError) {
      console.error('Error seeding admin access:', adminError);
    }

    // Add page access for all employees
    const pageAccessData = sampleEmployees.map(emp => ({
      employee_id: emp.id,
      profile: true,
      apply_leave: true,
      submit_claim: true,
      payslips: true,
      my_attendance: true,
      slot_booking_employee: emp.type === 'Casual'
    }));

    const { error: pageAccessError } = await supabase
      .from('employee_page_access')
      .upsert(pageAccessData, { onConflict: 'employee_id' });

    if (pageAccessError) {
      console.error('Error seeding page access:', pageAccessError);
    }

    console.log('Employee data seeding completed successfully');
    return true;
  } catch (error) {
    console.error('Error in seedEmployeeData:', error);
    throw error;
  }
};
