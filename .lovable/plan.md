

## Plan: Add Student Status Filter Toggle in Create Invoice Dialog

### Problem
Including all trial students by default will bloat the dropdown with students who may never convert.

### Solution
Add a small toggle/segmented control above the student search dropdown with options: **Active** (default) | **Trial** | **All**. This keeps the list clean while allowing admins to switch to trial students when needed.

### Changes

**File: `src/components/sales/CreateInvoiceDialog.tsx`**

1. **Add state**: `const [studentStatusFilter, setStudentStatusFilter] = useState<'active' | 'trial' | 'all'>('active')`

2. **Update student filter logic**: Filter `branchStudents` based on the selected status toggle before passing to the search dropdown.

3. **Add UI toggle**: Render a small segmented button group (using existing Tabs or toggle-group component) above the student selector with "Active", "Trial", "All" options. Compact styling to match the dialog's dense layout.

4. **Trial badge**: When viewing trial students, append "(Trial)" label next to names in the dropdown for clarity.

One file change, no database or service modifications needed.

