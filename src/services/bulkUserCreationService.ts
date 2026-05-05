import { supabase } from '@/integrations/supabase/client';
import { getEmployees } from './employeeService';
import { EmployeeProfile } from '@/types/employee';
import { logger } from '@/utils/logger';

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
  
  logger.debug('Validating employees for auth creation');
  
  for (const employee of employees) {
    const email = employee.email;
    
    if (email && 
        typeof email === 'string' && 
        email.trim().length > 0 && 
        email.includes('@') &&
        email.includes('.')) {
      
      logger.debug(`Employee ${employee.name} has valid email`, { email });
      validatedEmployees.push({
        id: employee.id,
        name: employee.name,
        email: email.trim().toLowerCase()
      });
    } else {
      logger.warn(`Employee ${employee.name} has invalid email`, { email });
    }
  }
  
  logger.info(`Found ${validatedEmployees.length} employees with valid emails`);
  return validatedEmployees;
};

// Check if user exists by calling the auth-admin edge function (admin API).
// CRITICAL: Do NOT use supabase.auth.signUp() here — that would replace the
// caller's browser session with the new user's session.
const checkIfUserExists = async (email: string): Promise<boolean> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    logger.debug('Checking if user exists via auth-admin', { email: normalizedEmail });

    const { data, error } = await supabase.functions.invoke('auth-admin', {
      body: { action: 'check_user_exists', email: normalizedEmail },
    });

    if (error) {
      logger.warn('auth-admin check_user_exists failed', { email: normalizedEmail, error: error.message });
      return false;
    }
    return Boolean(data?.exists);
  } catch (error) {
    logger.error('Error checking user existence', error, { email });
    return false;
  }
};

// Create auth user via the auth-admin edge function (admin API).
// CRITICAL: Do NOT use supabase.auth.signUp() here — that would replace the
// caller's browser session with the new user's session and effectively log
// out the superadmin who is creating the employee.
const createAuthUser = async (employee: ValidatedEmployee): Promise<AuthUserCreationResult> => {
  try {
    const normalizedEmail = employee.email.toLowerCase().trim();

    logger.debug('Creating auth user via auth-admin', { name: employee.name, email: normalizedEmail });

    const { data, error } = await supabase.functions.invoke('auth-admin', {
      body: {
        action: 'create_user',
        email: normalizedEmail,
        name: employee.name,
        employeeId: employee.id,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      },
    });

    if (error) {
      logger.error('auth-admin create_user failed', error, { email: normalizedEmail });
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      const errMsg = data?.error || 'Unknown error creating auth user';
      logger.error('auth-admin create_user returned failure', undefined, { email: normalizedEmail, error: errMsg });
      return { success: false, error: errMsg };
    }

    if (data.alreadyExisted) {
      logger.info('Auth user already existed', { email: normalizedEmail });
    } else {
      logger.info('Successfully created auth user via admin API', { email: normalizedEmail });
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Exception creating user', error, { email: employee.email });
    return { success: false, error: errorMessage };
  }
};

// Generate a secure temporary password using crypto.getRandomValues
const randomInt = (max: number): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
};

const generateSecurePassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  password += uppercase[randomInt(uppercase.length)];
  password += lowercase[randomInt(lowercase.length)];
  password += numbers[randomInt(numbers.length)];
  password += symbols[randomInt(symbols.length)];

  for (let i = 4; i < length; i++) {
    password += allChars[randomInt(allChars.length)];
  }

  // Cryptographic Fisher-Yates shuffle
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
};

export const createBulkSupabaseAuthUsers = async (): Promise<BulkUserCreationResult> => {
  logger.info('Starting comprehensive bulk user creation process');
  
  const result: BulkUserCreationResult = {
    success: 0,
    failed: 0,
    errors: [],
    created: []
  };

  try {
    // Step 1: Get all employees and validate emails
    logger.debug('Step 1 - Fetching all employees');
    const allEmployees = await getEmployees();
    logger.info(`Retrieved ${allEmployees.length} employees from database`);
    
    const validatedEmployees = validateAndExtractEmployees(allEmployees);
    
    if (validatedEmployees.length === 0) {
      logger.warn('No employees with valid emails found');
      return result;
    }

    logger.info(`Processing ${validatedEmployees.length} employees with valid emails`);

    // Step 2: Create auth users with better error handling
    logger.debug('Step 2 - Creating Supabase Auth users');
    
    // Process in smaller batches to avoid rate limiting
    const batchSize = 2; // Smaller batch size to avoid rate limits
    for (let i = 0; i < validatedEmployees.length; i += batchSize) {
      const batch = validatedEmployees.slice(i, i + batchSize);
      
      logger.debug(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(validatedEmployees.length/batchSize)}`);
      
      const batchPromises = batch.map(async (employee) => {
        logger.debug(`Processing employee`, { name: employee.name, email: employee.email });
        return await createAuthUser(employee);
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((promiseResult, batchIndex) => {
        const employee = batch[batchIndex];
        
        if (promiseResult.status === 'fulfilled' && promiseResult.value.success) {
          logger.info('Successfully processed user', { email: employee.email });
          result.created.push({
            email: employee.email,
            name: employee.name
          });
          result.success++;
        } else {
          const error = promiseResult.status === 'fulfilled' ? promiseResult.value.error : String(promiseResult.reason);
          logger.error('Failed to process user', undefined, { email: employee.email, error });
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

    logger.info('Bulk creation completed successfully', {
      success: result.success,
      failed: result.failed,
      totalProcessed: result.success + result.failed
    });
    
    return result;

  } catch (error) {
    logger.error('Fatal error during bulk creation', error);
    throw error;
  }
};

export const createSingleSupabaseAuthUser = async (email: string, name: string): Promise<boolean> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    logger.info('Creating single user', { email: normalizedEmail });

    // Validate email format
    if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      logger.error('Invalid email format', undefined, { email: normalizedEmail });
      return false;
    }

    // Check if user already exists
    const userExists = await checkIfUserExists(normalizedEmail);
    if (userExists) {
      logger.info('User already exists', { email: normalizedEmail });
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
      logger.info('Successfully created user', { email: normalizedEmail });
      return true;
    } else {
      logger.error('Failed to create user', undefined, { email: normalizedEmail, error: createResult.error });
      return false;
    }
  } catch (error) {
    logger.error('Error creating single user', error, { email });
    return false;
  }
};

// Check if a specific employee has auth account by trying to sign them up
export const checkEmployeeAuthStatus = async (email: string): Promise<boolean> => {
  try {
    if (!email) return false;
    
    const userExists = await checkIfUserExists(email.toLowerCase().trim());
    
    logger.debug('Employee auth status checked', { email, status: userExists ? 'EXISTS' : 'MISSING' });
    return userExists;
  } catch (error) {
    logger.error('Error checking auth status', error, { email });
    return false;
  }
};
