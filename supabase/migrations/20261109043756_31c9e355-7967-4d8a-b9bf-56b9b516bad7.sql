CREATE OR REPLACE FUNCTION public.access_list_chat_messages(p_password text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_super boolean := public.is_superadmin(auth.jwt()->>'email'); v_scope text;
BEGIN
  IF NOT v_super THEN
    v_scope := _access_scope(p_password);
    IF v_scope IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'created_at', c.created_at, 'type', c.type, 'message', c.message,
      'name', coalesce(nullif(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')),''), c.name),
      'student_id', coalesce(c.matched_student_id, c.created_student_id),
      'branch_id', c.branch_id, 'branch_name', b.name,
      'contact_phone', c.contact_phone, 'contact_email', c.contact_email) ORDER BY c.created_at)
    FROM public_chat_callback_requests c
    LEFT JOIN students s ON s.id = coalesce(c.matched_student_id, c.created_student_id)
    LEFT JOIN branches b ON b.id::text = c.branch_id
    WHERE c.resolved_at IS NULL AND c.rejected_at IS NULL
      AND (c.type = 'general_callback' OR (c.type = 'no_match_request' AND c.message ILIKE 'Help find my account%'))
      AND coalesce(c.message,'') <> ''
      AND (v_super OR _scope_has(v_scope, c.branch_id))), '[]'::jsonb);
END $$;