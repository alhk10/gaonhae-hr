-- ====================================================
-- SALES MODULE - ROW LEVEL SECURITY POLICIES (FINAL FIX)
-- CRITICAL: Enable RLS and create policies for all new tables
-- ====================================================

-- Enable RLS on all new sales module tables (safe to run multiple times)
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
-- DROP AND RECREATE POLICIES (SAFE APPROACH)
-- ====================================================

-- Students policies
DROP POLICY IF EXISTS "superadmin_manage_students" ON public.students;
DROP POLICY IF EXISTS "students_view_own_record" ON public.students;

CREATE POLICY "superadmin_manage_students" ON public.students
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "students_view_own_record" ON public.students
FOR SELECT TO authenticated
USING (email = auth.email());

-- Student emergency contacts policies
DROP POLICY IF EXISTS "superadmin_manage_emergency_contacts" ON public.student_emergency_contacts;
DROP POLICY IF EXISTS "students_view_own_emergency_contacts" ON public.student_emergency_contacts;

CREATE POLICY "superadmin_manage_emergency_contacts" ON public.student_emergency_contacts
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "students_view_own_emergency_contacts" ON public.student_emergency_contacts
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- Student medical notes policies
DROP POLICY IF EXISTS "superadmin_manage_medical_notes" ON public.student_medical_notes;
DROP POLICY IF EXISTS "students_view_own_medical_notes" ON public.student_medical_notes;

CREATE POLICY "superadmin_manage_medical_notes" ON public.student_medical_notes
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "students_view_own_medical_notes" ON public.student_medical_notes
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- Student grading history policies
DROP POLICY IF EXISTS "superadmin_manage_grading_history" ON public.student_grading_history;
DROP POLICY IF EXISTS "students_view_own_grading_history" ON public.student_grading_history;

CREATE POLICY "superadmin_manage_grading_history" ON public.student_grading_history
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "students_view_own_grading_history" ON public.student_grading_history
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- Product categories policies
DROP POLICY IF EXISTS "view_active_product_categories" ON public.product_categories;
DROP POLICY IF EXISTS "superadmin_manage_product_categories" ON public.product_categories;

CREATE POLICY "view_active_product_categories" ON public.product_categories
FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "superadmin_manage_product_categories" ON public.product_categories
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Products policies
DROP POLICY IF EXISTS "view_active_products" ON public.products;
DROP POLICY IF EXISTS "superadmin_manage_products" ON public.products;

CREATE POLICY "view_active_products" ON public.products
FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "superladmin_manage_products" ON public.products
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Price rules policies
DROP POLICY IF EXISTS "view_active_price_rules" ON public.price_rules;
DROP POLICY IF EXISTS "superadmin_manage_price_rules" ON public.price_rules;

CREATE POLICY "view_active_price_rules" ON public.price_rules
FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "superadmin_manage_price_rules" ON public.price_rules
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Inventory locations policies
DROP POLICY IF EXISTS "superadmin_manage_inventory_locations" ON public.inventory_locations;

CREATE POLICY "superadmin_manage_inventory_locations" ON public.inventory_locations
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Inventory items policies
DROP POLICY IF EXISTS "superadmin_manage_inventory_items" ON public.inventory_items;

CREATE POLICY "superadmin_manage_inventory_items" ON public.inventory_items
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Inventory movements policies
DROP POLICY IF EXISTS "superadmin_manage_inventory_movements" ON public.inventory_movements;

CREATE POLICY "superadmin_manage_inventory_movements" ON public.inventory_movements
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Invoices policies
DROP POLICY IF EXISTS "superadmin_manage_invoices" ON public.invoices;
DROP POLICY IF EXISTS "students_view_own_invoices" ON public.invoices;

CREATE POLICY "superadmin_manage_invoices" ON public.invoices
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "students_view_own_invoices" ON public.invoices
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- Invoice items policies
DROP POLICY IF EXISTS "superadmin_manage_invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "students_view_own_invoice_items" ON public.invoice_items;

CREATE POLICY "superadmin_manage_invoice_items" ON public.invoice_items
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "students_view_own_invoice_items" ON public.invoice_items
FOR SELECT TO authenticated
USING (invoice_id IN (
    SELECT id FROM public.invoices 
    WHERE student_id IN (SELECT id FROM public.students WHERE email = auth.email())
));

-- Payments policies
DROP POLICY IF EXISTS "superadmin_manage_payments" ON public.payments;
DROP POLICY IF EXISTS "students_view_own_payments" ON public.payments;

CREATE POLICY "superadmin_manage_payments" ON public.payments
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "students_view_own_payments" ON public.payments
FOR SELECT TO authenticated
USING (invoice_id IN (
    SELECT id FROM public.invoices 
    WHERE student_id IN (SELECT id FROM public.students WHERE email = auth.email())
));

-- Entitlements policies
DROP POLICY IF EXISTS "superadmin_manage_entitlements" ON public.entitlements;
DROP POLICY IF EXISTS "students_view_own_entitlements" ON public.entitlements;

CREATE POLICY "superadmin_manage_entitlements" ON public.entitlements
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "students_view_own_entitlements" ON public.entitlements
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- Term calendars policies
DROP POLICY IF EXISTS "superadmin_manage_term_calendars" ON public.term_calendars;
DROP POLICY IF EXISTS "view_active_term_calendars" ON public.term_calendars;

CREATE POLICY "superadmin_manage_term_calendars" ON public.term_calendars
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "view_active_term_calendars" ON public.term_calendars
FOR SELECT TO authenticated
USING (is_active = true);

-- Branch timetables policies
DROP POLICY IF EXISTS "superadmin_manage_branch_timetables" ON public.branch_timetables;
DROP POLICY IF EXISTS "view_active_branch_timetables" ON public.branch_timetables;

CREATE POLICY "superadmin_manage_branch_timetables" ON public.branch_timetables
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "view_active_branch_timetables" ON public.branch_timetables
FOR SELECT TO authenticated
USING (is_active = true);

-- Class attendance policies
DROP POLICY IF EXISTS "superadmin_manage_class_attendance" ON public.class_attendance;
DROP POLICY IF EXISTS "students_view_own_attendance" ON public.class_attendance;

CREATE POLICY "superadmin_manage_class_attendance" ON public.class_attendance
FOR ALL TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "students_view_own_attendance" ON public.class_attendance
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE email = auth.email()));

-- ====================================================
-- SALES MODULE ACCESS FUNCTION & FEATURE FLAG
-- ====================================================

-- Create function to check if user has sales module access
CREATE OR REPLACE FUNCTION public.has_sales_module_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    get_current_user_role() = 'superadmin'
    AND 
    EXISTS (
      SELECT 1 FROM public.system_settings 
      WHERE setting_key = 'salesModuleEnabled' 
      AND (setting_value->>'enabled')::boolean = true
    );
$$;

-- Insert sales module feature flag (disabled by default) - using only existing columns
INSERT INTO public.system_settings (setting_key, setting_value) 
VALUES (
  'salesModuleEnabled', 
  '{"enabled": false, "allowedRoles": ["superadmin"], "rolloutPhase": "development"}'
) ON CONFLICT (setting_key) DO NOTHING;