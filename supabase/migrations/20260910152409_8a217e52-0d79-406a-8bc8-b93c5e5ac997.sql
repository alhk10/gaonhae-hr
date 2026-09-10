CREATE OR REPLACE FUNCTION public.remember_guards_purchase_email(p_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.guards_purchases;
BEGIN
  SELECT * INTO v_row FROM public.guards_purchases WHERE id = p_purchase_id;
  IF NOT FOUND OR v_row.matched_student_id IS NULL THEN RETURN; END IF;
  PERFORM public._remember_student_email(v_row.matched_student_id, v_row.email);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.remember_guards_purchase_email(uuid) TO anon, authenticated, service_role;