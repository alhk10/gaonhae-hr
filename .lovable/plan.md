

## Plan: Resume where you left off after a page refresh

When you refresh, the app will restore the same page, tab, open dialog, search/filter values, and scroll position — scoped to your browser tab via `sessionStorage`. Closing the browser still gives a fresh start; only refresh/reload restores.

### What gets restored

1. Current route / page (already handled by React Router — refresh stays on the same URL).
2. Active tab on every multi-tab page (Branch Dashboard, Superadmin Dashboard, Party Management, Sales pages, Settings, Leave Management, Attendance, Payslips, etc.).
3. Open dialogs on Branch Dashboard and Sales/Invoice pages — Invoice view/edit, Create Invoice, Student Details, Create Payment, View/Edit Payment, Branch Setup, Add Student, Add Trial. Re-opens with the same target id.
4. Search inputs and filters (status filter, invoice status filter, name filter, date filter, student/employee selectors).
5. Vertical scroll position of the page.

### How it works (one shared mechanism)

Add a small reusable hook that wraps `useState` and persists to `sessionStorage` under a route-aware key. Every component that wants resume-on-refresh swaps `useState` for this hook.

```text
useState(initial)            →   useSessionState('branch-dash:tab', initial)
useState<Type|null>(null)    →   useSessionState<Type|null>('branch-dash:invoiceId', null)
```

Key rules:
- Keys are namespaced by route + feature (`/branch-dashboard:branchId:tab`) so navigating away then back doesn't pollute.
- Values JSON-serialized; non-serializable values (Dates) stored as ISO strings via small adapters.
- Cleared on logout (in `AuthContext.signOut`) so the next user starts clean.
- Cleared on route change away (optional for dialog flags, so dialogs don't pop back open if you open the same page from a fresh nav).

### Files to add

- `src/hooks/useSessionState.ts` — the persisted-state hook (typed, JSON-safe).
- `src/hooks/useScrollRestoration.ts` — saves `window.scrollY` per route into sessionStorage and restores on mount after content is ready (uses a small `requestAnimationFrame` retry loop to handle async data).

### Files to update

Replace the relevant `useState`s with `useSessionState`, and mount `useScrollRestoration()` once per page:

- `src/components/dashboard/BranchDashboard.tsx` — `activeTab`, `searchTerm`, `statusFilter`, `invoiceStatusFilter`, `invoiceDateFilter`, `invoiceNameFilter`, `selectedInvoiceId`+`invoiceDialogMode`+`invoiceDialogOpen`, `createInvoiceForStudentId`+`createInvoiceOpen`, `selectedPaymentId`+`paymentDialogMode`+`paymentDialogOpen`, `studentDetailsOpen`+`selectedStudent.id`, `branchSetupOpen`, `showAddStudentDialog`, `showAddTrialDialog`. Selected student/payment objects re-fetched from the saved id on mount.
- `src/components/dashboard/SuperadminDashboard.tsx` — `activeTab`.
- `src/pages/PartyManagement.tsx` — `activeTab`, status filter, search.
- `src/pages/sales/InvoiceManagement.tsx`, `PaymentManagement.tsx`, `ProductManagement.tsx`, `GradingManagement.tsx`, `CreditManagement.tsx`, `SalesAnalytics.tsx`, `SalesSettings.tsx`, `SalesDashboard.tsx` — active tab, search query, filter selects, open-dialog ids.
- `src/pages/sales/StudentProfile.tsx` — active tab, any open invoice/payment dialog.
- `src/pages/Attendance.tsx`, `LeaveManagement.tsx`, `Claims.tsx`, `PayrollProcessing.tsx`, `PayslipManagement.tsx`, `Payslips.tsx`, `Miscellaneous.tsx`, `Employees.tsx`, `EmployeeDetails.tsx`, `Settings.tsx`, `BranchProfitLoss.tsx`, `MyAttendance.tsx`, `SlotBooking.tsx`, `AdminSlotBooking.tsx` — active tab, search/filter inputs, primary open-dialog flags.
- `src/contexts/AuthContext.tsx` — clear all `sessionStorage` keys with the resume prefix on sign-out.
- `src/App.tsx` — no change to Router.

### Restore flow on refresh

1. React Router lands on the same URL (already correct).
2. Each page component initializes its `useSessionState` from `sessionStorage`, so tabs/filters/dialog flags come back instantly.
3. Dialogs that need server data (e.g. selected invoice) read the saved id, fire the existing fetch, and open once data resolves.
4. `useScrollRestoration` waits for the main content to render (poll up to ~1s), then sets `window.scrollTo(0, savedY)`.

### Edge cases

- Stale ids (e.g. invoice was deleted): the existing fetch returns null → the hook clears the saved id and the dialog stays closed, no error toast.
- Permission changes between refreshes: `PageAccessGuard` runs first; if access is denied the saved state on that route is irrelevant.
- Multiple browser tabs: `sessionStorage` is per-tab, so each tab resumes independently — no cross-tab interference.
- Logout: all `lov-resume:*` keys are wiped so the next sign-in starts clean.
- Public/auth routes (`/`, `/register`, `/auth/reset-password`): no resume state stored.

### Verification

1. Branch Dashboard → switch to "Invoice & Payment" tab → set status filter to "Unpaid" → search "Hannah" → open an invoice → scroll halfway → refresh → land on the same tab, same filter, same search, same invoice dialog open, same scroll position.
2. Sales → Invoices → open Create Invoice for a student → refresh → Create Invoice dialog reopens for that student.
3. Superadmin Dashboard → Approvals tab → refresh → still on Approvals.
4. Sign out → sign back in → land on default dashboard with no leftover dialogs or filters.
5. Open the same app in a second browser tab → that tab is independent and starts on its own default state.

### Out of scope

- Restoring scroll inside scrollable inner containers (only main `window` scroll).
- Restoring transient UI like dropdown-menu open state, toast queue, hover states.
- Cross-device or cross-browser persistence (sessionStorage is local).
- Restoring unsaved form input inside dialogs (only which dialog is open and for which entity).

