

## Plan: Make registration approvals appear immediately on Branch Dashboard

### Root cause (confirmed)
1. **No realtime subscription for `student_registrations`.** The realtime publication doesn't include this table, and `BranchDashboard.tsx` only subscribes to changes on `invoices`, `payments`, and `student_scheduled_classes`. So when Jonas's registration is inserted, no event reaches the open dashboard.
2. **No automatic refetch.** `pending-registrations-count` and `pending-registrations` queries have default React Query staleness — the count only updates on remount, manual refetch, or window focus.
3. **Auto-switch to Approvals tab only runs once.** The `hasSetInitialTab` ref guards the effect, so even after data refreshes the tab won't switch to Approvals.

### Changes

**1. Database migration — enable realtime on `student_registrations`**
```sql
ALTER TABLE public.student_registrations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_registrations;
```

**2. `src/components/dashboard/BranchDashboard.tsx`**
Add `student_registrations` to the realtime channel (filtered by `branch_id`). On any insert/update/delete, invalidate:
- `['pending-registrations-count', branchId]`
- `['pending-registrations', branchId, false]`

Also relax the auto-tab-switch guard so that when `pendingRegCount` (or other approval counts) transitions from 0 to >0 while the user is still on the default tab, the Approvals tab badge updates and (optionally) the tab auto-activates the first time approvals appear.

**3. `src/components/dashboard/StudentRegistrationApprovals.tsx`**
Mirror the same realtime listener inside this component (scoped to its `branchId`/`showAll` mode) so the list itself updates without remount. Also covers the SuperadminDashboard case.

### Result
- New registration submissions appear in the Branch Dashboard's Approvals tab within ~1 second.
- The Approvals tab badge count updates live.
- Works for both branch-scoped and superadmin (showAll) views.

