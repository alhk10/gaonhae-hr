-- Create student scheduled classes table for tracking individual class sessions
CREATE TABLE public.student_scheduled_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.student_class_enrollments(id) ON DELETE CASCADE,
  timetable_id UUID REFERENCES public.branch_timetables(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  -- Status for swaps and attendance
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'attended', 'absent', 'cancelled', 'swapped')),
  -- Swap tracking
  swapped_from_id UUID REFERENCES public.student_scheduled_classes(id) ON DELETE SET NULL,
  swap_reason TEXT,
  -- Attendance confirmation
  attended_at TIMESTAMP WITH TIME ZONE,
  recorded_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_scheduled_classes_enrollment ON public.student_scheduled_classes(enrollment_id);
CREATE INDEX idx_scheduled_classes_date ON public.student_scheduled_classes(scheduled_date);
CREATE INDEX idx_scheduled_classes_timetable ON public.student_scheduled_classes(timetable_id);
CREATE INDEX idx_scheduled_classes_status ON public.student_scheduled_classes(status);

-- Enable RLS
ALTER TABLE public.student_scheduled_classes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all scheduled classes"
ON public.student_scheduled_classes
FOR SELECT USING (true);

CREATE POLICY "Users can insert scheduled classes"
ON public.student_scheduled_classes
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update scheduled classes"
ON public.student_scheduled_classes
FOR UPDATE USING (true);

CREATE POLICY "Users can delete scheduled classes"
ON public.student_scheduled_classes
FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_student_scheduled_classes_updated_at
BEFORE UPDATE ON public.student_scheduled_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();