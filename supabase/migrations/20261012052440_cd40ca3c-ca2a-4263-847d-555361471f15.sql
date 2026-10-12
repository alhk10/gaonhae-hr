CREATE OR REPLACE FUNCTION public.convert_invoice_edit_overpayment_to_credit(
  p_invoice_id uuid,
  p_actor text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_overpayment numeric(12,2);
  v_reference text;
  v_existing numeric(12,2);
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() <> 'superadmin' THEN
    RAISE EXCEPTION 'Superadmin access required';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF v_invoice.student_id IS NULL THEN
    RAISE EXCEPTION 'Invoice has no student';
  END IF;

  v_overpayment := round(GREATEST(COALESCE(v_invoice.amount_paid, 0) - COALESCE(v_invoice.total_amount, 0), 0), 2);
  IF v_overpayment <= 0 THEN
    RETURN 0;
  END IF;

  v_reference := 'invoice-edit:' || v_invoice.id::text;

  SELECT amount INTO v_existing
  FROM public.student_credits
  WHERE type = 'overpayment' AND reference_id = v_reference
  LIMIT 1;

  IF v_existing IS NULL THEN
    INSERT INTO public.student_credits (
      student_id, amount, type, reference_id, description, created_by
    ) VALUES (
      v_invoice.student_id,
      v_overpayment,
      'overpayment',
      v_reference,
      'Overpayment after editing Invoice #' || v_invoice.invoice_number,
      COALESCE(NULLIF(p_actor, ''), auth.email(), 'superadmin')
    );
  ELSE
    v_overpayment := 0;
  END IF;

  UPDATE public.invoices
  SET balance_due = 0,
      status = CASE WHEN status = 'verified' THEN 'verified' ELSE 'paid' END,
      updated_at = now()
  WHERE id = p_invoice_id;

  IF v_overpayment > 0 THEN
    INSERT INTO public.invoice_change_logs (
      invoice_id, action, changes, changed_by, created_at
    ) VALUES (
      p_invoice_id,
      'field_updated',
      jsonb_build_object(
        'overpayment_credit', v_overpayment,
        'balance_due', jsonb_build_object('old', v_invoice.balance_due, 'new', 0),
        'reference_id', v_reference
      ),
      auth.uid(),
      now()
    );
  END IF;

  RETURN v_overpayment;
END;
$function$;

REVOKE ALL ON FUNCTION public.convert_invoice_edit_overpayment_to_credit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_invoice_edit_overpayment_to_credit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_invoice_edit_overpayment_to_credit(uuid, text) TO service_role;