CREATE OR REPLACE FUNCTION public.get_competition_tshirt_sizes()
RETURNS TABLE(submission_id uuid, tshirt_size text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, tshirt_size FROM competition_payment_submissions WHERE tshirt_size IS NOT NULL;
$$;
GRANT EXECUTE ON FUNCTION public.get_competition_tshirt_sizes() TO anon, authenticated;