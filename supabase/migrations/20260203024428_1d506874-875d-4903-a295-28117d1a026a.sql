-- Fix existing email mismatch for student 98f39118-cc2d-46a8-a2c1-9cab3108d9ae
UPDATE public.student_auth 
SET email = 'alvinleehk@gmail.com', updated_at = now()
WHERE student_id = '98f39118-cc2d-46a8-a2c1-9cab3108d9ae';