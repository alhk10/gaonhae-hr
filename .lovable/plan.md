

## Plan: Read-Only Student Dashboard for Branch Access Users

### Changes

**`src/components/dashboard/StudentDashboard.tsx`**

1. Add `readOnly?: boolean` prop to `StudentDashboardProps`
2. Add `showActionBlocked` state and an `AlertDialog` with title "Action Not Allowed" and message "Please use the Branch Dashboard to perform this function."
3. Create `guardAction(callback)` helper — shows blocked dialog if `readOnly`, otherwise runs callback
4. All tabs (Overview, Profile, Invoices, Schedule) remain fully navigable and viewable
5. Guard all mutation triggers across ALL tabs:
   - **Overview tab**: Pay School Fees button, Pay Grading button, invoice Pay buttons (`CreatePaymentDialog`)
   - **Profile tab**: Edit Profile button, Submit for Approval button, Photo Upload button, Photo Remove button
   - **Invoices tab**: any Pay buttons on unpaid invoices
   - **Schedule tab**: any action buttons if present
6. Suppress auto-popup dialogs when `readOnly`: unpaid invoice reminder, profile completion prompt, grading congratulations

**`src/components/dashboard/EmployeeDashboard.tsx`**

- Pass `readOnly={true}` to `<StudentDashboard>` when rendered from the Students tab

