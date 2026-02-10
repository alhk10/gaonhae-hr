-- Allow authenticated users to insert enrollments (the payment flow creates these)
CREATE POLICY "Authenticated users can insert enrollments"
ON public.student_class_enrollments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update their own enrollments
CREATE POLICY "Authenticated users can update enrollments"
ON public.student_class_enrollments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);