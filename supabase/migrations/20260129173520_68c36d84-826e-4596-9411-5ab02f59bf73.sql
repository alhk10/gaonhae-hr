-- Create invoice_change_logs table
CREATE TABLE public.invoice_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    changes JSONB,
    changed_by TEXT,
    changed_by_email TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_invoice_change_logs_invoice_id ON public.invoice_change_logs(invoice_id);
CREATE INDEX idx_invoice_change_logs_created_at ON public.invoice_change_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.invoice_change_logs ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all change logs
CREATE POLICY "superadmin_manage_invoice_change_logs" ON public.invoice_change_logs
FOR ALL USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Insert policy for any authenticated user (logs are created programmatically)
CREATE POLICY "authenticated_insert_invoice_change_logs" ON public.invoice_change_logs
FOR INSERT WITH CHECK (auth.role() = 'authenticated');