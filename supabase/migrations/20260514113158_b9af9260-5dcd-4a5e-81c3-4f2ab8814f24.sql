UPDATE public.invoices
SET amount_paid = 0,
    balance_due = total_amount,
    status = 'unpaid'
WHERE id = 'bc591ad8-1429-4a9b-967e-028bee0b7571';