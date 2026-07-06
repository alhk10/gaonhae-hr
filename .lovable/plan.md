## Goal
Allow superadmins to tag each SMS device to one or many branches, and route outbound SMS to the device tagged for the recipient's branch.

## Database
New join table `public.sms_device_branches`:
- `device_id uuid` → `sms_devices.id` (cascade delete)
- `branch_id uuid` → `branches.id` (cascade delete)
- PK `(device_id, branch_id)`
- GRANTs: `authenticated` (select), `service_role` (all). RLS: select for authenticated; insert/update/delete via `is_superadmin()` (existing helper).

No changes to `sms_devices` schema. `sms_outbound` already has the recipient phone; branch is derived from the linked student (or, for manual sends, from the campaign's branch context — see Routing below).

## Routing rule
- A device with **zero tags** = wildcard (handles any branch — preserves current behavior for the existing device).
- A device with tags = only picks up messages whose recipient branch is in its tag set.
- `sms-fetch-pending` edge function will, per request:
  1. Look up the calling device's tagged branch_ids.
  2. If empty → fetch pending as today (any branch).
  3. Else → join `sms_outbound → students.branch_id` and filter `IN (tagged branches)`. Messages without a resolvable branch (manual sends with no branch) fall through to wildcard devices only.

## Manual send branch context
`createCampaign` already accepts a `filters` blob; the Manual tab will add an optional "Branch" select (single) so manual sends carry a `branch_id` on the outbound row for routing. New nullable column `sms_outbound.branch_id uuid` (backfilled from `students.branch_id` on insert via existing service code). Existing rows stay null → wildcard.

## UI (Devices tab, `src/pages/SmsBridge.tsx`)
- New "Branches" column between Label and Delay.
- Cell shows chips of tagged branch names + a "+" popover with a checkbox list of all branches (uses existing `useBranches`).
- Toggling a checkbox inserts/deletes a row in `sms_device_branches` and refreshes.
- Untagged device shows a muted "All branches" chip.
- Superadmin-only (already the case for this tab).

## Service layer (`src/services/smsService.ts`)
- `listDeviceBranches(): Promise<Record<deviceId, string[]>>`
- `setDeviceBranch(deviceId, branchId, enabled: boolean)`
- Extend outbound creation in `createCampaign` to write `branch_id` (from student or manual selector).

## Files touched
- Migration: create `sms_device_branches`, add `sms_outbound.branch_id`.
- `supabase/functions/sms-fetch-pending/index.ts` — routing filter.
- `src/services/smsService.ts` — new helpers, outbound branch_id.
- `src/pages/SmsBridge.tsx` — Branches column + popover, Manual tab branch select.

## Out of scope
- No changes to Android app (routing is server-side; device just polls as today).
- No per-branch load balancing across multiple wildcard devices.
- No historical backfill of `sms_outbound.branch_id`.