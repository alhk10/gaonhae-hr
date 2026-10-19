CREATE TABLE IF NOT EXISTS public.access_unlock_passwords (
  password_hash text PRIMARY KEY,
  branch_id text
);
GRANT ALL ON public.access_unlock_passwords TO service_role;
ALTER TABLE public.access_unlock_passwords ENABLE ROW LEVEL SECURITY;
INSERT INTO public.access_unlock_passwords(password_hash, branch_id) VALUES
 (encode(extensions.digest('Hp97533488','sha256'),'hex'), NULL),
 (encode(extensions.digest('Hp96706488','sha256'),'hex'), 'balmoral'),
 (encode(extensions.digest('Hp89234866','sha256'),'hex'), 'bukit-merah'),
 (encode(extensions.digest('Hp84944041','sha256'),'hex'), 'kembangan'),
 (encode(extensions.digest('Hp84128821','sha256'),'hex'), 'yishun'),
 (encode(extensions.digest('Hp88769491','sha256'),'hex'), 'jurong-west')
ON CONFLICT DO NOTHING;

-- Returns '*' for all-branch, branch id for branch passwords; raises otherwise
CREATE OR REPLACE FUNCTION public._access_scope(p_password text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_branch text; v_found boolean;
BEGIN
  SELECT true, branch_id INTO v_found, v_branch FROM access_unlock_passwords
   WHERE password_hash = encode(extensions.digest(coalesce(p_password,''),'sha256'),'hex');
  IF NOT coalesce(v_found,false) THEN RAISE EXCEPTION 'Staff password required'; END IF;
  RETURN coalesce(v_branch,'*');
END $$;
REVOKE ALL ON FUNCTION public._access_scope(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._external_stock_move(p_invoice uuid, p_sign int, p_by text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_loc uuid; it record; v_type text := CASE WHEN p_sign < 0 THEN 'sell' ELSE 'return' END;
BEGIN
  IF EXISTS (SELECT 1 FROM inventory_movements WHERE reference_type='external_invoice' AND reference_id=p_invoice::text AND movement_type=v_type) THEN RETURN; END IF;
  SELECT l.id INTO v_loc FROM inventory_locations l JOIN invoices i ON i.branch_id=l.branch_id
   WHERE i.id=p_invoice AND l.is_active ORDER BY l.created_at LIMIT 1;
  IF v_loc IS NULL THEN RETURN; END IF;
  FOR it IN SELECT ii.product_id, ii.size_variant, ii.quantity FROM invoice_items ii JOIN products p ON p.id=ii.product_id
            WHERE ii.invoice_id=p_invoice AND coalesce(p.is_service,false)=false AND coalesce(p.is_lesson,false)=false LOOP
    UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + p_sign*it.quantity, updated_at=now(), updated_by=p_by
     WHERE product_id=it.product_id AND location_id=v_loc AND size_variant IS NOT DISTINCT FROM it.size_variant;
    IF NOT FOUND THEN
      INSERT INTO inventory_items(product_id, location_id, size_variant, quantity_on_hand, quantity_reserved, created_by)
      VALUES (it.product_id, v_loc, it.size_variant, p_sign*it.quantity, 0, p_by);
    END IF;
    INSERT INTO inventory_movements(product_id, location_id, size_variant, movement_type, quantity_delta, reference_type, reference_id, reason, created_by)
    VALUES (it.product_id, v_loc, it.size_variant, v_type, p_sign*it.quantity, 'external_invoice', p_invoice::text,
      CASE WHEN p_sign<0 THEN 'External invoice sale' ELSE 'External invoice cancelled' END, p_by);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public._external_stock_move(uuid,int,text) FROM PUBLIC, anon, authenticated;

-- Restock + record refund whenever an external invoice becomes cancelled (any path)
CREATE OR REPLACE FUNCTION public.trg_external_invoice_cancelled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.customer_type='external' AND NEW.status='cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    PERFORM _external_stock_move(NEW.id, 1, coalesce(NEW.updated_by,'system'));
    IF coalesce(OLD.amount_paid,0) > 0 THEN
      NEW.refunded_amount := coalesce(NEW.refunded_amount,0) + OLD.amount_paid;
      NEW.internal_notes := concat_ws(E'\n', NEW.internal_notes, 'Refund owed to customer: $' || to_char(OLD.amount_paid,'FM999990.00'));
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS external_invoice_cancelled ON public.invoices;
CREATE TRIGGER external_invoice_cancelled BEFORE UPDATE OF status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_external_invoice_cancelled();

DROP FUNCTION IF EXISTS public.list_external_invoices(text);
DROP FUNCTION IF EXISTS public.record_external_invoice_payment(uuid,numeric,text,text,text);
DROP FUNCTION IF EXISTS public.create_external_invoice(jsonb);

CREATE FUNCTION public.list_external_invoices(p_password text, p_branch_id text DEFAULT NULL)
RETURNS TABLE(id uuid, invoice_number text, customer_name text, customer_category text, customer_email text, customer_phone text, customer_reference text, branch_id text, branch_name text, status text, total_amount numeric, amount_paid numeric, balance_due numeric, issue_date date, items text, proof_url text, pending_payment boolean, cancel_requested boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_scope text := _access_scope(p_password);
BEGIN
  RETURN QUERY
  SELECT i.id, i.invoice_number, i.customer_name, i.customer_category, i.customer_email, i.customer_phone, i.customer_reference,
    i.branch_id, b.name, i.status, i.total_amount, i.amount_paid, i.balance_due, i.issue_date,
    (SELECT string_agg(ii.quantity || 'x ' || ii.description, ', ') FROM invoice_items ii WHERE ii.invoice_id=i.id),
    (SELECT p.proof_of_payment_url FROM payments p WHERE p.invoice_id=i.id AND p.proof_of_payment_url IS NOT NULL ORDER BY p.created_at DESC LIMIT 1),
    EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id=i.id AND p.verification_status='pending'),
    EXISTS (SELECT 1 FROM invoice_action_requests r WHERE r.invoice_id=i.id AND r.status='pending' AND r.action_type='cancellation')
  FROM invoices i LEFT JOIN branches b ON b.id=i.branch_id
  WHERE i.customer_type='external'
    AND (v_scope='*' OR i.branch_id=v_scope)
    AND (p_branch_id IS NULL OR i.branch_id=p_branch_id)
  ORDER BY i.created_at DESC LIMIT 500;
END $$;

CREATE FUNCTION public.create_external_invoice(p_password text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_scope text := _access_scope(p_password);
  v_name text := upper(trim(coalesce(p_payload->>'customer_name','')));
  v_cat text := coalesce(nullif(p_payload->>'customer_category',''),'retail');
  v_branch text := nullif(p_payload->>'branch_id','');
  v_country text; v_rate numeric; v_incl boolean;
  v_item jsonb; v_line numeric; v_tax_line numeric; v_sub numeric := 0; v_tax numeric := 0; v_total numeric;
  v_inv uuid; v_num text; v_prod record; v_qty int; v_price numeric;
  v_by text := CASE WHEN v_scope='*' THEN 'access (all branches)' ELSE 'access (' || v_scope || ')' END;
BEGIN
  IF v_name = '' THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF v_cat NOT IN ('trial','school_club','retail') THEN RAISE EXCEPTION 'Invalid customer category'; END IF;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Branch is required'; END IF;
  IF v_scope <> '*' AND v_branch <> v_scope THEN RAISE EXCEPTION 'You can only invoice for your own branch'; END IF;
  IF p_payload->'items' IS NULL OR jsonb_array_length(p_payload->'items')=0 THEN RAISE EXCEPTION 'Add at least one item'; END IF;
  SELECT country INTO v_country FROM branches WHERE id=v_branch;
  IF NOT FOUND THEN RAISE EXCEPTION 'Branch not found'; END IF;
  v_rate := CASE v_country WHEN 'Singapore' THEN 0.09 WHEN 'Australia' THEN 0.10 ELSE 0 END;
  v_incl := v_country = 'Australia';
  v_num := _next_invoice_number();
  INSERT INTO invoices(invoice_number, student_id, customer_type, customer_category, customer_name, customer_email, customer_phone, customer_reference,
    branch_id, status, issue_date, due_date, payment_terms_days, notes, created_by)
  VALUES (v_num, NULL, 'external', v_cat, v_name, nullif(lower(trim(p_payload->>'customer_email')),''), nullif(trim(p_payload->>'customer_phone'),''),
    nullif(trim(p_payload->>'customer_reference'),''), v_branch, 'unpaid', current_date, current_date + 14, 14, nullif(p_payload->>'notes',''), v_by)
  RETURNING id INTO v_inv;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
    SELECT id, name INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
    v_qty := greatest(coalesce((v_item->>'quantity')::int,1),1);
    v_price := greatest(coalesce((v_item->>'unit_price')::numeric,0),0);
    v_line := v_qty * v_price;
    IF v_incl THEN v_tax_line := v_line - v_line/(1+v_rate); v_sub := v_sub + v_line - v_tax_line;
    ELSE v_tax_line := v_line*v_rate; v_sub := v_sub + v_line; END IF;
    v_tax := v_tax + v_tax_line;
    INSERT INTO invoice_items(invoice_id, product_id, size_variant, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by)
    VALUES (v_inv, v_prod.id, nullif(v_item->>'size_variant',''), v_prod.name || coalesce(' ('||nullif(v_item->>'size_variant','')||')',''),
      v_qty, v_price, v_rate, round(v_tax_line,2), round(CASE WHEN v_incl THEN v_line ELSE v_line + v_tax_line END,2), v_by);
  END LOOP;
  v_total := round(v_sub + v_tax, 2);
  UPDATE invoices SET subtotal=round(v_sub,2), tax_amount=round(v_tax,2), total_amount=v_total, balance_due=v_total WHERE id=v_inv;
  PERFORM _external_stock_move(v_inv, -1, v_by);
  RETURN jsonb_build_object('invoice_id', v_inv, 'invoice_number', v_num);
END $$;

CREATE FUNCTION public.record_external_invoice_payment(p_password text, p_invoice_id uuid, p_amount numeric, p_method text, p_reference text, p_proof_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE; v_paid numeric; v_cash boolean := p_method='cash';
  v_by text := CASE WHEN v_scope='*' THEN 'access (all branches)' ELSE 'access (' || v_scope || ')' END;
BEGIN
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id AND customer_type='external' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'External invoice not found'; END IF;
  IF v_scope <> '*' AND v_inv.branch_id <> v_scope THEN RAISE EXCEPTION 'Not your branch'; END IF;
  IF v_inv.status='cancelled' THEN RAISE EXCEPTION 'Invoice is cancelled'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > v_inv.balance_due + 0.005 THEN RAISE EXCEPTION 'Amount must be between 0 and the balance due'; END IF;
  IF p_method NOT IN ('cash','card','bank_transfer','paynow','cheque') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_method IN ('paynow','bank_transfer') AND nullif(trim(p_proof_url),'') IS NULL THEN RAISE EXCEPTION 'Proof of payment image is required'; END IF;
  IF p_proof_url IS NOT NULL AND p_proof_url ~* '\.pdf$' THEN RAISE EXCEPTION 'Proof must be an image, not a PDF'; END IF;
  INSERT INTO payments(invoice_id, payment_number, payment_method, amount, payment_date, reference_number, proof_of_payment_url, processed_by, created_by,
    is_verified, verification_status, verified_by, verified_at)
  VALUES (p_invoice_id, 'PAY-EXT-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text,1,6), p_method, round(p_amount,2), current_date,
    nullif(trim(p_reference),''), nullif(trim(p_proof_url),''), v_by, v_by,
    v_cash, CASE WHEN v_cash THEN 'verified' ELSE 'pending' END, CASE WHEN v_cash THEN v_by END, CASE WHEN v_cash THEN now() END);
  v_paid := v_inv.amount_paid + round(p_amount,2);
  UPDATE invoices SET amount_paid=v_paid, balance_due=greatest(total_amount - v_paid,0),
    status = CASE WHEN total_amount - v_paid <= 0.005 THEN 'paid' ELSE 'partially_paid' END, updated_at=now(), updated_by=v_by
  WHERE id=p_invoice_id;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_external_invoice(p_password text, p_invoice_id uuid, p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE;
  v_by text := CASE WHEN v_scope='*' THEN 'access (all branches)' ELSE 'access (' || v_scope || ')' END;
BEGIN
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id AND customer_type='external' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'External invoice not found'; END IF;
  IF v_scope <> '*' AND v_inv.branch_id <> v_scope THEN RAISE EXCEPTION 'Not your branch'; END IF;
  IF v_inv.status='cancelled' THEN RAISE EXCEPTION 'Invoice is already cancelled'; END IF;
  IF v_scope = '*' THEN
    UPDATE invoices SET status='cancelled', balance_due=0, updated_at=now(), updated_by=v_by,
      internal_notes=concat_ws(E'\n', internal_notes, 'Cancelled by ' || v_by || coalesce(': ' || nullif(trim(p_reason),''),''))
    WHERE id=p_invoice_id;
    RETURN 'cancelled';
  END IF;
  INSERT INTO invoice_action_requests(invoice_id, action_type, request_data, requested_by, invoice_number, student_name, status)
  VALUES (p_invoice_id, 'cancellation', jsonb_build_object('reason', left(coalesce(p_reason,''),500), 'external', true), v_by, v_inv.invoice_number, v_inv.customer_name, 'pending');
  RETURN 'requested';
END $$;

REVOKE ALL ON FUNCTION public.list_external_invoices(text,text), public.create_external_invoice(text,jsonb),
  public.record_external_invoice_payment(text,uuid,numeric,text,text,text), public.cancel_external_invoice(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_external_invoices(text,text), public.create_external_invoice(text,jsonb),
  public.record_external_invoice_payment(text,uuid,numeric,text,text,text), public.cancel_external_invoice(text,uuid,text) TO anon, authenticated;