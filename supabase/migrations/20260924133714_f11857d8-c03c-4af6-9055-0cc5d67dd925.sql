DROP FUNCTION IF EXISTS public.get_public_school_fees_list(text, text);
CREATE FUNCTION public.get_public_school_fees_list(p_branch_id text DEFAULT NULL, p_status text DEFAULT NULL)
 RETURNS TABLE(id uuid, created_at timestamptz, student_id uuid, student_name text, contact_name text, contact_email text, contact_dob text, reference_number text, branch_id text, branch_name text, category text, items jsonb, amount numeric, payment_method text, proof_url text, status text, invoice_id uuid, invoice_number text, invoice_status text, payment_id uuid, payment_number text, payment_verification_status text, source text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT * FROM (
  SELECT s.id, s.created_at, s.matched_student_id,
    COALESCE(NULLIF(UPPER(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,''))),''),
             NULLIF(UPPER(TRIM(COALESCE(s.items->0->>'contact_first_name','')||' '||COALESCE(s.items->0->>'contact_last_name',''))),'')),
    NULLIF(UPPER(TRIM(COALESCE(s.items->0->>'contact_first_name','')||' '||COALESCE(s.items->0->>'contact_last_name',''))),''),
    s.items->0->>'contact_email', s.items->0->>'contact_dob', s.reference_number, s.branch_id, b.name, s.category, s.items, s.amount,
    s.payment_method, s.proof_url, s.status, inv.id, inv.invoice_number, inv.status, pay.id, pay.payment_number, pay.verification_status,
    'submission'::text
  FROM public.public_chat_payment_submissions s
  LEFT JOIN public.students st ON st.id = s.matched_student_id
  LEFT JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN LATERAL (SELECT i.* FROM public.invoices i WHERE i.id = public._resolve_chat_submission_invoice(s)) inv ON true
  LEFT JOIN LATERAL (SELECT p.* FROM public.payments p WHERE p.invoice_id = inv.id ORDER BY p.created_at DESC LIMIT 1) pay ON true
  WHERE s.category = 'a416f120-4ec2-4826-8d37-375db3e002bc'
  UNION ALL
  SELECT i.id, i.created_at, i.student_id,
    NULLIF(UPPER(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,''))),''),
    NULL, st.email, st.date_of_birth::text, COALESCE(pay.payment_number, i.invoice_number), i.branch_id, b.name, NULL,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('product_id', ii.product_id, 'product_name', split_part(ii.description,' — ',1),
        'term_name', ii.metadata->>'term_name', 'qty', ii.quantity, 'unit_price', ii.unit_price))
      FROM public.invoice_items ii WHERE ii.invoice_id = i.id), '[]'::jsonb),
    i.total_amount, pay.payment_method, pay.proof_of_payment_url,
    CASE WHEN i.status='cancelled' THEN 'cancelled'
         WHEN pay.verification_status='rejected' THEN 'rejected'
         WHEN pay.verification_status='verified' OR i.status='verified' THEN 'verified'
         ELSE 'pending_verification' END,
    i.id, i.invoice_number, i.status, pay.id, pay.payment_number, pay.verification_status, 'hello'::text
  FROM public.invoices i
  LEFT JOIN public.students st ON st.id = i.student_id
  LEFT JOIN public.branches b ON b.id = i.branch_id
  LEFT JOIN LATERAL (SELECT p.* FROM public.payments p WHERE p.invoice_id = i.id AND p.payment_method <> 'credit' ORDER BY p.created_at DESC LIMIT 1) pay ON true
  WHERE i.created_by = 'public_hello_chat'
  ) x(id, created_at, student_id, student_name, contact_name, contact_email, contact_dob, reference_number, branch_id, branch_name, category, items, amount, payment_method, proof_url, status, invoice_id, invoice_number, invoice_status, payment_id, payment_number, payment_verification_status, source)
  WHERE (p_branch_id IS NULL OR x.branch_id = p_branch_id)
    AND (p_status IS NULL OR x.status = p_status)
  ORDER BY x.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_school_fees_list(text, text) TO anon, authenticated, service_role;

-- Lesson allowances for /hello invoices (staff invoices create these in the app)
CREATE OR REPLACE FUNCTION public.create_hello_invoice_item_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prod record; inv record; t record; v_term uuid;
BEGIN
  IF NEW.created_by IS DISTINCT FROM 'public_hello_chat' OR NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO prod FROM public.products WHERE id = NEW.product_id;
  IF NOT FOUND OR NOT COALESCE(prod.is_lesson,false) THEN RETURN NEW; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = NEW.invoice_id;
  IF inv.student_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.entitlements WHERE source_type='invoice_item' AND source_id = NEW.id) THEN RETURN NEW; END IF;
  BEGIN v_term := NULLIF(NEW.metadata->>'term_id','')::uuid; EXCEPTION WHEN others THEN v_term := NULL; END;
  SELECT start_date, end_date INTO t FROM public.term_calendars WHERE id = v_term;
  INSERT INTO public.entitlements(student_id, product_id, source_type, source_id, sessions_total, sessions_used, is_active, valid_from, valid_to, branch_scope, class_type_scope, notes)
  VALUES (inv.student_id, prod.id, 'invoice_item', NEW.id,
    CASE WHEN COALESCE(prod.session_count,0) > 0 THEN prod.session_count * COALESCE(NEW.quantity,1) ELSE COALESCE(NEW.quantity,1) END,
    0, true, COALESCE(t.start_date, current_date), t.end_date, inv.branch_id,
    array_to_string(prod.allowed_class_types, ','), 'Auto-created from invoice ' || inv.invoice_number);
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'hello entitlement failed: %', SQLERRM; RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_hello_invoice_item_entitlement() FROM anon, authenticated, public;
DROP TRIGGER IF EXISTS trg_hello_invoice_item_entitlement ON public.invoice_items;
CREATE TRIGGER trg_hello_invoice_item_entitlement AFTER INSERT ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.create_hello_invoice_item_entitlement();

-- Keep invoice status consistent when something sets 'paid' after all payments are verified
CREATE OR REPLACE FUNCTION public.promote_paid_invoice_to_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'paid' AND COALESCE(NEW.balance_due,0) <= 0.01
     AND EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = NEW.id)
     AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = NEW.id AND COALESCE(p.verification_status,'pending') <> 'verified') THEN
    NEW.status := 'verified';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.promote_paid_invoice_to_verified() FROM anon, authenticated, public;
DROP TRIGGER IF EXISTS trg_promote_paid_invoice_to_verified ON public.invoices;
CREATE TRIGGER trg_promote_paid_invoice_to_verified BEFORE INSERT OR UPDATE OF status, balance_due ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.promote_paid_invoice_to_verified();