CREATE OR REPLACE FUNCTION public.access_bank_payers(p_password text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public._access_require_all(p_password);
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'payer_name', a.payer_name, 'student_id', a.student_id,
     'student_name', coalesce(nullif(trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')),''), a.customer_name || ' (external)'), 'created_by', a.created_by, 'created_at', a.created_at)
     ORDER BY a.payer_name, coalesce(s.first_name, a.customer_name))
   FROM public.bank_payer_aliases a LEFT JOIN public.students s ON s.id = a.student_id), '[]'::jsonb);
END $function$;