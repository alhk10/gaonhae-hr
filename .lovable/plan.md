

## Plan: Drive Grading List off `grading_registrations`, not lesson invoice items

### Root cause

`src/components/sales/GradingListTab.tsx` (lines 184–347) builds the student list by querying lesson invoice items where `metadata.term_id === selectedTerm`. Daniel/Elliot/Earl/TEO each have a `grading_registrations` row correctly tagged to **Term 1 2026** (with `ready_for_grading = true` and `grading_slot_id` set), but their lesson invoice items live in **Term 2 2026** — or, in Earl's case, there is no lesson item at all. So the Term 1 view is empty.

The user's rule: *if a grading invoice has been issued, treat the student as ready for grading and surface them under the term of the grading slot.* This is exactly what `grading_registrations` already records (after the previous slot-derived term fix and backfill). The list just isn't reading from it.

### Fix

#### 1. New primary source for the list: `grading_registrations`

Rewrite the `grading-list-students` query in `GradingListTab.tsx`:

1. Fetch all `grading_registrations` for the selected term (`term_id = selectedTerm`).
2. Filter to active students at the selected branch:
   - Pull `students` rows for those `student_id`s, keep `status ilike 'active'`.
   - Branch scoping: keep a registration if the student has **any** invoice (any status) at `selectedBranch` containing either (a) a lesson item or (b) a grading line item linked to that registration. This preserves the current "branch-relevant" behaviour without requiring the lesson term to match.
3. Build each row from the registration:
   - `ready_for_grading`, `result`, `certificate_issued`, `certificate_ii_issued`, `grading_slot_id` → directly from the registration.
   - `current_belt` / `target_belt` → from the registration (falls back to student record if null).
   - `grading_slot_title` / `grading_slot_date` → join `grading_slots` by `grading_slot_id` (already done).
   - `grading_paid` → existing logic (look up `invoice_item_id → invoices.status`); when `invoice_item_id` is null, attempt fallback: find any invoice at `selectedBranch` for this student whose item has `metadata.grading_slot_id = registration.grading_slot_id`, and use that invoice's status.
   - `lessons_attended` → keep existing query (term date range + branch).
   - `invoice_id` → prefer the grading invoice (from `invoice_item_id` lookup or the slot-id fallback above); else any branch lesson invoice for the student in the term; else null. Only used to wire the existing **View Invoice** action.

#### 2. Term dropdown: include any term that has registrations, not just lesson invoices

Update `invoicedTermIds` (lines 122–150) to also include term ids from `grading_registrations` for students at `selectedBranch` (using the same branch-scoping rule as #1.2). This ensures **Term 1 2026** stays selectable for Morley even though the lesson invoices sit in Term 2.

#### 3. Keep "Mass Edit" / batch save behaviour

The existing `batchSaveMutation` (lines 407+) updates `grading_registrations` by `registration_id`; since every row in the new list now comes from a real registration, the `registration_id` is always populated. The "create new registration if missing" branch becomes unreachable for normal flow but is kept as a safety net for staff manually adding a never-invoiced student via Mass Edit.

#### 4. Empty-state copy

Change the empty message from *"No active students found with invoices for this term."* to *"No grading registrations for this term yet."* so it reflects the new data source.

### No DB changes

`grading_registrations` already has every field we need (term, slot, belts, ready, result, certificates, invoice_item_id). No migration.

### Files affected

- `src/components/sales/GradingListTab.tsx` — replace the students query, extend `invoicedTermIds` query, update empty-state copy.

### Verification (Morley → Grading → Term 1 2026)

1. Daniel, Earl John, Elliot, TEO all appear with **Ready ✓** pre-checked.
2. Each row shows the correct slot (11 Apr 2026, the right time) and **Grading Paid** reflects their grading-invoice status.
3. **View Invoice** opens the grading invoice (or the lesson invoice as fallback for Daniel — he has both).
4. Switching to **Term 2 2026** at Morley no longer lists these four for grading (their registrations live in Term 1).
5. Mass Edit → toggle Ready / change slot / save → updates persist (registration_id path).
6. A future student with only a lesson invoice (no grading registration yet) does **not** appear — matches the new "registration drives the list" model. They will appear once a grading invoice creates the registration, which is the user's stated rule.

### Out of scope

- Changing how grading registrations are created (already handled in the previous slot-term fix).
- Adding a "non-grading-invoice" path for surfacing students (per the user, the grading invoice is the trigger).
- Backfilling registrations for any student outside the four already corrected.

