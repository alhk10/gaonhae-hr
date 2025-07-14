
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
  
  console.log('BulkUserCreation: Validating employees for auth creation...');
  
  for (const employee of employees) {
    const email = employee.email;
    
    if (email && 
        typeof email === 'string' && 
        email.trim().length > 0 && 
        email.includes('@') &&
        email.includes('.')) {
      
      console.log(`BulkUserCreation: Employee ${employee.name} has valid email: ${email}`);
      validatedEmployees.push({
        id: employee.id,
        name: employee.name,
        email: email.trim().toLowerCase()
      });
    } else {
      console.warn(`BulkUserCreation: Employee ${employee.name} has invalid email:`, email);
    }
  }
  
  console.log(`BulkUserCreation: Found ${validatedEmployees.length} employees with valid emails`);
  return validatedEmployees;
};

// Get existing user emails from Supabase Auth
const getExistingUserEmails = async (): Promise<Set<string>> => {
  console.log('BulkUserCreation: Fetching existing Supabase Auth users...');
  
  try {
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
    
    console.log(`BulkUserCreation: Found ${existingEmails.size} existing Supabase Auth users`);
    return existingEmails;
  } catch (error) {
    console.error('BulkUserCreation: Exception in getExistingUserEmails:', error);
    return new Set<string>(); // Return empty set on error to allow creation attempts
  }
};

// Filter employees who need auth accounts
const filterEmployeesNeedingAuth = (validatedEmployees: ValidatedEmployee[], existingEmails: Set<string>): ValidatedEmployee[] => {
  const employeesToCreate: ValidatedEmployee[] = [];
  
  for (const employee of validatedEmployees) {
    if (!existingEmails.has(employee.email.toLowerCase())) {
      console.log(`BulkUserCreation: Employee ${employee.name} (${employee.email}) needs Supabase Auth account`);
      employeesToCreate.push(employee);
    } else {
      console.log(`BulkUserCreation: Employee ${employee.name} (${employee.email}) already has Supabase Auth account`);
    }
  }
  
  return employeesToCreate;
};

// Create a single auth user with enhanced error handling
const createAuthUser = async (employee: ValidatedEmployee): Promise<{ success: boolean; error?: string }> => {
  try {
    const normalizedEmail = employee.email.toLowerCase().trim();
    const tempPassword = generateSecurePassword();
    
    console.log(`BulkUserCreation: Creating Supabase Auth user for ${employee.name} (${normalizedEmail})`);
    
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
      console.error(`BulkUserCreation: Failed to create user ${normalizedEmail}:`, createError);
      return { success: false, error: createError.message };
    }

    if (!authUser.user) {
      console.error(`BulkUserCreation: User creation failed for ${normalizedEmail} - no user returned`);
      return { success: false, error: 'User creation failed - no user returned' };
    }

    console.log(`BulkUserCreation: Successfully created auth user for ${normalizedEmail}, sending password reset email...`);

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
    console.error(`BulkUserCreation: Exception creating user for ${employee.email}:`, error);
    return { success: false, error: errorMessage };
  }
};

export const createBulkSupabaseAuthUsers = async (): Promise<BulkUserCreationResult> => {
  console.log('BulkUserCreation: Starting comprehensive bulk user creation process...');
  
  const result: BulkUserCreationResult = {
    success: 0,
    failed: 0,
    errors: [],
    created: []
  };

  try {
    // Step 1: Get all employees and validate emails
    console.log('BulkUserCreation: Step 1 - Fetching all employees...');
    const allEmployees = await getEmployees();
    console.log(`BulkUserCreation: Retrieved ${allEmployees.length} employees from database`);
    
    const validatedEmployees = validateAndExtractEmployees(allEmployees);
    
    if (validatedEmployees.length === 0) {
      console.log('BulkUserCreation: No employees with valid emails found');
      return result;
    }

    // Step 2: Get existing Supabase Auth users
    console.log('BulkUserCreation: Step 2 - Checking existing Supabase Auth users...');
    const existingEmails = await getExistingUserEmails();

    // Step 3: Filter employees who need auth accounts
    console.log('BulkUserCreation: Step 3 - Filtering employees who need auth accounts...');
    const employeesToCreate = filterEmployeesNeedingAuth(validatedEmployees, existingEmails);

    console.log(`BulkUserCreation: ${employeesToCreate.length} employees need Supabase Auth accounts`);

    if (employeesToCreate.length === 0) {
      console.log('BulkUserCreation: All employees already have Supabase Auth accounts');
      return result;
    }

    // Step 4: Create Supabase Auth users with better error handling
    console.log('BulkUserCreation: Step 4 - Creating Supabase Auth users...');
    
    // Process in smaller batches to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < employeesToCreate.length; i += batchSize) {
      const batch = employeesToCreate.slice(i, i + batchSize);
      
      console.log(`BulkUserCreation: Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(employeesToCreate.length/batchSize)}`);
      
      const batchPromises = batch.map(async (employee) => {
        console.log(`BulkUserCreation: Processing ${employee.name} (${employee.email})`);
        return await createAuthUser(employee);
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, batchIndex) => {
        const employee = batch[batchIndex];
        
        if (result.status === 'fulfilled' && result.value.success) {
          console.log(`BulkUserCreation: ✓ Successfully created user ${employee.email}`);
          result.value.created.push({
            email: employee.email,
            name: employee.name
          });
          result.value.success++;
        } else {
          const error = result.status === 'fulfilled' ? result.value.error : result.reason;
          console.error(`BulkUserCreation: ✗ Failed to create user ${employee.email}:`, error);
          result.value.errors.push({
            email: employee.email,
            error: error || 'Unknown error'
          });
          result.value.failed++;
        }
      });
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < employeesToCreate.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('BulkUserCreation: Bulk creation completed successfully:', {
      success: result.success,
      failed: result.failed,
      totalProcessed: result.success + result.failed
    });
    
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
      id: 'single-user-' + Date.now(),
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

// Check if a specific employee has a Supabase Auth account
export const checkEmployeeAuthStatus = async (email: string): Promise<boolean> => {
  try {
    if (!email) return false;
    
    const existingEmails = await getExistingUserEmails();
    const hasAuth = existingEmails.has(email.toLowerCase().trim());
    
    console.log(`BulkUserCreation: Employee ${email} auth status:`, hasAuth ? 'EXISTS' : 'MISSING');
    return hasAuth;
  } catch (error) {
    console.error(`BulkUserCreation: Error checking auth status for ${email}:`, error);
    return false;
  }
};
