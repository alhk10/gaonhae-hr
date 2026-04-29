-- Phase 4: P&L view sourced from posted journal lines
CREATE OR REPLACE VIEW public.v_pnl_lines AS
SELECT
  je.id            AS journal_id,
  je.entry_date,
  je.period,
  je.branch_id,
  je.country,
  je.status,
  jl.id            AS line_id,
  jl.account_id,
  coa.code         AS account_code,
  coa.name         AS account_name,
  coa.type         AS account_type,
  coa.subtype      AS account_subtype,
  coa.sort_order   AS account_sort_order,
  jl.debit,
  jl.credit,
  -- signed amount: income/liability/equity are credit-natural -> credit-debit
  -- expense/asset are debit-natural -> debit-credit
  CASE
    WHEN coa.type IN ('income','liability','equity') THEN (COALESCE(jl.credit,0) - COALESCE(jl.debit,0))
    ELSE (COALESCE(jl.debit,0) - COALESCE(jl.credit,0))
  END              AS signed_amount
FROM public.journal_lines jl
JOIN public.journal_entries je ON je.id = jl.journal_id
JOIN public.chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.status = 'posted'
  AND coa.type IN ('income','expense');

COMMENT ON VIEW public.v_pnl_lines IS 'Posted journal lines for income/expense accounts, with signed P&L amount.';

GRANT SELECT ON public.v_pnl_lines TO authenticated;