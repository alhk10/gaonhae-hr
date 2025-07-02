
-- Allow full access to system_allowances for authenticated users
DROP POLICY IF EXISTS "Allow read access to system allowances" ON system_allowances;
CREATE POLICY "Allow full access to system allowances" ON system_allowances FOR ALL USING (true) WITH CHECK (true);

-- Allow full access to system_deductions for authenticated users  
DROP POLICY IF EXISTS "Allow read access to system deductions" ON system_deductions;
CREATE POLICY "Allow full access to system deductions" ON system_deductions FOR ALL USING (true) WITH CHECK (true);

-- Allow full access to branches table for authenticated users
DROP POLICY IF EXISTS "Users can view branches" ON branches;
CREATE POLICY "Allow full access to branches" ON branches FOR ALL USING (true) WITH CHECK (true);
