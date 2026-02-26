

## Plan: Match Employee Student Tab Layout to Superadmin Layout

### Current State
The Employee Dashboard's Students tab renders `EmployeeBranchStudentList` which has its own search input, dropdown, and back-button pattern — different from the Superadmin's inline selector pattern.

### Target State
Match the Superadmin `DashboardSwitcher` layout:
- Student dropdown selector appears **inline with the tabs** (same row)
- When no student selected: show a Card with GraduationCap icon + "Select a student to view their portal" message
- When student selected: render `StudentDashboard` directly
- No separate search input or back button — just change the dropdown to switch students

### Changes

**`src/components/dashboard/EmployeeDashboard.tsx`** (lines 787-808)

1. Add state: `selectedStudent` string
2. Fetch students for accessible branches (query enabled when `hasInvoiceAccess`)
3. Replace the `Tabs` structure to use a controlled `activeTab` state
4. Move the `TabsList` inside a Card wrapper matching Superadmin's layout
5. When `activeTab === 'students'`, show a `Select` dropdown inline with the tabs (same row)
6. In the students `TabsContent`, render either the placeholder Card or `StudentDashboard` based on `selectedStudent`

**`src/components/dashboard/EmployeeBranchStudentList.tsx`**

No longer needed — delete or leave unused. All student selection logic moves into `EmployeeDashboard.tsx`.

### Layout Structure
```text
┌─ Card ──────────────────────────────────────────────┐
│ [Dashboard] [Branch] [Students]  [Select student▾]  │
└─────────────────────────────────────────────────────┘

┌─ Card (when no student selected) ───────────────────┐
│          🎓                                         │
│   Select a student to view their portal             │
└─────────────────────────────────────────────────────┘
```

### Data
- Query `students` table filtered by `invoiceAccessBranchIds`, ordered by `first_name`
- Display as `FIRST_NAME LAST_NAME` in uppercase in the dropdown

