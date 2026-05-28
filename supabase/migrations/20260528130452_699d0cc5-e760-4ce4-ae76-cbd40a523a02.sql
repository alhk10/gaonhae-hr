DROP POLICY IF EXISTS "Public can read guards purchase insert result" ON public.guards_purchases;

CREATE POLICY "Public can read guards purchase insert result"
ON public.guards_purchases
FOR SELECT
TO anon, authenticated
USING (
  current_setting('request.method', true) = 'POST'
);

GRANT SELECT ON public.guards_purchases TO anon, authenticated;