# Verify portal switcher coverage

## What I found

The switcher is wired up in exactly one place: the main dashboard route (`/`). It renders above the student dashboard, above the employee/manager/superadmin dashboard, and above the branch view — all three come from the same page, so all three show it.

Confirmed behaviour on `/`:
- Options are built from the account's available types (`employee`, `student`), plus `branch` when the person has branch access and is not a superadmin (superadmins already get a branch tab inside their dashboard switcher).
- The switcher hides itself when there is only one option, which is correct.
- Choice is persisted for the session and also offered on the first-login role chooser.

One real gap:
- `/branch-dashboard` (the dedicated branch route) renders the branch view without the switcher, so a dual-access person who lands there directly has no way back to their student or employee portal except by navigating to `/`.

## Proposed fix

Extract the switcher wiring (options list, effective type, change handler) out of the dashboard page into a small shared hook so both places use identical logic, then render the switcher at the top of the dedicated branch page as well.

- New `usePortalOptions` hook: returns `options`, `effectiveType`, `setActiveUserType` — the same rules already used on `/` (branch shown only for branch-access non-superadmins, single option means hidden).
- Main dashboard page: use the hook instead of its inline copy; no visible change.
- Branch page: render the switcher above the branch view, and when a non-branch portal is selected there, send the person back to `/` so the correct dashboard loads.

## Technical notes

- Files: `src/pages/Index.tsx`, `src/pages/BranchDashboardPage.tsx`, new `src/hooks/usePortalOptions.ts`.
- `src/components/dashboard/PortalSwitcher.tsx` needs no change.
- No database or auth changes; this is presentation-layer only.
