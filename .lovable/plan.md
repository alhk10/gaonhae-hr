## Goal
Give superadmins two extra actions in the Manage Booking dialog (`src/pages/AdminSlotBooking.tsx`) regardless of the booking's current status:

- **Override** — force-apply branch change and/or employee swap, and set the booking's `status` back to `approved`, bypassing the normal pending-only / "Select Different Branch" guard.
- **Reject** — set `status` to `rejected` for any current status (today the button only renders when status is `pending`).

Both buttons are visible only to superadmin users; regular admins keep the current behavior.

## Changes

### `src/pages/AdminSlotBooking.tsx`
1. Import `useAuth` from `@/contexts/AuthContext` and derive `const isSuperadmin = userrole === 'superadmin'`.
2. Add `handleSuperadminOverride()`:
   - If a different branch is selected → update `branch_id` / `branch_name` via existing branch-update path (skipping the `disabled` guard).
   - If a swap employee is selected → call `updateSlotBookingEmployee` with the new employee.
   - Always update `slot_bookings_new.status` to `'approved'` with a note like `Override by superadmin`.
   - Refresh data, close dialog, toast success.
3. Add `handleSuperadminReject()`:
   - Update `slot_bookings_new.status` to `'rejected'` with a note `Rejected by superadmin`, refresh, close, toast.
4. In the dialog footer (around lines 1188–1257):
   - Add an **Override** button (left cluster, amber/secondary variant) — visible only when `isSuperadmin`. Enabled whenever the dialog is open (no branch-different requirement).
   - Replace the existing pending-only Reject button condition with: render Reject when `status === 'pending'` OR `isSuperadmin`, wired to `handleSuperadminReject` for superadmins on non-pending statuses, and the existing `handleApproval(..., 'rejected', ...)` for pending.

### No DB / RPC / service changes
Reuses existing `updateSlotBookingEmployee`, branch update logic, and a direct `supabase.from('slot_bookings_new').update({ status })` (already used in `handleApproval`). No migration needed.

## Out of scope
- No changes to the `slot_booking_edit_requests` approval queue.
- No changes to non-admin (employee) booking views.
- No changes to the Cancel button behavior.