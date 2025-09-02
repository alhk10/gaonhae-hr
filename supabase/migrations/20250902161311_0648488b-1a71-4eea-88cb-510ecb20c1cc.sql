-- Phase 2: Fix naming inconsistencies and add normalization tables
-- Fix the naming inconsistency in admin_access table

-- First, let's add a properly named column and migrate data
ALTER TABLE public.admin_access ADD COLUMN IF NOT EXISTS slot_booking boolean DEFAULT false;

-- Copy data from the old column to the new one
UPDATE public.admin_access SET slot_booking = "slotBooking" WHERE "slotBooking" IS NOT NULL;

-- Add normalization tables for better data structure

-- Employee types lookup table
CREATE TABLE IF NOT EXISTS public.employee_types (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert current employee types
INSERT INTO public.employee_types (id, name, description) 
VALUES 
  ('full-time', 'Full-Time', 'Full-time permanent employees'),
  ('part-time', 'Part-Time', 'Part-time employees'),
  ('casual', 'Casual', 'Casual/temporary employees'),
  ('contractor', 'Contractor', 'Contract employees')
ON CONFLICT (id) DO NOTHING;

-- Payment methods lookup table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert current payment methods
INSERT INTO public.payment_methods (id, name, description)
VALUES 
  ('bank-transfer', 'Bank Transfer', 'Electronic bank transfer'),
  ('cash', 'Cash', 'Cash payment'),
  ('cheque', 'Cheque', 'Cheque payment')
ON CONFLICT (id) DO NOTHING;

-- Status lookup tables for consistency
CREATE TABLE IF NOT EXISTS public.booking_statuses (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text, -- For UI display
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.booking_statuses (id, name, description, color)
VALUES 
  ('pending', 'Pending', 'Awaiting approval', 'yellow'),
  ('approved', 'Approved', 'Booking confirmed', 'green'),
  ('rejected', 'Rejected', 'Booking denied', 'red'),
  ('cancelled', 'Cancelled', 'Booking cancelled', 'gray')
ON CONFLICT (id) DO NOTHING;

-- Attendance status lookup
CREATE TABLE IF NOT EXISTS public.attendance_statuses (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.attendance_statuses (id, name, description, color)
VALUES 
  ('present', 'Present', 'Employee was present', 'green'),
  ('absent', 'Absent', 'Employee was absent', 'red'),
  ('late', 'Late', 'Employee arrived late', 'orange'),
  ('half-day', 'Half Day', 'Employee worked half day', 'blue'),
  ('on-leave', 'On Leave', 'Employee on approved leave', 'purple')
ON CONFLICT (id) DO NOTHING;