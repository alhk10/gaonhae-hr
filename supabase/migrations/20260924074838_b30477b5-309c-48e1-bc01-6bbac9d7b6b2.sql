ALTER TABLE public.invoice_action_requests
  DROP CONSTRAINT invoice_action_requests_action_type_check;

ALTER TABLE public.invoice_action_requests
  ADD CONSTRAINT invoice_action_requests_action_type_check
  CHECK (action_type IN ('adjustment', 'cancellation', 'item_refund', 'credit_refund'));