-- Comprehensive Security Fix: RLS Policy Updates
-- This migration fixes critical security vulnerabilities in RLS policies

-- =====================================================
-- 1. FIX EMPLOYEES TABLE RLS (CRITICAL)
-- =====================================================
-- Drop the dangerous policy that allows anyone to view all employee data
DROP POLICY IF EXISTS "Users can view employee data" ON employees;

-- Create proper restrictive policy for employee data access
CREATE POLICY "Authorized users view employees"
ON employees FOR SELECT
USING (
  -- Employees can view their own record
  email = auth.email()
  -- OR Superadmins can view all
  OR get_current_user_role() = 'superadmin'
  -- OR Admins with employees permission can view all
  OR has_admin_access('employees')
);

-- =====================================================
-- 2. FIX BRANCHES TABLE RLS (HIGH PRIORITY)
-- =====================================================
-- Drop the dangerous policy that allows anyone full access
DROP POLICY IF EXISTS "Allow full access to branches" ON branches;

-- Anyone can view branches (needed for dropdown selectors)
CREATE POLICY "Anyone can view branches"
ON branches FOR SELECT 
USING (true);

-- Only superadmins can create, update, or delete branches
CREATE POLICY "Superadmins manage branches"
ON branches FOR ALL
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- =====================================================
-- 3. FIX ADMIN_ACCESS TABLE RLS (MEDIUM PRIORITY)
-- =====================================================
-- Drop the overly permissive policy that lets anyone view all admin access
DROP POLICY IF EXISTS "Users can view their own admin access" ON admin_access;

-- Note: Keep existing restrictive policies:
-- - "Employees view own admin access" (already exists)
-- - "Superadmins can manage admin access" (already exists)

-- Add comment for clarity
COMMENT ON TABLE admin_access IS 'Admin access permissions. RLS ensures employees can only view their own access, superadmins can manage all.';