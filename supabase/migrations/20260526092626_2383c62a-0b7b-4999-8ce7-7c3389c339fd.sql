
INSERT INTO public.products (sku, name, description, base_price, tax_rate, is_active, kind)
SELECT * FROM (VALUES
  ('COMP-SOP-COACH'::text, 'Singapore Open Poomsae — Coaching Fee'::text, 'Coaching fee for the Singapore Open Poomsae competition'::text, 100.00::numeric, 9::numeric, true, 'competition'::text),
  ('COMP-SOP-IND', 'Singapore Open Poomsae — Category: Individual', 'Singapore Open Poomsae event category: Individual', 90.00, 9, true, 'competition'),
  ('COMP-SOP-PAIR', 'Singapore Open Poomsae — Category: Pair', 'Singapore Open Poomsae event category: Pair', 90.00, 9, true, 'competition'),
  ('COMP-SOP-TEAM', 'Singapore Open Poomsae — Category: Team', 'Singapore Open Poomsae event category: Team', 90.00, 9, true, 'competition')
) AS v(sku, name, description, base_price, tax_rate, is_active, kind)
WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.name = v.name);
