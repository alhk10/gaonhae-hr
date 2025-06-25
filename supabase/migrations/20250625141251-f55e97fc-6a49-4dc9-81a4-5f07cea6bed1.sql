
-- Create RLS policies for claims table
CREATE POLICY "Allow all operations on claims for authenticated users" 
ON public.claims 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create RLS policies for leave_requests table  
CREATE POLICY "Allow all operations on leave_requests for authenticated users"
ON public.leave_requests
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for attendance table
CREATE POLICY "Allow all operations on attendance for authenticated users"
ON public.attendance
FOR ALL  
USING (true)
WITH CHECK (true);

-- Enable RLS on all tables if not already enabled
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
