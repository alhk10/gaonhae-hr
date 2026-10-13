CREATE OR REPLACE FUNCTION public.get_access_invoice_catalog(p_branch_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'students', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'first_name', s.first_name, 'last_name', s.last_name, 'display_name', s.display_name,
        'email', s.email, 'branch_id', s.branch_id, 'status', s.status, 'current_belt', s.current_belt,
        'date_of_birth', s.date_of_birth, 'allowed_class_types', s.allowed_class_types,
        'credit_balance', COALESCE((SELECT sum(c.amount) FROM student_credits c WHERE c.student_id = s.id), 0),
        'sibling_count', CASE WHEN s.email IS NULL THEN 0 ELSE (SELECT count(*) FROM students s2 WHERE s2.email = s.email AND s2.status = 'active') END
      ) ORDER BY s.first_name) FROM students s WHERE p_branch_id IS NULL OR s.branch_id = p_branch_id), '[]'::jsonb),
    'products', COALESCE((SELECT jsonb_agg(to_jsonb(p) || jsonb_build_object('product_categories', jsonb_build_object('name', pc.name)) ORDER BY p.name)
      FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id WHERE p.is_active), '[]'::jsonb),
    'categories', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY sort_order) FROM product_categories WHERE is_active), '[]'::jsonb),
    'price_rules', COALESCE((SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'branch_id', branch_id, 'is_active', is_active, 'price_override', price_override)) FROM price_rules), '[]'::jsonb),
    'terms', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.start_date) FROM term_calendars t WHERE t.is_active AND (p_branch_id IS NULL OR t.branch_id = p_branch_id)), '[]'::jsonb),
    'timetables', COALESCE((SELECT jsonb_agg(to_jsonb(bt) ORDER BY bt.weekday, bt.start_time) FROM branch_timetables bt WHERE bt.is_active AND (p_branch_id IS NULL OR bt.branch_id = p_branch_id)), '[]'::jsonb),
    'grading_slots', COALESCE((SELECT jsonb_agg(to_jsonb(g) || jsonb_build_object('branches', jsonb_build_object('name', b.name)) ORDER BY g.grading_date DESC)
      FROM grading_slots g LEFT JOIN branches b ON b.id = g.branch_id WHERE g.status = 'active' AND g.grading_date >= current_date - 60), '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_access_invoice_catalog(text) TO anon, authenticated, service_role;