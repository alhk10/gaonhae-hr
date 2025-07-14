
-- Update the check constraint on slot_bookings_new table to include 'cancelled' status
ALTER TABLE slot_bookings_new DROP CONSTRAINT IF EXISTS slot_bookings_new_status_check;

ALTER TABLE slot_bookings_new ADD CONSTRAINT slot_bookings_new_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed'));
