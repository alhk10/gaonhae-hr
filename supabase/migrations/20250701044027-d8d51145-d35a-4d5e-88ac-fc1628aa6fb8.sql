
-- Create branches table for storing branch information
CREATE TABLE public.branches (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  total_slots INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create weekly_slot_config table for storing daily slot configurations per branch
CREATE TABLE public.weekly_slot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES public.branches(id),
  monday INTEGER NOT NULL DEFAULT 0,
  tuesday INTEGER NOT NULL DEFAULT 0,
  wednesday INTEGER NOT NULL DEFAULT 0,
  thursday INTEGER NOT NULL DEFAULT 0,
  friday INTEGER NOT NULL DEFAULT 0,
  saturday INTEGER NOT NULL DEFAULT 0,
  sunday INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(branch_id)
);

-- Create slot_bookings table for storing actual bookings
CREATE TABLE public.slot_bookings_new (
  id TEXT NOT NULL PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES public.branches(id),
  branch_name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  booked_on DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_by TEXT,
  approved_on DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default branch data
INSERT INTO public.branches (id, name, address, total_slots, color) VALUES
('headquarters', 'Headquarters', '123 Business District, #12-34, Singapore 068123', 0, 'bg-blue-500'),
('balmoral', 'Balmoral', '456 Balmoral Road, #05-67, Singapore 259856', 5, 'bg-green-500'),
('jurong-west', 'Jurong West', '789 Jurong West Central, #08-90, Singapore 640789', 6, 'bg-purple-500'),
('kembangan', 'Kembangan', '321 Kembangan Road, #03-45, Singapore 419642', 4, 'bg-orange-500'),
('yishun', 'Yishun', '654 Yishun Ring Road, #07-12, Singapore 760654', 7, 'bg-red-500'),
('bukit-merah', 'Bukit Merah', '987 Bukit Merah Central, #04-56, Singapore 150987', 5, 'bg-indigo-500');

-- Insert default weekly slot configurations
INSERT INTO public.weekly_slot_config (branch_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday) VALUES
('headquarters', 0, 0, 0, 0, 0, 0, 0),
('balmoral', 5, 5, 5, 5, 5, 3, 1),
('jurong-west', 6, 6, 6, 6, 6, 3, 2),
('kembangan', 4, 4, 4, 4, 4, 2, 2),
('yishun', 7, 7, 7, 7, 7, 4, 2),
('bukit-merah', 5, 5, 5, 5, 5, 3, 1);

-- Create indexes for better query performance
CREATE INDEX idx_slot_bookings_new_employee_id ON public.slot_bookings_new(employee_id);
CREATE INDEX idx_slot_bookings_new_branch_id ON public.slot_bookings_new(branch_id);
CREATE INDEX idx_slot_bookings_new_date ON public.slot_bookings_new(date);
CREATE INDEX idx_slot_bookings_new_status ON public.slot_bookings_new(status);

-- Enable Row Level Security
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_slot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_bookings_new ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Users can view weekly slot config" ON public.weekly_slot_config FOR SELECT USING (true);
CREATE POLICY "Users can update weekly slot config" ON public.weekly_slot_config FOR UPDATE USING (true);

CREATE POLICY "Users can view slot bookings" ON public.slot_bookings_new FOR SELECT USING (true);
CREATE POLICY "Users can insert slot bookings" ON public.slot_bookings_new FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update slot bookings" ON public.slot_bookings_new FOR UPDATE USING (true);
CREATE POLICY "Users can delete slot bookings" ON public.slot_bookings_new FOR DELETE USING (true);
