import { createSingleSupabaseAuthUser } from './bulkUserCreationService';
import { supabase } from '@/integrations/supabase/client';

export const createAuthAccountsForJasonAndEldon = async (): Promise<{
  jason: boolean;
  eldon: boolean;
  errors: string[];
}> => {
  const result = {
    jason: false,
    eldon: false,
    errors: [] as string[]
  };

  try {
    console.log('AuthFixService: Creating auth accounts for Jason Lu and Eldon...');
    
    // Create auth account for Jason Lu
    try {
      const jasonSuccess = await createSingleSupabaseAuthUser(
        'jasonlulijie@gmail.com',
        'Jason Lu Lijie'
      );
      result.jason = jasonSuccess;
      if (jasonSuccess) {
        console.log('AuthFixService: Successfully created/verified auth account for Jason Lu');
      } else {
        const error = 'Failed to create auth account for Jason Lu';
        console.error('AuthFixService:', error);
        result.errors.push(error);
      }
    } catch (jasonError) {
      const error = `Error creating auth account for Jason Lu: ${jasonError}`;
      console.error('AuthFixService:', error);
      result.errors.push(error);
    }

    // Create auth account for Eldon
    try {
      const eldonSuccess = await createSingleSupabaseAuthUser(
        'eldon.ayz0106@gmail.com',
        'Aw Yi Zhe Eldon'
      );
      result.eldon = eldonSuccess;
      if (eldonSuccess) {
        console.log('AuthFixService: Successfully created/verified auth account for Eldon');
      } else {
        const error = 'Failed to create auth account for Eldon';
        console.error('AuthFixService:', error);
        result.errors.push(error);
      }
    } catch (eldonError) {
      const error = `Error creating auth account for Eldon: ${eldonError}`;
      console.error('AuthFixService:', error);
      result.errors.push(error);
    }

    // Reset password requirements for both users
    try {
      await supabase
        .from('user_passwords')
        .upsert([
          {
            email: 'jasonlulijie@gmail.com',
            password_hash: 'temp_hash',
            salt: 'temp_salt',
            requires_change: false,
            must_change_password: false,
            password_complexity_met: true
          },
          {
            email: 'eldon.ayz0106@gmail.com',
            password_hash: 'temp_hash',
            salt: 'temp_salt',
            requires_change: false,
            must_change_password: false,
            password_complexity_met: true
          }
        ]);
      console.log('AuthFixService: Reset password requirements for both users');
    } catch (passwordError) {
      const error = `Error resetting password requirements: ${passwordError}`;
      console.error('AuthFixService:', error);
      result.errors.push(error);
    }

    return result;
  } catch (error) {
    console.error('AuthFixService: Fatal error:', error);
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
};

export const verifyBookingCreation = async (): Promise<{
  jasonBookings: any[];
  eldonBookings: any[];
  success: boolean;
}> => {
  try {
    console.log('AuthFixService: Verifying manual bookings were created...');
    
    // Check Jason's bookings
    const { data: jasonBookings, error: jasonError } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('employee_id', 'EMP1751007228999')
      .in('date', ['2025-08-03', '2025-08-10']);

    if (jasonError) {
      console.error('AuthFixService: Error fetching Jason\'s bookings:', jasonError);
      return { jasonBookings: [], eldonBookings: [], success: false };
    }

    // Check Eldon's bookings
    const { data: eldonBookings, error: eldonError } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('employee_id', 'EMP1751006728858')
      .in('date', ['2025-08-09', '2025-08-16']);

    if (eldonError) {
      console.error('AuthFixService: Error fetching Eldon\'s bookings:', eldonError);
      return { jasonBookings: jasonBookings || [], eldonBookings: [], success: false };
    }

    console.log('AuthFixService: Booking verification results:', {
      jason: jasonBookings?.length || 0,
      eldon: eldonBookings?.length || 0
    });

    return {
      jasonBookings: jasonBookings || [],
      eldonBookings: eldonBookings || [],
      success: true
    };
  } catch (error) {
    console.error('AuthFixService: Error verifying bookings:', error);
    return { jasonBookings: [], eldonBookings: [], success: false };
  }
};