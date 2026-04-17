-- Enable realtime for approval-source tables (idempotent)
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'student_update_requests',
    'student_withdrawal_requests',
    'invoice_deletion_requests',
    'payment_deletion_requests',
    'invoice_action_requests',
    'invoice_discount_approval_requests',
    'slot_booking_edit_requests',
    'slot_bookings_new',
    'grading_deletion_requests',
    'inventory_transfer_requests',
    'inventory_orders',
    'leave_requests',
    'claims'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- Skip if table doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END IF;
  END LOOP;
END $$;