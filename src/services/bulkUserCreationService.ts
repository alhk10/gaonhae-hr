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
  email: string;
}

interface AuthUserCreationResult {
  success: boolean;
  error?: string;
}

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

// Check if user exists by attempting to sign up (this will fail if user exists)
const checkIfUserExists = async (email: string): Promise<boolean> => {
  try {
    console.log(`BulkUserCreation: Checking if user exists: ${email}`);
    
    // Try to sign up with a temporary password - this will fail if user already exists
    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: 'temp_check_password_123',
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      // If error message indicates user already exists, return true
      if (error.message.toLowerCase().includes('already') || 
          error.message.toLowerCase().includes('exist') ||
          error.message.toLowerCase().includes('registered')) {
        console.log(`BulkUserCreation: User ${email} already exists`);
        return true;
      }
      // Other errors might indicate the user doesn't exist but signup failed for other reasons
      console.log(`BulkUserCreation: User ${email} existence check failed:`, error.message);
      return false;
    }

    // If no error, user was created (didn't exist before)
    console.log(`BulkUserCreation: User ${email} was created during check`);
    return false;
  } catch (error) {
    console.error(`BulkUserCreation: Error checking user existence for ${email}:`, error);
    return false;
  }
};

// Create auth user using standard signup flow
const createAuthUser = async (employee: ValidatedEmployee): Promise<AuthUserCreationResult> => {
  try {
    const normalizedEmail = employee.email.toLowerCase().trim();
    
    console.log(`BulkUserCreation: Creating auth user for ${employee.name} (${normalizedEmail})`);
    
    // Check if user already exists first
    const userExists = await checkIfUserExists(normalizedEmail);
    if (userExists) {
      console.log(`BulkUserCreation: User ${normalizedEmail} already exists, skipping creation`);
      return { success: true };
    }

    // Generate a secure temporary password
    const tempPassword = generateSecurePassword();
    
    // Create the user using standard signup
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: employee.name,
          employee_id: employee.id
        }
      }
    });

    if (error) {
      console.error(`BulkUserCreation: Failed to create user ${normalizedEmail}:`, error);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      console.error(`BulkUserCreation: User creation failed for ${normalizedEmail} - no user returned`);
      return { success: false, error: 'User creation failed - no user returned' };
    }

    console.log(`BulkUserCreation: Successfully created auth user for ${normalizedEmail}`);

    // Send password reset email so user can set their own password
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

    console.log(`BulkUserCreation: Processing ${validatedEmployees.length} employees with valid emails`);

    // Step 2: Create auth users with better error handling
    console.log('BulkUserCreation: Step 2 - Creating Supabase Auth users...');
    
    // Process in smaller batches to avoid rate limiting
    const batchSize = 2; // Smaller batch size to avoid rate limits
    for (let i = 0; i < validatedEmployees.length; i += batchSize) {
      const batch = validatedEmployees.slice(i, i + batchSize);
      
      console.log(`BulkUserCreation: Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(validatedEmployees.length/batchSize)}`);
      
      const batchPromises = batch.map(async (employee) => {
        console.log(`BulkUserCreation: Processing ${employee.name} (${employee.email})`);
        return await createAuthUser(employee);
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((promiseResult, batchIndex) => {
        const employee = batch[batchIndex];
        
        if (promiseResult.status === 'fulfilled' && promiseResult.value.success) {
          console.log(`BulkUserCreation: ✓ Successfully processed user ${employee.email}`);
          result.created.push({
            email: employee.email,
            name: employee.name
          });
          result.success++;
        } else {
          const error = promiseResult.status === 'fulfilled' ? promiseResult.value.error : String(promiseResult.reason);
          console.error(`BulkUserCreation: ✗ Failed to process user ${employee.email}:`, error);
          result.errors.push({
            email: employee.email,
            error: error || 'Unknown error'
          });
          result.failed++;
        }
      });
      
      // Add longer delay between batches to respect rate limits
      if (i + batchSize < validatedEmployees.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
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
    const userExists = await checkIfUserExists(normalizedEmail);
    if (userExists) {
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

// Check if a specific employee has auth account by trying to sign them up
export const checkEmployeeAuthStatus = async (email: string): Promise<boolean> => {
  try {
    if (!email) return false;
    
    const userExists = await checkIfUserExists(email.toLowerCase().trim());
    
    console.log(`BulkUserCreation: Employee ${email} auth status:`, userExists ? 'EXISTS' : 'MISSING');
    return userExists;
  } catch (error) {
    console.error(`BulkUserCreation: Error checking auth status for ${email}:`, error);
    return false;
  }
};
