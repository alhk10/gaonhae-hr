
CREATE OR REPLACE VIEW public.v_ledger_lines AS
SELECT
  jl.id AS line_id,
  jl.journal_id,
  jl.line_no,
  jl.account_id,
  coa.code AS account_code,
  coa.name AS account_name,
  coa.type AS account_type,
  coa.subtype AS account_subtype,
  coa.country AS account_country,
  jl.description AS line_description,
  jl.debit,
  jl.credit,
  jl.tax_code_id,
  jl.tax_amount,
  jl.tax_base_amount,
  jl.branch_id AS line_branch_id,
  jl.contact_type,
  jl.contact_ref,
  je.id AS entry_id,
  je.entry_number,
  je.entry_date,
  je.period,
  je.country AS entry_country,
  je.branch_id AS entry_branch_id,
  je.source_type,
  je.source_id,
  je.narration,
  je.reference,
  je.status AS entry_status,
  je.posted_at
FROM public.journal_lines jl
JOIN public.journal_entries je ON je.id = jl.journal_id
JOIN public.chart_of_accounts coa ON coa.id = jl.account_id;

GRANT SELECT ON public.v_ledger_lines TO anon, authenticated;
