CREATE OR REPLACE FUNCTION public._tax_floor(x numeric) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT floor(COALESCE(x,0)*100 + 0.000001)/100 $$;
GRANT EXECUTE ON FUNCTION public._tax_floor(numeric) TO anon, authenticated, service_role;

DO $do$
DECLARE r record; d text; n text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
    WHERE ns.nspname='public' AND p.proname IN ('submit_public_chat_invoice','_studio_rental_quote','_studio_rental_create_invoice','resolve_public_amount')
  LOOP
    d := pg_get_functiondef(r.oid); n := d;
    n := replace(n, 'v_tax := round(v_line * v_gst_rate / (1 + v_gst_rate), 2)', 'v_tax := public._tax_floor(v_line * v_gst_rate / (1 + v_gst_rate))');
    n := replace(n, 'v_tax := round(v_line * v_gst_rate, 2)', 'v_tax := public._tax_floor(v_line * v_gst_rate)');
    n := replace(n, 'v_gst := round(v_rental * v_rate_gst / (1 + v_rate_gst), 2)', 'v_gst := public._tax_floor(v_rental * v_rate_gst / (1 + v_rate_gst))');
    n := replace(n, 'round(p_amount_net * v_rate, 2)', 'public._tax_floor(p_amount_net * v_rate)');
    n := replace(n, 'v_line_tax := round((v_line_total - v_discount) - ((v_line_total - v_discount) / (1 + v_tax_rate)), 2)', 'v_line_tax := public._tax_floor((v_line_total - v_discount) - ((v_line_total - v_discount) / (1 + v_tax_rate)))');
    n := replace(n, 'v_line_tax := round((v_line_total - v_discount) * v_tax_rate, 2)', 'v_line_tax := public._tax_floor((v_line_total - v_discount) * v_tax_rate)');
    n := replace(n, 'v_tax_amount := round(v_net_total * v_tax_rate, 2)', 'v_tax_amount := public._tax_floor(v_net_total * v_tax_rate)');
    IF n <> d THEN EXECUTE n; END IF;
  END LOOP;
END $do$;