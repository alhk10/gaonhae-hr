-- Create letter_templates table for custom verification letter templates
CREATE TABLE public.letter_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('student', 'employee')),
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  closing_text TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

-- Enable RLS
ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view letter templates"
ON public.letter_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert letter templates"
ON public.letter_templates
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update letter templates"
ON public.letter_templates
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete letter templates"
ON public.letter_templates
FOR DELETE
TO authenticated
USING (is_default = false);

-- Insert default templates
INSERT INTO public.letter_templates (name, type, title, body_text, closing_text, is_default, sort_order) VALUES
('Student Verification', 'student', 'STUDENT VERIFICATION LETTER', 'This is to certify that {fullName} is a student currently registered at Gaonhae Taekwondo.', 'Should you have any further clarifications, please do not hesitate to contact us.', true, 0),
('Employment Verification', 'employee', 'EMPLOYMENT VERIFICATION LETTER', 'We confirm that {fullName} (NRIC/FIN {nric}) commenced work at Gaonhae Taekwondo LLP on {joinDate}. He is currently holding the position of {position} and drawing a monthly basic salary of {salary} not including allowances.', 'Should you have any further clarifications, please do not hesitate to contact us.', true, 0);

-- Create trigger for updated_at
CREATE TRIGGER update_letter_templates_updated_at
BEFORE UPDATE ON public.letter_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();