
import { supabase } from '@/integrations/supabase/client';
import { getEmployees } from './employeeService';

interface BulkUserCreationResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
  created: Array<{ email: string; name: string }>;
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

export const createBulkSupabaseAuthUsers = async (): Promise<BulkUserCreationResult> => {
  console.log('BulkUserCreation: Starting bulk user creation process...');
  
  const result: BulkUserCreationResult = {
    success: 0,
    failed: 0,
    errors: [],
    created: []
  };

  try {
    // Get all employees with email addresses
    const employees = await getEmployees();
    const employeesWithEmail = employees.filter(emp => emp.email && emp.email.trim() !== '');
    
    console.log(`BulkUserCreation: Found ${employeesWithEmail.length} employees with email addresses`);

    for (const employee of employeesWithEmail) {
      const normalizedEmail = employee.email!.toLowerCase().trim();
      console.log(`BulkUserCreation: Processing ${employee.name} (${normalizedEmail})`);

      try {
        // Check if user already exists in Supabase Auth
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
          console.error('BulkUserCreation: Error checking existing users:', listError);
          result.errors.push({
            email: normalizedEmail,
            error: `Failed to check existing users: ${listError.message}`
          });
          result.failed++;
          continue;
        }

        const userExists = existingUsers.users.some(user => 
          user.email?.toLowerCase() === normalizedEmail
        );

        if (userExists) {
          console.log(`BulkUserCreation: User already exists: ${normalizedEmail}`);
          continue;
        }

        // Generate secure temporary password
        const tempPassword = generateSecurePassword();
        
        console.log(`BulkUserCreation: Creating Supabase Auth user for ${normalizedEmail}`);

        // Create the user in Supabase Auth
        const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: employee.name,
            employee_id: employee.id
          }
        });

        if (createError) {
          console.error(`BulkUserCreation: Failed to create user ${normalizedEmail}:`, createError);
          result.errors.push({
            email: normalizedEmail,
            error: createError.message
          });
          result.failed++;
          continue;
        }

        if (authUser.user) {
          console.log(`BulkUserCreation: Successfully created user ${normalizedEmail}`);
          result.created.push({
            email: normalizedEmail,
            name: employee.name
          });
          result.success++;

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
        }

      } catch (userError) {
        console.error(`BulkUserCreation: Unexpected error for ${normalizedEmail}:`, userError);
        result.errors.push({
          email: normalizedEmail,
          error: `Unexpected error: ${userError instanceof Error ? userError.message : 'Unknown error'}`
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

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('BulkUserCreation: Error checking existing users:', listError);
      return false;
    }

    const userExists = existingUsers.users.some(user => 
      user.email?.toLowerCase() === normalizedEmail
    );

    if (userExists) {
      console.log(`BulkUserCreation: User already exists: ${normalizedEmail}`);
      return true; // Return true since user exists
    }

    // Generate secure temporary password
    const tempPassword = generateSecurePassword();
    
    // Create the user
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: name
      }
    });

    if (createError) {
      console.error(`BulkUserCreation: Failed to create user ${normalizedEmail}:`, createError);
      return false;
    }

    if (authUser.user) {
      console.log(`BulkUserCreation: Successfully created user ${normalizedEmail}`);
      
      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/`
        }
      );

      if (resetError) {
        console.warn(`BulkUserCreation: Failed to send reset email to ${normalizedEmail}:`, resetError);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error(`BulkUserCreation: Error creating single user ${email}:`, error);
    return false;
  }
};
