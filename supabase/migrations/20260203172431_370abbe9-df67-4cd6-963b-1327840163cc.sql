-- Add policy for authenticated users to INSERT payments
CREATE POLICY "authenticated_insert_payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add policy for admins and superadmins to manage payments
CREATE POLICY "admins_manage_payments"
ON public.payments FOR ALL
TO authenticated
USING (
  get_current_user_role() IN ('superadmin', 'admin')
  OR has_sales_access()
)
WITH CHECK (
  get_current_user_role() IN ('superadmin', 'admin')
  OR has_sales_access()
);

-- Add policies for the receipts bucket (payment proofs)
-- Allow authenticated users to upload to receipts bucket
CREATE POLICY "Authenticated can upload to receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow public read access to receipts bucket
CREATE POLICY "Public read access to receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Allow authenticated users to update their receipts
CREATE POLICY "Authenticated can update receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');

-- Allow authenticated users to delete their receipts
CREATE POLICY "Authenticated can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');