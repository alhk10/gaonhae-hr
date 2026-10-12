REVOKE EXECUTE ON FUNCTION public.convert_invoice_edit_overpayment_to_credit(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.convert_invoice_edit_overpayment_to_credit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_invoice_edit_overpayment_to_credit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_invoice_edit_overpayment_to_credit(uuid, text) TO service_role;