ALTER TABLE public.public_chat_callback_requests
  ADD COLUMN IF NOT EXISTS matched_student_id uuid,
  ADD COLUMN IF NOT EXISTS created_student_id uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS current_belt text;

CREATE INDEX IF NOT EXISTS idx_pccr_matched_student ON public.public_chat_callback_requests(matched_student_id);
CREATE INDEX IF NOT EXISTS idx_pccr_branch ON public.public_chat_callback_requests(branch_id);