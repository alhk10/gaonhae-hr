CREATE TABLE public.invoice_discount_override_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  branch_id uuid,
  term_id uuid,
  invoice_id uuid,
  product_name text,
  discount_amount numeric,
  reason text,
  password_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  seen_by text
);
GRANT SELECT, UPDATE ON public.invoice_discount_override_log TO authenticated;
GRANT ALL ON public.invoice_discount_override_log TO service_role;
ALTER TABLE public.invoice_discount_override_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins read discount overrides" ON public.invoice_discount_override_log FOR SELECT TO authenticated USING (public.is_superadmin((auth.jwt() ->> 'email')));
CREATE POLICY "Superadmins update discount overrides" ON public.invoice_discount_override_log FOR UPDATE TO authenticated USING (public.is_superadmin((auth.jwt() ->> 'email')));

CREATE OR REPLACE FUNCTION public.log_discount_override(p_password text, p_student_id uuid, p_branch_id uuid, p_term_id uuid, p_product_name text, p_amount numeric, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text;
BEGIN
  IF coalesce(p_password,'') <> '' THEN
    SELECT label INTO v_label FROM access_unlock_passwords
      WHERE password_hash = encode(extensions.digest(p_password,'sha256'),'hex') LIMIT 1;
  END IF;
  IF v_label IS NULL THEN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
    v_label := coalesce(auth.jwt() ->> 'email', 'staff');
  END IF;
  INSERT INTO invoice_discount_override_log (student_id, branch_id, term_id, product_name, discount_amount, reason, password_label)
  VALUES (p_student_id, p_branch_id, p_term_id, left(p_product_name,200), p_amount, left(p_reason,500), v_label);
END $$;
REVOKE ALL ON FUNCTION public.log_discount_override(text,uuid,uuid,uuid,text,numeric,text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_discount_override(text,uuid,uuid,uuid,text,numeric,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_discount_overrides(p_password text)
RETURNS TABLE(id uuid, student_name text, branch_name text, term_name text, product_name text, discount_amount numeric, reason text, password_label text, created_at timestamptz, seen_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public._access_scope_read(p_password) IS DISTINCT FROM '*' THEN RAISE EXCEPTION 'All-branch password required'; END IF;
  RETURN QUERY SELECT o.id, trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')), b.name, t.name,
    o.product_name, o.discount_amount, o.reason, o.password_label, o.created_at, o.seen_at
  FROM invoice_discount_override_log o LEFT JOIN students s ON s.id=o.student_id
  LEFT JOIN branches b ON b.id=o.branch_id LEFT JOIN term_calendars t ON t.id=o.term_id
  ORDER BY o.created_at DESC LIMIT 300;
END $$;
GRANT EXECUTE ON FUNCTION public.access_discount_overrides(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_discount_override_mark_seen(p_password text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  UPDATE invoice_discount_override_log SET seen_at = now(), seen_by = 'access' WHERE id = p_id AND seen_at IS NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.access_discount_override_mark_seen(text,uuid) TO anon, authenticated;

-- True when the student already received a sibling discount on a class line for this term.
CREATE OR REPLACE FUNCTION public.sibling_discount_used(p_student_id uuid, p_term_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
    WHERE i.student_id = p_student_id AND coalesce(i.status,'') NOT IN ('cancelled','refunded')
      AND ii.metadata->>'term_id' = p_term_id::text
      AND (coalesce(ii.metadata->>'sibling_discount','') = 'true'
           OR coalesce((ii.metadata->>'sibling_discount_amount')::numeric,0) > 0
           OR (ii.metadata->'line_discount'->>'discount_type' = 'amount'
               AND coalesce((ii.metadata->'line_discount'->>'discount_value')::numeric,0) >= 20))
  );
$$;
GRANT EXECUTE ON FUNCTION public.sibling_discount_used(uuid,uuid) TO anon, authenticated;