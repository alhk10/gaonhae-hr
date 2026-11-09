ALTER TABLE public.public_chat_callback_requests ADD COLUMN IF NOT EXISTS resolved_at timestamptz, ADD COLUMN IF NOT EXISTS resolved_note text, ADD COLUMN IF NOT EXISTS resolved_by text;

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
      AND c.type IN ('general_callback','help_find_account','callback')
      AND coalesce(c.message,'') <> ''
      AND (v_super OR _scope_has(v_scope, c.branch_id))), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.access_resolve_chat_message(p_password text, p_id uuid, p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_super boolean := public.is_superadmin(auth.jwt()->>'email'); v_scope text; v_branch text;
BEGIN
  SELECT branch_id INTO v_branch FROM public_chat_callback_requests WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF NOT v_super THEN
    v_scope := _access_scope(p_password);
    IF v_scope IS NULL OR NOT _scope_has(v_scope, v_branch) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  END IF;
  UPDATE public_chat_callback_requests SET resolved_at = now(), resolved_note = nullif(trim(p_note),''),
    resolved_by = CASE WHEN v_super THEN auth.jwt()->>'email' ELSE 'access:'||coalesce(v_scope,'') END
   WHERE id = p_id;
END $$;