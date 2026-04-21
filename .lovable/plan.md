

## Plan: Add "Create Invoice" button in the Students tab Actions column

### Current behavior

In `src/components/dashboard/BranchDashboard.tsx` (Students tab, lines 1145–1173), each non-withdrawn student row shows only a single "Withdraw" button in the Actions column. To create an invoice for a specific student, staff currently switch to the Invoice & Payment tab and re-pick the student.

### Change

Add a second small action — **Create Invoice** — beside the Withdraw button on every non-withdrawn student row. Clicking it opens the existing `InvoiceDialog` in `create` mode with the student pre-selected and the branch locked to the current `branchId`.

### Implementation

#### 1. Extend `InvoiceDialog` to accept a pre-selected student (`src/components/sales/InvoiceDialog.tsx`)

- Add an optional prop `prefilledStudentId?: string` to `InvoiceDialogProps` (lines 51–60).
- Where the create-mode form initializes its student selection state, if `mode === 'create'` and `prefilledStudentId` is provided, set it as the initially selected student id (using the same code path the existing student picker uses on selection — fetch student by id if needed for the display label).
- No behavioural change for any existing caller (prop is optional and defaults to undefined).

#### 2. Add per-row "Create Invoice" trigger (`src/components/dashboard/BranchDashboard.tsx`)

- Add a new state pair near the other invoice dialog state (lines 109–113):
  ```ts
  const [createInvoiceForStudentId, setCreateInvoiceForStudentId] = useState<string | null>(null);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  ```
- In the Actions cell (lines 1145–1173), inside the same `<TableCell>`, add a small ghost button before the existing Withdraw button:
  - Icon: `FileText` (already imported), label "Invoice", classes `h-6 text-[10px]`, separated from Withdraw with a small gap.
  - `onClick` (with `e.stopPropagation()` to avoid opening the StudentDetails dialog): set `createInvoiceForStudentId = student.id` and `createInvoiceOpen = true`.
- Render a single controlled `InvoiceDialog` once, near the existing view/edit `InvoiceDialog` (around line 1480):
  ```tsx
  {createInvoiceForStudentId && (
    <InvoiceDialog
      mode="create"
      branchId={branchId}
      prefilledStudentId={createInvoiceForStudentId}
      open={createInvoiceOpen}
      onOpenChange={(open) => {
        setCreateInvoiceOpen(open);
        if (!open) setCreateInvoiceForStudentId(null);
      }}
      onInvoiceCreated={() => {
        queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
        queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
      }}
    />
  )}
  ```
- The cell remains hidden in `massEditMode` (the existing `{!massEditMode && (…)}` wrapper covers both buttons).

### Behavioural rules preserved

- Branch is locked because `branchId` is passed (existing `invoice-branch-context-restrictions` rule applies — price rules, in-context products, locked branch).
- The button is not shown for `status === 'withdrawn'` rows (they are filtered out of the list anyway).
- Student row click still opens the Student Details dialog because `e.stopPropagation()` is called on the new button.
- No existing caller of `InvoiceDialog` needs changes (new prop is optional).

### Verification

1. Morley → Students tab → ALEX NOH row shows two buttons: **Invoice** and **Withdraw**.
2. Click **Invoice** → Create Invoice dialog opens with ALEX NOH pre-selected, branch locked to Morley.
3. Closing or saving the dialog returns focus to the list; on save, the Invoice & Payment list refreshes (queries invalidated).
4. Mass Edit mode → Actions column hidden as today (no regression).
5. Withdrawn students do not appear in the list (no regression).
6. Existing **Create Invoice** button at the top of the Invoice & Payment tab continues to work unchanged (opens with no pre-selected student).

### Files affected

- `src/components/sales/InvoiceDialog.tsx` — add optional `prefilledStudentId` prop and apply it in create mode initialization.
- `src/components/dashboard/BranchDashboard.tsx` — new state, per-row Invoice button, controlled `InvoiceDialog` instance.

### Out of scope

- Bulk-invoice from Mass Edit selection.
- Pre-selecting a product/term per student.
- Any change to the Invoice & Payment tab's existing "Create Invoice" button or to other dashboards (Sales/StudentManagementList already have their own create flows).

