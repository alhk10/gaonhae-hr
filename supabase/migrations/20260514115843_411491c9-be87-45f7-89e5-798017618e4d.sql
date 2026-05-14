DELETE FROM public.payment_deletion_requests a
USING public.payment_deletion_requests b
WHERE a.status='pending' AND b.status='pending'
  AND a.payment_id=b.payment_id
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS payment_deletion_requests_one_pending_per_payment
  ON public.payment_deletion_requests(payment_id)
  WHERE status = 'pending';