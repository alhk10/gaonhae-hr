CREATE OR REPLACE FUNCTION public.get_public_guards_purchase_list()
RETURNS TABLE(
  id uuid,
  reference_number text,
  first_name text,
  last_name text,
  date_of_birth date,
  branch_id text,
  branch_name text,
  gender text,
  current_belt text,
  email text,
  phone text,
  items jsonb,
  subtotal numeric,
  gst_amount numeric,
  total numeric,
  payment_method text,
  proof_url text,
  sale_status text,
  collected boolean,
  collected_at timestamptz,
  collected_by text,
  matched_student_id uuid,
  invoice_id uuid,
  notes text,
  variant_selections jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gp.id, gp.reference_number, gp.first_name, gp.last_name, gp.date_of_birth,
    gp.branch_id, b.name AS branch_name, gp.gender, gp.current_belt, gp.email, gp.phone,
    gp.items, gp.subtotal, gp.gst_amount, gp.total, gp.payment_method, gp.proof_url,
    gp.sale_status, gp.collected, gp.collected_at, gp.collected_by,
    gp.matched_student_id, gp.invoice_id, gp.notes, gp.variant_selections,
    gp.created_at, gp.updated_at
  FROM public.guards_purchases gp
  LEFT JOIN public.branches b ON b.id = gp.branch_id
  ORDER BY gp.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_guards_purchase_list() TO anon, authenticated;