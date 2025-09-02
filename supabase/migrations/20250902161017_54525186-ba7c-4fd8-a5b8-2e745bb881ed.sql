-- Phase 1: Safe Performance Indexes
-- These indexes will improve query performance without affecting data or functionality

-- Attendance table indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance (employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance (status);

-- Claims table indexes
CREATE INDEX IF NOT EXISTS idx_claims_employee_id ON public.claims (employee_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims (status);
CREATE INDEX IF NOT EXISTS idx_claims_submitted_date ON public.claims (submitted_date);

-- Leave requests table indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests (status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_type ON public.leave_requests (type);

-- Payroll records table indexes
CREATE INDEX IF NOT EXISTS idx_payroll_employee_period ON public.payroll_records (employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON public.payroll_records (status);

-- Slot bookings (new) table indexes
CREATE INDEX IF NOT EXISTS idx_slot_bookings_employee_date ON public.slot_bookings_new (employee_id, date);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_branch_date ON public.slot_bookings_new (branch_id, date);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_status ON public.slot_bookings_new (status);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_date ON public.slot_bookings_new (date);

-- Employees table indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees (email);
CREATE INDEX IF NOT EXISTS idx_employees_type ON public.employees (type);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees (department);

-- Sales module indexes (for when sales module is enabled)
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students (email);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices (student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_student_date ON public.class_attendance (student_id, class_date);