ALTER TABLE public.invoice_discount_override_log ALTER COLUMN branch_id TYPE text USING branch_id::text;
DROP FUNCTION public.log_discount_override(text,uuid,uuid,uuid,text,numeric,text);
CREATE OR REPLACE FUNCTION public.log_discount_override(p_password text, p_student_id uuid, p_branch_id text, p_term_id uuid, p_product_name text, p_amount numeric, p_reason text)
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
REVOKE ALL ON FUNCTION public.log_discount_override(text,uuid,text,uuid,text,numeric,text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_discount_override(text,uuid,text,uuid,text,numeric,text) TO anon, authenticated;