-- Create employee_branch_access table for branch dashboard permissions
CREATE TABLE public.employee_branch_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    branch_id text NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    can_view_dashboard boolean DEFAULT true,
    can_approve_changes boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(employee_id, branch_id)
);

-- Create student_update_requests table for pending student profile edits
CREATE TABLE public.student_update_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    requested_changes jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    requested_at timestamp with time zone DEFAULT now(),
    reviewed_by text REFERENCES public.employees(id) ON DELETE SET NULL,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create student_auth table to link students to Supabase auth users
CREATE TABLE public.student_auth (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
    auth_user_id uuid UNIQUE,
    email text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.employee_branch_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_auth ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_employee_branch_access_employee ON public.employee_branch_access(employee_id);
CREATE INDEX idx_employee_branch_access_branch ON public.employee_branch_access(branch_id);
CREATE INDEX idx_student_update_requests_student ON public.student_update_requests(student_id);
CREATE INDEX idx_student_update_requests_status ON public.student_update_requests(status);
CREATE INDEX idx_student_auth_student ON public.student_auth(student_id);
CREATE INDEX idx_student_auth_email ON public.student_auth(email);

-- Update timestamp triggers
CREATE TRIGGER update_employee_branch_access_updated_at
    BEFORE UPDATE ON public.employee_branch_access
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_update_requests_updated_at
    BEFORE UPDATE ON public.student_update_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_auth_updated_at
    BEFORE UPDATE ON public.student_auth
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for employee_branch_access
CREATE POLICY "Superadmins can manage branch access"
ON public.employee_branch_access
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Employees can view their own branch access"
ON public.employee_branch_access
FOR SELECT
TO authenticated
USING (employee_id = public.get_current_employee_id());

-- RLS Policies for student_update_requests
CREATE POLICY "Superadmins can manage all update requests"
ON public.student_update_requests
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Branch managers can manage requests for their students"
ON public.student_update_requests
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employee_branch_access eba
        JOIN public.students s ON s.branch_id = eba.branch_id
        WHERE eba.employee_id = public.get_current_employee_id()
        AND eba.can_approve_changes = true
        AND s.id = student_update_requests.student_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.employee_branch_access eba
        JOIN public.students s ON s.branch_id = eba.branch_id
        WHERE eba.employee_id = public.get_current_employee_id()
        AND eba.can_approve_changes = true
        AND s.id = student_update_requests.student_id
    )
);

CREATE POLICY "Students can view their own requests"
ON public.student_update_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_auth sa
        WHERE sa.student_id = student_update_requests.student_id
        AND sa.auth_user_id = auth.uid()
    )
);

CREATE POLICY "Students can insert their own requests"
ON public.student_update_requests
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.student_auth sa
        WHERE sa.student_id = student_update_requests.student_id
        AND sa.auth_user_id = auth.uid()
    )
);

-- RLS Policies for student_auth
CREATE POLICY "Superadmins can manage student auth"
ON public.student_auth
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Students can view their own auth"
ON public.student_auth
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Helper functions for student authentication
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.student_auth
        WHERE auth_user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT student_id FROM public.student_auth
    WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_branch_access(p_branch_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.get_current_user_role() = 'superadmin'
        OR EXISTS (
            SELECT 1 FROM public.employee_branch_access
            WHERE employee_id = public.get_current_employee_id()
            AND can_view_dashboard = true
            AND (p_branch_id IS NULL OR branch_id = p_branch_id)
        );
$$;