CREATE OR REPLACE FUNCTION public._activate_trial_for_invoice(p_invoice uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_student uuid;
BEGIN
  SELECT i.student_id INTO v_student FROM invoices i
   WHERE i.id=p_invoice AND i.student_id IS NOT NULL AND coalesce(i.status,'') <> 'cancelled'
     AND EXISTS (SELECT 1 FROM invoice_items ii JOIN products p ON p.id=ii.product_id
                 JOIN product_categories pc ON pc.id=p.category_id
                 WHERE ii.invoice_id=i.id AND lower(pc.name)='classes'
                   AND coalesce(ii.metadata->>'refunded','false') <> 'true');
  IF v_student IS NULL THEN RETURN; END IF;
  UPDATE students SET status='active', updated_at=now(), updated_by='auto: class invoiced'
   WHERE id=v_student AND status='trial';
  IF FOUND THEN
    INSERT INTO student_change_logs(student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (v_student, 'auto_status_change', 'status', 'trial', 'active', 'Auto: class product invoiced');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public._activate_trial_for_invoice(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_items_activate_trial() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _activate_trial_for_invoice(NEW.invoice_id); RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.trg_invoices_activate_trial() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _activate_trial_for_invoice(NEW.id); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS invoice_items_activate_trial ON public.invoice_items;
CREATE TRIGGER invoice_items_activate_trial AFTER INSERT OR UPDATE OF product_id, invoice_id ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_items_activate_trial();
DROP TRIGGER IF EXISTS invoices_activate_trial ON public.invoices;
CREATE TRIGGER invoices_activate_trial AFTER UPDATE OF status, student_id ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_invoices_activate_trial();

CREATE OR REPLACE FUNCTION public.auto_inactivate_stale_trials()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
  WITH stale AS (
    SELECT s.id FROM students s
    WHERE s.status='trial'
      AND greatest(
        coalesce(s.trial_date::timestamptz, s.created_at),
        (SELECT max(i.created_at) FROM invoices i WHERE i.student_id=s.id),
        (SELECT max(p.created_at) FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE i.student_id=s.id)
      ) < now() - interval '14 days'
  ), upd AS (
    UPDATE students s SET status='inactive', updated_at=now(), updated_by='auto: trial expired'
    FROM stale WHERE s.id=stale.id AND s.status='trial' RETURNING s.id
  )
  INSERT INTO student_change_logs(student_id, action, field_name, old_value, new_value, changed_by)
  SELECT id, 'auto_status_change', 'status', 'trial', 'inactive', 'Auto: 14 days without invoice/payment' FROM upd;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.auto_inactivate_stale_trials() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('auto-inactivate-stale-trials') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='auto-inactivate-stale-trials');
SELECT cron.schedule('auto-inactivate-stale-trials', '0 19 * * *', $$SELECT public.auto_inactivate_stale_trials();$$);