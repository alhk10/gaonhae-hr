import { executeBookingFixPlan, checkBookingSystemHealth } from './bookingFixService';

export const initializeBookingSystemFix = async (): Promise<void> => {
  try {
    console.log('SystemInitialization: Starting booking system fix initialization...');
    
    // Step 1: Check system health
    console.log('SystemInitialization: Checking system health...');
    const healthCheck = await checkBookingSystemHealth();
    
    if (healthCheck.criticalErrors.length > 0) {
      console.error('SystemInitialization: Critical errors detected:', healthCheck.criticalErrors);
    }

    // Step 2: Execute the comprehensive fix plan
    console.log('SystemInitialization: Executing booking fix plan...');
    await executeBookingFixPlan();
    
    console.log('SystemInitialization: Booking system fix initialization completed successfully');
    
  } catch (error) {
    console.error('SystemInitialization: Failed to initialize booking system fix:', error);
    throw error;
  }
};

// Auto-initialize when this service is imported (for immediate fix)
export const autoInitialize = async (): Promise<void> => {
  try {
    console.log('SystemInitialization: Auto-initialization triggered...');
    await initializeBookingSystemFix();
  } catch (error) {
    console.error('SystemInitialization: Auto-initialization failed:', error);
    // Don't throw here to prevent breaking the app
  }
};

// Call auto-initialize
autoInitialize();