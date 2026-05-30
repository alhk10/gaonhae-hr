CREATE POLICY "Staff with branch access can read guards purchases"
ON public.guards_purchases
FOR SELECT
TO authenticated
USING (has_branch_access(branch_id));

CREATE POLICY "Staff with branch access can update guards purchases"
ON public.guards_purchases
FOR UPDATE
TO authenticated
USING (has_branch_access(branch_id))
WITH CHECK (has_branch_access(branch_id));