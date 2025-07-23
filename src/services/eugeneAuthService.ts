
import { createSingleSupabaseAuthUser } from './bulkUserCreationService';

export const createEugeneGohAuthAccount = async (): Promise<boolean> => {
  try {
    console.log('EugeneAuthService: Creating Supabase auth account for Eugene Goh...');
    
    const success = await createSingleSupabaseAuthUser(
      'eugeneg@ushgroup.sg',
      'Eugene Goh'
    );
    
    if (success) {
      console.log('EugeneAuthService: Successfully created auth account for Eugene Goh');
      console.log('EugeneAuthService: Password reset email should be sent to eugeneg@ushgroup.sg');
      return true;
    } else {
      console.error('EugeneAuthService: Failed to create auth account for Eugene Goh');
      return false;
    }
  } catch (error) {
    console.error('EugeneAuthService: Error creating Eugene Goh auth account:', error);
    return false;
  }
};

// Function to check if Eugene's auth account exists
export const checkEugeneGohAuthStatus = async (): Promise<boolean> => {
  try {
    const { checkEmployeeAuthStatus } = await import('./bulkUserCreationService');
    return await checkEmployeeAuthStatus('eugeneg@ushgroup.sg');
  } catch (error) {
    console.error('EugeneAuthService: Error checking Eugene Goh auth status:', error);
    return false;
  }
};
