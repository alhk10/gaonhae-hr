CREATE TABLE public.branch_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id text NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  direction text NOT NULL DEFAULT 'out',
  category text,
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  receipt_path text,
  remark text,
  created_by_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.branch_journal_entries TO service_role;
ALTER TABLE public.branch_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access" ON public.branch_journal_entries FOR SELECT TO authenticated USING (false);
CREATE INDEX ON public.branch_journal_entries(branch_id, entry_date);

CREATE OR REPLACE FUNCTION public._bje_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.direction NOT IN ('in','out') THEN RAISE EXCEPTION 'Direction must be in or out'; END IF;
  IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Amount must be above zero'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER bje_validate BEFORE INSERT OR UPDATE ON public.branch_journal_entries FOR EACH ROW EXECUTE FUNCTION public._bje_validate();

-- carry over old manual P&L entries
INSERT INTO public.branch_journal_entries(branch_id, entry_date, direction, category, description, amount, created_by_label, created_at)
SELECT branch_id, make_date(year, month, 1), CASE WHEN type='revenue' THEN 'in' ELSE 'out' END,
  coalesce(nullif(subcategory,''), category), coalesce(description,''), abs(amount), coalesce(created_by,'Branch P&L import'), created_at
FROM public.branch_profit_loss_entries
WHERE branch_id IS NOT NULL AND amount IS NOT NULL AND amount <> 0 AND year BETWEEN 2000 AND 2100 AND month BETWEEN 1 AND 12;

CREATE OR REPLACE FUNCTION public._journal_require_all(p_password text) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF _access_scope(p_password) <> '*' THEN RAISE EXCEPTION 'Only the all-branch password can use Finance'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.access_branch_journal(p_password text, p_branch_id text, p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_open numeric; v_rows jsonb;
BEGIN
  PERFORM _journal_require_all(p_password);
  WITH lines AS (
    SELECT p.id, 'auto'::text kind, p.payment_date d, 'in'::text dir, p.amount amt,
      'Payment ('||coalesce(p.payment_method,'')||') — '||coalesce(s.full_name, i.customer_name, '') descr,
      i.invoice_number ref, 'Payment'::text cat, p.notes remark, p.created_at ts, null::text receipt
    FROM payments p JOIN invoices i ON i.id=p.invoice_id LEFT JOIN students s ON s.id=i.student_id
    WHERE i.branch_id=p_branch_id AND coalesce(p.verification_status,'verified') <> 'rejected' AND p.amount > 0
    UNION ALL
    SELECT c.id, 'auto', c.created_at::date, 'out', abs(c.amount),
      'Credit refunded — '||coalesce(s.full_name,''), c.reference_id, 'Refund', c.description, c.created_at, null
    FROM student_credits c JOIN students s ON s.id=c.student_id
    WHERE c.type='refund' AND s.branch_id=p_branch_id
    UNION ALL
    SELECT e.id, 'manual', e.entry_date, e.direction, e.amount, e.description, null, e.category, e.remark, e.created_at, e.receipt_path
    FROM branch_journal_entries e WHERE e.branch_id=p_branch_id
  )
  SELECT coalesce(sum(CASE WHEN dir='in' THEN amt ELSE -amt END),0) INTO v_open FROM lines WHERE d < p_from;
  WITH lines AS (
    SELECT p.id, 'auto'::text kind, p.payment_date d, 'in'::text dir, p.amount amt,
      'Payment ('||coalesce(p.payment_method,'')||') — '||coalesce(s.full_name, i.customer_name, '') descr,
      i.invoice_number ref, 'Payment'::text cat, p.notes remark, p.created_at ts, null::text receipt
    FROM payments p JOIN invoices i ON i.id=p.invoice_id LEFT JOIN students s ON s.id=i.student_id
    WHERE i.branch_id=p_branch_id AND coalesce(p.verification_status,'verified') <> 'rejected' AND p.amount > 0
      AND p.payment_date BETWEEN p_from AND p_to
    UNION ALL
    SELECT c.id, 'auto', c.created_at::date, 'out', abs(c.amount),
      'Credit refunded — '||coalesce(s.full_name,''), c.reference_id, 'Refund', c.description, c.created_at, null
    FROM student_credits c JOIN students s ON s.id=c.student_id
    WHERE c.type='refund' AND s.branch_id=p_branch_id AND c.created_at::date BETWEEN p_from AND p_to
    UNION ALL
    SELECT e.id, 'manual', e.entry_date, e.direction, e.amount, e.description, null, e.category, e.remark, e.created_at, e.receipt_path
    FROM branch_journal_entries e WHERE e.branch_id=p_branch_id AND e.entry_date BETWEEN p_from AND p_to
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'date',d,'direction',dir,'amount',amt,'description',descr,
    'reference',ref,'category',cat,'remark',remark,'receipt_path',receipt) ORDER BY d, ts, id),'[]'::jsonb) INTO v_rows FROM lines;
  RETURN jsonb_build_object('opening_balance', v_open, 'rows', v_rows);
END $$;

CREATE OR REPLACE FUNCTION public.access_branch_journal_upsert(p_password text, p_entry jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid := nullif(p_entry->>'id','')::uuid;
BEGIN
  PERFORM _journal_require_all(p_password);
  IF NOT EXISTS (SELECT 1 FROM branches WHERE id::text = p_entry->>'branch_id') THEN RAISE EXCEPTION 'Unknown branch'; END IF;
  IF v_id IS NULL THEN
    INSERT INTO branch_journal_entries(branch_id, entry_date, direction, category, description, amount, receipt_path, remark, created_by_label)
    VALUES (p_entry->>'branch_id', (p_entry->>'entry_date')::date, p_entry->>'direction', nullif(p_entry->>'category',''),
      coalesce(p_entry->>'description',''), (p_entry->>'amount')::numeric, nullif(p_entry->>'receipt_path',''), nullif(p_entry->>'remark',''), 'access')
    RETURNING id INTO v_id;
  ELSE
    UPDATE branch_journal_entries SET entry_date=(p_entry->>'entry_date')::date, direction=p_entry->>'direction',
      category=nullif(p_entry->>'category',''), description=coalesce(p_entry->>'description',''), amount=(p_entry->>'amount')::numeric,
      receipt_path=coalesce(nullif(p_entry->>'receipt_path',''), receipt_path), remark=nullif(p_entry->>'remark','')
    WHERE id=v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.access_branch_journal_delete(p_password text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM _journal_require_all(p_password);
  DELETE FROM branch_journal_entries WHERE id=p_id;
END $$;

GRANT EXECUTE ON FUNCTION public.access_branch_journal(text,text,date,date), public.access_branch_journal_upsert(text,jsonb), public.access_branch_journal_delete(text,uuid) TO anon, authenticated;

-- remove old finance
DROP TABLE IF EXISTS public.journal_lines, public.journal_entries, public.chart_of_accounts, public.tax_returns, public.tax_codes,
  public.fiscal_periods, public.branch_profit_loss_entries, public.pl_categories, public.published_pl_reports, public.accounting_backfill_runs CASCADE;
DROP FUNCTION IF EXISTS public.journal_entries_validate_balanced() CASCADE;