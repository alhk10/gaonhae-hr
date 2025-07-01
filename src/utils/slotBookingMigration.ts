
import { addSlotBooking, type SlotBooking } from '@/services/slotBookingService';

// Utility function to migrate localStorage slot booking data to Supabase
export const migrateSlotBookingData = async (): Promise<{ success: boolean; migrated: number; errors: string[] }> => {
  const errors: string[] = [];
  let migrated = 0;

  try {
    // Check if there's existing localStorage data
    const storedBookings = localStorage.getItem('slot_bookings');
    if (!storedBookings) {
      console.log('No localStorage slot booking data found to migrate');
      return { success: true, migrated: 0, errors: [] };
    }

    const bookings: any[] = JSON.parse(storedBookings);
    
    if (!Array.isArray(bookings) || bookings.length === 0) {
      console.log('No valid slot booking data found to migrate');
      return { success: true, migrated: 0, errors: [] };
    }

    console.log(`Found ${bookings.length} slot bookings to migrate`);

    // Migrate each booking to Supabase
    for (const booking of bookings) {
      try {
        await addSlotBooking({
          employeeId: booking.employeeId,
          employeeName: booking.employeeName,
          branchId: booking.branchId,
          branchName: booking.branchName,
          date: booking.date,
          status: booking.status,
          approvedBy: booking.approvedBy,
          approvedOn: booking.approvedOn,
          notes: booking.notes
        });
        migrated++;
        console.log(`Migrated booking: ${booking.id}`);
      } catch (error) {
        const errorMessage = `Failed to migrate booking ${booking.id}: ${error}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    // If migration was successful, clear localStorage
    if (errors.length === 0) {
      localStorage.removeItem('slot_bookings');
      localStorage.removeItem('weekly_slots_config');
      console.log('Successfully migrated all slot booking data and cleared localStorage');
    }

    return { success: errors.length === 0, migrated, errors };
  } catch (error) {
    const errorMessage = `Migration failed: ${error}`;
    console.error(errorMessage);
    return { success: false, migrated, errors: [errorMessage] };
  }
};

// Function to clean up any remaining localStorage slot booking data
export const cleanupSlotBookingLocalStorage = (): void => {
  const keysToRemove = [
    'slot_bookings',
    'weekly_slots_config',
    'slot_booking_settings'
  ];

  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`Cleaned up localStorage key: ${key}`);
    }
  });
};
