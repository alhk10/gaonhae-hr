-- ====================================================
-- TAEKWONDO SALES MODULE - DATABASE SCHEMA
-- MILESTONE 1: Additive-only migrations (no existing table changes)
-- ====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================
-- 1. STUDENTS MANAGEMENT
-- ====================================================

-- Main students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_number TEXT UNIQUE NOT NULL, -- Format: STU-YYYY-NNNN
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    postal_code TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    current_belt TEXT, -- Foundation 1, Foundation 2, etc.
    branch_id TEXT, -- Links to existing branches table
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'graduated')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Student emergency contacts (separate table for multiple contacts)
CREATE TABLE public.student_emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Student medical notes
CREATE TABLE public.student_medical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    medical_condition TEXT,
    allergies TEXT,
    medications TEXT,
    dietary_restrictions TEXT,
    other_notes TEXT,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT,
    UNIQUE(student_id) -- One medical record per student
);

-- Grading history (links to existing system, read-only from sales module)
CREATE TABLE public.student_grading_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    belt_from TEXT,
    belt_to TEXT NOT NULL,
    grading_date DATE NOT NULL,
    result TEXT CHECK (result IN ('pass', 'fail', 'conditional_pass')) DEFAULT 'pass',
    examiner_name TEXT,
    branch_id TEXT,
    notes TEXT,
    certificate_issued BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- ====================================================
-- 2. PRODUCT CATALOG
-- ====================================================

-- Product categories
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Insert default categories for Taekwondo business
INSERT INTO public.product_categories (name, description, sort_order) VALUES 
('uniform', 'Taekwondo uniforms and doboks', 1),
('gear', 'Protective gear and equipment', 2),
('lesson_package', 'Training session packages', 3),
('grading_fee', 'Belt grading examination fees', 4),
('competition_fee', 'Local and overseas competition fees', 5),
('service', 'Additional services and workshops', 6);

-- Main products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.product_categories(id),
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0.08, -- 8% GST in Singapore
    is_active BOOLEAN DEFAULT true,
    requires_size BOOLEAN DEFAULT false, -- For uniforms/gear
    available_sizes TEXT[], -- Array of sizes: ['XS', 'S', 'M', 'L', 'XL']
    requires_belt_level BOOLEAN DEFAULT false, -- For grading fees
    min_belt_level TEXT, -- Minimum belt required
    max_belt_level TEXT, -- Maximum belt applicable
    session_count INTEGER, -- For lesson packages
    validity_months INTEGER, -- How long lesson packages are valid
    is_recurring BOOLEAN DEFAULT false, -- Monthly fees, etc.
    metadata JSONB, -- Flexible storage for product-specific data
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Dynamic pricing rules (branch-specific, belt-specific, time-based discounts)
CREATE TABLE public.price_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    branch_id TEXT, -- NULL means applies to all branches
    belt_min TEXT, -- Minimum belt level for this price
    belt_max TEXT, -- Maximum belt level for this price
    price_override DECIMAL(10,2), -- Override base price
    discount_percentage DECIMAL(5,2), -- Or apply discount percentage
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE, -- NULL means no expiry
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- ====================================================
-- 3. INVENTORY MANAGEMENT
-- ====================================================

-- Inventory locations within branches
CREATE TABLE public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id TEXT NOT NULL, -- Links to existing branches
    name TEXT NOT NULL, -- 'Main Store', 'Equipment Room', etc.
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT,
    UNIQUE(branch_id, name)
);

-- Current inventory levels
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
    size_variant TEXT, -- For sized products
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0, -- Reserved for pending invoices
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    cost_per_unit DECIMAL(10,2), -- Cost price for valuation
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT,
    UNIQUE(product_id, location_id, size_variant)
);

-- Inventory movements (stock in/out tracking)
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    location_id UUID NOT NULL REFERENCES public.inventory_locations(id),
    size_variant TEXT,
    movement_type TEXT CHECK (movement_type IN ('receive', 'adjust', 'reserve', 'unreserve', 'sell', 'return', 'transfer', 'loss')) NOT NULL,
    quantity_delta INTEGER NOT NULL, -- Positive for increases, negative for decreases
    reference_type TEXT, -- 'invoice', 'purchase_order', 'adjustment', etc.
    reference_id TEXT, -- ID of the related document
    reason TEXT,
    unit_cost DECIMAL(10,2),
    notes TEXT,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT
);

-- ====================================================
-- 4. INVOICING SYSTEM
-- ====================================================

-- Main invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL, -- Format: INV-YYYY-NNNN
    student_id UUID NOT NULL REFERENCES public.students(id),
    branch_id TEXT, -- Issuing branch
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'partially_paid', 'overdue', 'void', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
    issue_date DATE,
    due_date DATE,
    payment_terms_days INTEGER DEFAULT 30,
    notes TEXT,
    internal_notes TEXT, -- Private notes for staff
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Invoice line items
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    size_variant TEXT,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.08,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    metadata JSONB, -- Store lesson package details, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Payment records
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_number TEXT UNIQUE NOT NULL, -- Format: PAY-YYYY-NNNN
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'online', 'paynow', 'cheque')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT, -- Bank ref, card transaction ID, etc.
    proof_of_payment_url TEXT, -- Link to uploaded receipt/proof
    notes TEXT,
    processed_by TEXT, -- Staff member who processed
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- ====================================================
-- 5. SESSION ENTITLEMENTS & ATTENDANCE
-- ====================================================

-- Student entitlements (purchased lesson packages)
CREATE TABLE public.entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    source_type TEXT CHECK (source_type IN ('invoice_item', 'promotional', 'makeup', 'trial')) NOT NULL,
    source_id UUID, -- References invoice_items.id or other source
    product_id UUID REFERENCES public.products(id), -- The lesson package product
    sessions_total INTEGER NOT NULL DEFAULT 0,
    sessions_used INTEGER NOT NULL DEFAULT 0,
    sessions_remaining INTEGER GENERATED ALWAYS AS (sessions_total - sessions_used) STORED,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to DATE,
    branch_scope TEXT, -- NULL means any branch, otherwise specific branch
    class_type_scope TEXT, -- NULL means any class, otherwise specific class type
    belt_level_scope TEXT, -- NULL means any level, otherwise specific belt range
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Term calendars
CREATE TABLE public.term_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- 'Term 1 2024', 'Summer Program', etc.
    branch_id TEXT, -- NULL means applies to all branches
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Branch timetables
CREATE TABLE public.branch_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id TEXT NOT NULL,
    weekday INTEGER CHECK (weekday >= 0 AND weekday <= 6) NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    class_type TEXT NOT NULL, -- 'Beginner', 'Intermediate', 'Advanced', 'Competition'
    belt_range_min TEXT, -- Minimum belt level
    belt_range_max TEXT, -- Maximum belt level
    max_capacity INTEGER,
    instructor_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Class attendance records
CREATE TABLE public.class_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id),
    class_date DATE NOT NULL,
    branch_id TEXT NOT NULL,
    timetable_id UUID REFERENCES public.branch_timetables(id),
    entitlement_id UUID REFERENCES public.entitlements(id), -- Which package was used
    status TEXT CHECK (status IN ('present', 'absent', 'makeup', 'trial', 'cancelled')) NOT NULL,
    attendance_method TEXT CHECK (attendance_method IN ('manual', 'scan', 'app', 'kiosk')) DEFAULT 'manual',
    recorded_by TEXT, -- Staff member who recorded attendance
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT,
    UNIQUE(student_id, class_date, timetable_id) -- Prevent duplicate attendance records
);

-- ====================================================
-- 6. INDEXES FOR PERFORMANCE
-- ====================================================

-- Students indexes
CREATE INDEX idx_students_student_number ON public.students(student_number);
CREATE INDEX idx_students_email ON public.students(email);
CREATE INDEX idx_students_branch_id ON public.students(branch_id);
CREATE INDEX idx_students_status ON public.students(status);

-- Products indexes
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active);

-- Inventory indexes
CREATE INDEX idx_inventory_items_product_location ON public.inventory_items(product_id, location_id);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_date ON public.inventory_movements(movement_date);

-- Invoice indexes
CREATE INDEX idx_invoices_student ON public.invoices(student_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

-- Attendance indexes
CREATE INDEX idx_class_attendance_student ON public.class_attendance(student_id);
CREATE INDEX idx_class_attendance_date ON public.class_attendance(class_date);
CREATE INDEX idx_class_attendance_branch ON public.class_attendance(branch_id);

-- Entitlements indexes
CREATE INDEX idx_entitlements_student ON public.entitlements(student_id);
CREATE INDEX idx_entitlements_active ON public.entitlements(is_active);
CREATE INDEX idx_entitlements_validity ON public.entitlements(valid_from, valid_to);

-- ====================================================
-- 7. TRIGGERS FOR AUTOMATIC UPDATES
-- ====================================================

-- Update updated_at timestamp trigger function (reuse existing if available)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all new tables
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_emergency_contacts_updated_at BEFORE UPDATE ON public.student_emergency_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_medical_notes_updated_at BEFORE UPDATE ON public.student_medical_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_grading_history_updated_at BEFORE UPDATE ON public.student_grading_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_price_rules_updated_at BEFORE UPDATE ON public.price_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_locations_updated_at BEFORE UPDATE ON public.inventory_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_entitlements_updated_at BEFORE UPDATE ON public.entitlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_term_calendars_updated_at BEFORE UPDATE ON public.term_calendars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_branch_timetables_updated_at BEFORE UPDATE ON public.branch_timetables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_attendance_updated_at BEFORE UPDATE ON public.class_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================
-- 8. INITIAL SEED DATA
-- ====================================================

-- Insert default inventory locations for existing branches (assuming branch IDs exist)
INSERT INTO public.inventory_locations (branch_id, name, description) 
SELECT 
    id as branch_id,
    'Main Store' as name,
    'Primary inventory location for ' || name as description
FROM public.branches 
WHERE id IS NOT NULL;

-- Sample products for immediate testing
INSERT INTO public.products (sku, name, description, category_id, base_price, session_count, validity_months) 
SELECT 
    'LESSON-BASIC-10',
    'Basic Lesson Package (10 Sessions)',
    'Package of 10 basic Taekwondo lessons for beginners',
    cat.id,
    200.00,
    10,
    6
FROM public.product_categories cat WHERE cat.name = 'lesson_package';

INSERT INTO public.products (sku, name, description, category_id, base_price, requires_size, available_sizes) 
SELECT 
    'UNIFORM-BASIC-WHITE',
    'Basic White Dobok',
    'Standard white Taekwondo uniform',
    cat.id,
    45.00,
    true,
    ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL']
FROM public.product_categories cat WHERE cat.name = 'uniform';

INSERT INTO public.products (sku, name, description, category_id, base_price, requires_belt_level, min_belt_level) 
SELECT 
    'GRADING-YELLOW',
    'Yellow Belt Grading Fee',
    'Examination fee for yellow belt promotion',
    cat.id,
    50.00,
    true,
    'White'
FROM public.product_categories cat WHERE cat.name = 'grading_fee';