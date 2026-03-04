-- Add signature_url column to student_registrations
ALTER TABLE public.student_registrations ADD COLUMN IF NOT EXISTS signature_url text;

-- Create storage bucket for student signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('student-signatures', 'student-signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public uploads to student-signatures bucket (for unauthenticated registration form)
CREATE POLICY "Allow public uploads to student-signatures"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'student-signatures');

-- Allow public reads from student-signatures bucket
CREATE POLICY "Allow public reads from student-signatures"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'student-signatures');