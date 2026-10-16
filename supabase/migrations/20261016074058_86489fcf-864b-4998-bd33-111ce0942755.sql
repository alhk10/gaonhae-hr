ALTER TABLE public.invoice_action_requests DROP CONSTRAINT IF EXISTS invoice_action_requests_status_check;
ALTER TABLE public.invoice_action_requests ADD CONSTRAINT invoice_action_requests_status_check CHECK (status IN ('pending','approved','rejected','superseded'));

CREATE OR REPLACE FUNCTION public.prevent_duplicate_invoice_action_request()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_new_ids text[];
BEGIN
  IF NEW.status <> 'pending' OR NEW.invoice_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.action_type = 'item_refund' THEN
    v_new_ids := ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.request_data->'item_ids', jsonb_build_array(NEW.request_data->>'item_id'))));
    IF EXISTS (
      SELECT 1 FROM invoice_action_requests r
      WHERE r.invoice_id = NEW.invoice_id AND r.status='pending' AND r.action_type='item_refund'
        AND ARRAY(SELECT jsonb_array_elements_text(COALESCE(r.request_data->'item_ids', jsonb_build_array(r.request_data->>'item_id')))) && v_new_ids
    ) THEN RAISE EXCEPTION 'A refund request is already pending for this item'; END IF;
  ELSIF NEW.action_type IN ('adjustment','cancellation','credit_refund','overpayment_credit') THEN
    IF EXISTS (SELECT 1 FROM invoice_action_requests r WHERE r.invoice_id = NEW.invoice_id AND r.status='pending' AND r.action_type = NEW.action_type) THEN
      RAISE EXCEPTION 'A request is already pending for this invoice';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_prevent_duplicate_invoice_action_request ON public.invoice_action_requests;
CREATE TRIGGER trg_prevent_duplicate_invoice_action_request BEFORE INSERT ON public.invoice_action_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_invoice_action_request();

CREATE OR REPLACE FUNCTION public.prevent_duplicate_invoice_deletion_request()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' AND EXISTS (SELECT 1 FROM invoice_deletion_requests WHERE invoice_id = NEW.invoice_id AND status='pending') THEN
    RAISE EXCEPTION 'A delete request is already pending for this invoice';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_prevent_duplicate_invoice_deletion_request ON public.invoice_deletion_requests;
CREATE TRIGGER trg_prevent_duplicate_invoice_deletion_request BEFORE INSERT ON public.invoice_deletion_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_invoice_deletion_request();

CREATE OR REPLACE FUNCTION public.get_invoice_pending_requests(p_invoice_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'edit_pending', EXISTS (SELECT 1 FROM invoice_action_requests WHERE invoice_id = p_invoice_id AND status='pending' AND action_type='adjustment'),
    'cancel_pending', EXISTS (SELECT 1 FROM invoice_action_requests WHERE invoice_id = p_invoice_id AND status='pending' AND action_type='cancellation'),
    'delete_pending', EXISTS (SELECT 1 FROM invoice_deletion_requests WHERE invoice_id = p_invoice_id AND status='pending'),
    'refund_item_ids', COALESCE((SELECT jsonb_agg(DISTINCT x) FROM invoice_action_requests r,
        jsonb_array_elements_text(COALESCE(r.request_data->'item_ids', jsonb_build_array(r.request_data->>'item_id'))) x
        WHERE r.invoice_id = p_invoice_id AND r.status='pending' AND r.action_type='item_refund'), '[]'::jsonb));
$$;