-- Add payment tracking columns to payroll_records table
ALTER TABLE public.payroll_records
ADD COLUMN IF NOT EXISTS salary_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS salary_paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS salary_paid_by text,
ADD COLUMN IF NOT EXISTS cpf_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cpf_paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cpf_paid_by text;