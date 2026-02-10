-- Add passport photo column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;

-- Create storage bucket for student passport photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload student photos
CREATE POLICY "Authenticated users can upload student photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-photos' AND auth.role() = 'authenticated');

-- Allow public read access to student photos
CREATE POLICY "Student photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

-- Allow authenticated users to update/delete student photos
CREATE POLICY "Authenticated users can update student photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'student-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete student photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'student-photos' AND auth.role() = 'authenticated');