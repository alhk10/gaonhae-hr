GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
GRANT SELECT ON public.claim_types TO authenticated;
GRANT ALL ON public.claim_types TO service_role;