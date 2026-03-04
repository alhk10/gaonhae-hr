
-- Table for pending student registrations (public form submissions)
CREATE TABLE public.student_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Referral
  referral_source text,
  -- Personal info
  first_name text NOT NULL,
  last_name text NOT NULL,
  preferred_name text,
  certificate_name text,
  display_name text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  nric_passport text,
  passport_no text,
  phone text,
  whatsapp text,
  email text,
  address text,
  postal_code text,
  nationality jsonb DEFAULT '[]'::jsonb,
  languages_spoken jsonb DEFAULT '[]'::jsonb,
  -- Emergency contacts
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  emergency_contact_2_name text,
  emergency_contact_2_phone text,
  emergency_contact_2_relationship text,
  -- Training info
  current_belt text,
  previous_experience text,
  training_goals text,
  medical_conditions text,
  dietary_restrictions text,
  -- Admin
  branch_id text REFERENCES public.branches(id),
  notes text,
  -- Workflow
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allow public (anon) inserts, but restrict reads to authenticated admins
ALTER TABLE public.student_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a registration (public form)
CREATE POLICY "Anyone can submit registration"
  ON public.student_registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only superadmins and branch-access employees can view
CREATE POLICY "Admins can view registrations"
  ON public.student_registrations FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'superadmin'
    OR public.has_branch_access(branch_id)
  );

-- Only superadmins and branch-access employees can update (approve/reject)
CREATE POLICY "Admins can update registrations"
  ON public.student_registrations FOR UPDATE
  TO authenticated
  USING (
    public.get_current_user_role() = 'superadmin'
    OR public.has_branch_access(branch_id)
  );

-- Trigger for updated_at
CREATE TRIGGER update_student_registrations_updated_at
  BEFORE UPDATE ON public.student_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
