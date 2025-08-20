-- ====================================================
-- SALES MODULE - ROW LEVEL SECURITY POLICIES
-- CRITICAL: Enable RLS and create policies for all new tables
-- ====================================================

-- Enable RLS on all new sales module tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_medical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- STUDENTS TABLE POLICIES
-- ====================================================

-- Superadmin can manage all students
CREATE POLICY "superadmin_manage_students" ON public.students
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Students can view their own record (future customer portal)
CREATE POLICY "students_view_own_record" ON public.students
FOR SELECT TO authenticated
USING (email = auth.email());

-- ====================================================
-- STUDENT EMERGENCY CONTACTS POLICIES
-- ====================================================

-- Superadmin can manage all emergency contacts
CREATE POLICY "superadmin_manage_emergency_contacts" ON public.student_emergency_contacts
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Students can view their own emergency contacts
CREATE POLICY "students_view_own_emergency_contacts" ON public.student_emergency_contacts
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- ====================================================
-- STUDENT MEDICAL NOTES POLICIES
-- ====================================================

-- Superadmin can manage all medical notes
CREATE POLICY "superadmin_manage_medical_notes" ON public.student_medical_notes
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Students can view their own medical notes
CREATE POLICY "students_view_own_medical_notes" ON public.student_medical_notes
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- ====================================================
-- STUDENT GRADING HISTORY POLICIES
-- ====================================================

-- Superadmin can manage all grading history
CREATE POLICY "superadmin_manage_grading_history" ON public.student_grading_history
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Students can view their own grading history
CREATE POLICY "students_view_own_grading_history" ON public.student_grading_history
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- ====================================================
-- PRODUCT CATALOG POLICIES
-- ====================================================

-- Everyone can view active product categories
CREATE POLICY "view_active_product_categories" ON public.product_categories
FOR SELECT TO authenticated
USING (is_active = true);

-- Superadmin can manage product categories
CREATE POLICY "superadmin_manage_product_categories" ON public.product_categories
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Everyone can view active products
CREATE POLICY "view_active_products" ON public.products
FOR SELECT TO authenticated
USING (is_active = true);

-- Superadmin can manage products
CREATE POLICY "superadmin_manage_products" ON public.products
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Everyone can view active price rules
CREATE POLICY "view_active_price_rules" ON public.price_rules
FOR SELECT TO authenticated
USING (is_active = true);

-- Superadmin can manage price rules
CREATE POLICY "superadmin_manage_price_rules" ON public.price_rules
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- ====================================================
-- INVENTORY POLICIES
-- ====================================================

-- Superadmin can manage all inventory locations
CREATE POLICY "superadmin_manage_inventory_locations" ON public.inventory_locations
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Superadmin can view inventory locations
CREATE POLICY "superadmin_view_inventory_locations" ON public.inventory_locations
FOR SELECT TO authenticated
USING (get_current_user_role() = 'superadmin');

-- Superadmin can manage all inventory items
CREATE POLICY "superadmin_manage_inventory_items" ON public.inventory_items
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Superadmin can view inventory items
CREATE POLICY "superadmin_view_inventory_items" ON public.inventory_items
FOR SELECT TO authenticated
USING (get_current_user_role() = 'superadmin');

-- Superadmin can manage all inventory movements
CREATE POLICY "superadmin_manage_inventory_movements" ON public.inventory_movements
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Superadmin can view inventory movements
CREATE POLICY "superadmin_view_inventory_movements" ON public.inventory_movements
FOR SELECT TO authenticated
USING (get_current_user_role() = 'superadmin');

-- ====================================================
-- INVOICING POLICIES
-- ====================================================

-- Superadmin can manage all invoices
CREATE POLICY "superadmin_manage_invoices" ON public.invoices
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Students can view their own invoices (customer portal)
CREATE POLICY "students_view_own_invoices" ON public.invoices
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- Superadmin can manage all invoice items
CREATE POLICY "superadmin_manage_invoice_items" ON public.invoice_items
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superladmin');

-- Students can view their own invoice items
CREATE POLICY "students_view_own_invoice_items" ON public.invoice_items
FOR SELECT TO authenticated
USING (invoice_id IN (
    SELECT id FROM public.invoices 
    WHERE student_id IN (SELECT id FROM public.students WHERE email = auth.email())
));

-- Superadmin can manage all payments
CREATE POLICY "superadmin_manage_payments" ON public.payments
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Students can view their own payments
CREATE POLICY "students_view_own_payments" ON public.payments
FOR SELECT TO authenticated
USING (invoice_id IN (
    SELECT id FROM public.invoices 
    WHERE student_id IN (SELECT id FROM public.students WHERE email = auth.email())
));

-- ====================================================
-- ENTITLEMENTS & ATTENDANCE POLICIES
-- ====================================================

-- Superadmin can manage all entitlements
CREATE POLICY "superadmin_manage_entitlements" ON public.entitlements
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Students can view their own entitlements
CREATE POLICY "students_view_own_entitlements" ON public.entitlements
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- Superadmin can manage term calendars
CREATE POLICY "superadmin_manage_term_calendars" ON public.term_calendars
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Everyone can view active term calendars
CREATE POLICY "view_active_term_calendars" ON public.term_calendars
FOR SELECT TO authenticated
USING (is_active = true);

-- Superadmin can manage branch timetables
CREATE POLICY "superadmin_manage_branch_timetables" ON public.branch_timetables
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Everyone can view active branch timetables
CREATE POLICY "view_active_branch_timetables" ON public.branch_timetables
FOR SELECT TO authenticated
USING (is_active = true);

-- Superadmin can manage all class attendance
CREATE POLICY "superadmin_manage_class_attendance" ON public.class_attendance
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Students can view their own attendance
CREATE POLICY "students_view_own_attendance" ON public.class_attendance
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- ====================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- ====================================================

-- Create function to check if user has sales module access (feature flag check)
CREATE OR REPLACE FUNCTION public.has_sales_module_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Only superadmins have access during initial rollout
    get_current_user_role() = 'superadmin'
    AND 
    -- Check if sales module is enabled (from system_settings)
    EXISTS (
      SELECT 1 FROM public.system_settings 
      WHERE setting_key = 'salesModuleEnabled' 
      AND (setting_value->>'enabled')::boolean = true
    );
$$;

-- Insert sales module feature flag (disabled by default)
INSERT INTO public.system_settings (setting_key, setting_value, created_by, updated_by) 
VALUES (
  'salesModuleEnabled', 
  '{"enabled": false, "allowedRoles": ["superadmin"], "rolloutPhase": "development"}',
  'system',
  'system'
) ON CONFLICT (setting_key) DO NOTHING;