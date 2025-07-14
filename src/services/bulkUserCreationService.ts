
import { supabase } from '@/integrations/supabase/client';
import { getEmployees } from './employeeService';
import { EmployeeProfile } from '@/types/employee';

interface BulkUserCreationResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
  created: Array<{ email: string; name: string }>;
}

interface ValidatedEmployee {
  id: string;
  name: string;
  email: string; // Guaranteed to be a valid non-null string
}

// Generate a secure temporary password
const generateSecurePassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Validate and extract employees with valid emails
const validateAndExtractEmployees = (employees: EmployeeProfile[]): ValidatedEmployee[] => {
  const validatedEmployees: ValidatedEmployee[] = [];
  
  for (const employee of employees) {
    // Explicit validation without complex type guards
    const email = employee.email;
    
    if (email && 
        typeof email === 'string' && 
        email.trim().length > 0 && 
        email.includes('@') &&
        email.includes('.')) {
      
      validatedEmployees.push({
        id: employee.id,
        name: employee.name,
        email: email.trim()
      });
    }
  }
  
  return validatedEmployees;
};

// Get existing user emails from Supabase
const getExistingUserEmails = async (): Promise<Set<string>> => {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('BulkUserCreation: Error fetching existing users:', listError);
    throw new Error(`Failed to fetch existing users: ${listError.message}`);
  }

  const existingEmails = new Set<string>();
  
  for (const user of existingUsers.users) {
    if (user.email && typeof user.email === 'string') {
      existingEmails.add(user.email.toLowerCase());
    }
  }
  
  return existingEmails;
};

// Filter employees who need auth accounts
const filterEmployeesNeedingAuth = (validatedEmployees: ValidatedEmployee[], existingEmails: Set<string>): ValidatedEmployee[] => {
  const employeesToCreate: ValidatedEmployee[] = [];
  
  for (const employee of validatedEmployees) {
    if (!existingEmails.has(employee.email.toLowerCase())) {
      employeesToCreate.push(employee);
    }
  }
  
  return employeesToCreate;
};

// Create a single auth user
const createAuthUser = async (employee: ValidatedEmployee): Promise<{ success: boolean; error?: string }> => {
  try {
    const normalizedEmail = employee.email.toLowerCase().trim();
    const tempPassword = generateSecurePassword();
    
    // Create the user in Supabase Auth
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: employee.name,
        employee_id: employee.id
      }
    });

    if (createError) {
      return { success: false, error: createError.message };
    }

    if (!authUser.user) {
      return { success: false, error: 'User creation failed - no user returned' };
    }

    // Send password reset email
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/`
        }
      );

      if (resetError) {
        console.warn(`BulkUserCreation: Failed to send reset email to ${normalizedEmail}:`, resetError);
      } else {
        console.log(`BulkUserCreation: Password reset email sent to ${normalizedEmail}`);
      }
    } catch (resetEmailError) {
      console.warn(`BulkUserCreation: Error sending reset email to ${normalizedEmail}:`, resetEmailError);
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

export const createBulkSupabaseAuthUsers = async (): Promise<BulkUserCreationResult> => {
  console.log('BulkUserCreation: Starting bulk user creation process...');
  
  const result: BulkUserCreationResult = {
    success: 0,
    failed: 0,
    errors: [],
    created: []
  };

  try {
    // Step 1: Get all employees and validate emails
    const allEmployees = await getEmployees();
    const validatedEmployees = validateAndExtractEmployees(allEmployees);
    
    console.log(`BulkUserCreation: Found ${validatedEmployees.length} employees with valid email addresses`);

    if (validatedEmployees.length === 0) {
      console.log('BulkUserCreation: No employees with valid emails found');
      return result;
    }

    // Step 2: Get existing Supabase Auth users
    const existingEmails = await getExistingUserEmails();

    // Step 3: Filter employees who need auth accounts
    const employeesToCreate = filterEmployeesNeedingAuth(validatedEmployees, existingEmails);

    console.log(`BulkUserCreation: ${employeesToCreate.length} employees need Supabase Auth accounts`);

    if (employeesToCreate.length === 0) {
      console.log('BulkUserCreation: All employees already have Supabase Auth accounts');
      return result;
    }

    // Step 4: Create Supabase Auth users
    for (const employee of employeesToCreate) {
      console.log(`BulkUserCreation: Creating Supabase Auth user for ${employee.name} (${employee.email})`);

      const createResult = await createAuthUser(employee);

      if (createResult.success) {
        console.log(`BulkUserCreation: Successfully created user ${employee.email}`);
        result.created.push({
          email: employee.email,
          name: employee.name
        });
        result.success++;
      } else {
        console.error(`BulkUserCreation: Failed to create user ${employee.email}:`, createResult.error);
        result.errors.push({
          email: employee.email,
          error: createResult.error || 'Unknown error'
        });
        result.failed++;
      }
    }

    console.log('BulkUserCreation: Bulk creation completed:', result);
    return result;

  } catch (error) {
    console.error('BulkUserCreation: Fatal error during bulk creation:', error);
    throw error;
  }
};

export const createSingleSupabaseAuthUser = async (email: string, name: string): Promise<boolean> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`BulkUserCreation: Creating single user: ${normalizedEmail}`);

    // Validate email format
    if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      console.error(`BulkUserCreation: Invalid email format: ${normalizedEmail}`);
      return false;
    }

    // Check if user already exists
    const existingEmails = await getExistingUserEmails();

    if (existingEmails.has(normalizedEmail)) {
      console.log(`BulkUserCreation: User already exists: ${normalizedEmail}`);
      return true; // Return true since user exists
    }

    // Create the user
    const validatedEmployee: ValidatedEmployee = {
      id: 'single-user', // Temporary ID for single user creation
      name: name,
      email: normalizedEmail
    };

    const createResult = await createAuthUser(validatedEmployee);

    if (createResult.success) {
      console.log(`BulkUserCreation: Successfully created user ${normalizedEmail}`);
      return true;
    } else {
      console.error(`BulkUserCreation: Failed to create user ${normalizedEmail}:`, createResult.error);
      return false;
    }
  } catch (error) {
    console.error(`BulkUserCreation: Error creating single user ${email}:`, error);
    return false;
  }
};
