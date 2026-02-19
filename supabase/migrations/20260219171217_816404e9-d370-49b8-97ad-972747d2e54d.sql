ALTER TABLE public.invoices DROP CONSTRAINT invoices_status_check;

ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK (status = ANY (ARRAY['draft'::text, 'issued'::text, 'paid'::text, 'partially_paid'::text, 'overdue'::text, 'void'::text, 'cancelled'::text, 'verified'::text, 'sent'::text, 'unpaid'::text, 'partial'::text, 'replaced'::text]));