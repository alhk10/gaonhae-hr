import { createAuthAccountsForJasonAndEldon, verifyBookingCreation } from './authFixService';
import { toast } from 'sonner';

export const executeBookingFixPlan = async (): Promise<void> => {
  try {
    console.log('BookingFixService: Executing comprehensive booking fix plan...');
    
    // Step 1: Create auth accounts for Jason and Eldon
    console.log('BookingFixService: Step 1 - Creating authentication accounts...');
    const authResult = await createAuthAccountsForJasonAndEldon();
    
    if (authResult.errors.length > 0) {
      console.warn('BookingFixService: Authentication issues detected:', authResult.errors);
      toast.warning(`Authentication setup completed with warnings: ${authResult.errors.length} issues detected`);
    } else {
      console.log('BookingFixService: Authentication accounts verified successfully');
      toast.success('Authentication accounts verified for both users');
    }

    // Step 2: Verify manual bookings were created
    console.log('BookingFixService: Step 2 - Verifying manual bookings...');
    const bookingResult = await verifyBookingCreation();
    
    if (bookingResult.success) {
      const jasonCount = bookingResult.jasonBookings.length;
      const eldonCount = bookingResult.eldonBookings.length;
      
      console.log('BookingFixService: Manual bookings verification:', {
        jason: jasonCount,
        eldon: eldonCount
      });
      
      if (jasonCount >= 2 && eldonCount >= 2) {
        toast.success(`Manual bookings verified: Jason (${jasonCount} bookings), Eldon (${eldonCount} bookings)`);
      } else {
        toast.warning(`Manual bookings partially created: Jason (${jasonCount}/2), Eldon (${eldonCount}/2)`);
      }
    } else {
      console.error('BookingFixService: Failed to verify manual bookings');
      toast.error('Failed to verify manual bookings');
    }

    // Step 3: Log the completion
    console.log('BookingFixService: Plan execution completed');
    console.log('BookingFixService: Summary:', {
      jasonAuth: authResult.jason,
      eldonAuth: authResult.eldon,
      jasonBookings: bookingResult.jasonBookings?.length || 0,
      eldonBookings: bookingResult.eldonBookings?.length || 0,
      authErrors: authResult.errors.length
    });

    // Final status logging (notifications removed as issues are resolved)
    console.log('BookingFixService: Execution completed', {
      authSuccess: authResult.jason && authResult.eldon,
      bookingSuccess: bookingResult.success
    });

  } catch (error) {
    console.error('BookingFixService: Fatal error during plan execution:', error);
    toast.error(`Failed to execute booking fix plan: ${error}`);
    throw error;
  }
};

export const checkBookingSystemHealth = async (): Promise<{
  slotsConfigured: boolean;
  authSystemWorking: boolean;
  databaseConnected: boolean;
  criticalErrors: string[];
}> => {
  const result = {
    slotsConfigured: false,
    authSystemWorking: false,
    databaseConnected: false,
    criticalErrors: [] as string[]
  };

  try {
    // Check database connectivity
    const { data: testQuery } = await import('@/integrations/supabase/client').then(module => 
      module.supabase.from('branches').select('count').limit(1)
    );
    result.databaseConnected = true;
    console.log('BookingFixService: Database connectivity verified');

    // Check slot configuration
    const { data: slotConfig } = await import('@/integrations/supabase/client').then(module =>
      module.supabase.from('weekly_slot_config').select('*').limit(1)
    );
    result.slotsConfigured = slotConfig && slotConfig.length > 0;
    
    if (!result.slotsConfigured) {
      result.criticalErrors.push('No slot configuration found');
    }

    // Check basic auth functionality
    try {
      const { data: authTest } = await import('@/integrations/supabase/client').then(module =>
        module.supabase.auth.getSession()
      );
      result.authSystemWorking = true;
      console.log('BookingFixService: Auth system functional');
    } catch (authError) {
      result.criticalErrors.push('Auth system not responding');
      console.error('BookingFixService: Auth system check failed:', authError);
    }

  } catch (error) {
    result.criticalErrors.push(`System health check failed: ${error}`);
    console.error('BookingFixService: Health check failed:', error);
  }

  return result;
};