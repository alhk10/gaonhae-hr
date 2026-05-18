## Changes to `/grading-list` (PublicGradingList.tsx)

### 1. Password gating — two-tier unlock for all inline actions
All inline action buttons and sensitive columns (amount, payment proof, verify, reject, update-slot, delete) are hidden by default. They render only after the user clicks the lock icon and enters a valid password. Once unlocked, the level persists for the session; locking again clears it.

Two valid passwords:

- **`Hp97533488` → standard unlock**: shows amount, payment proof, verify, reject, update-slot.
- **`39SeagullWalk` → full unlock**: everything in standard unlock **plus** delete and any other admin-only functions.

Delete is the only action gated exclusively behind `39SeagullWalk`. Every other inline action is available under either password.

### 2. Update-slot dialog — show every slot on the row's grading date
Currently the dropdown only lists slots for the row's branch filtered by the student's belt. Replace with a fetch of every active grading slot on that row's `grading_date`, across all branches, with no belt filter.

Implementation:
- Add new public RPC `get_public_grading_slots_by_date(p_date date)` returning `id, branch_id, branch_name, grading_date, start_time, end_time, title` for all active slots on that date.
- Add `getPublicGradingSlotsByDate(date)` helper in `gradingPaymentSubmissionService.ts`.
- In the dialog, replace the existing `useQuery` (keyed by `branch_id`) with one keyed by `slotEditRow.grading_date`.

### 3. Dropdown label — show slot title
Replace `{formatDate(s.grading_date)} {s.start_time} · {s.branch_name}` with `{s.title || fallback}` where fallback = existing date/time/branch string (for slots without a title). Apply to both `SelectValue` (current selection) and `SelectItem` rows.

### Files

```text
src/pages/public/PublicGradingList.tsx       — two-tier password unlock; gate all inline
                                                 actions + amount/proof columns behind
                                                 unlock level; swap slot dialog query +
                                                 dropdown label
src/services/gradingPaymentSubmissionService.ts
                                              — add getPublicGradingSlotsByDate()
supabase migration                            — create get_public_grading_slots_by_date RPC
                                                 (SECURITY DEFINER, returns active slots
                                                 joined to branches)
```

### Out of scope
No changes to rejection logic, PDF export, or other unrelated UI.
