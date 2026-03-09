CREATE INDEX IF NOT EXISTS idx_student_auth_auth_user_id ON public.student_auth (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_student_auth_email ON public.student_auth (email);