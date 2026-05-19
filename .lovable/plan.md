## Public Grading List — Mass Edit, Per-Row Edit Dialog, Checkbox on All Rows

### 1. Database

**Schema changes**:
- `grading_registrations.display_name text NULL` — overrides the row's display name on the Grading List only. Does NOT touch `students.name`.
- `students.certificate_name text NULL` — name printed on certificates for this student. Persisted on the student record so it's reused across all of their grading registrations.

**Certificate-name default chain** — when no explicit override has been chosen:
1. If the grading registration is matched to a `students` row AND `students.certificate_name` is set → use it.
2. Else if matched to a student → use `TRIM(first_name || ' ' || last_name)`.
3. Else fall back to `students.name`, then finally `gr.display_name`/`student_name` text.

**RPCs** (new, `SECURITY DEFINER`):
- `admin_update_grading_registration_slot(p_registration_id, p_slot_id)`
- `admin_update_grading_registration_branch(p_registration_id, p_branch_id)`
- `admin_update_grading_registration_display_name(p_registration_id, p_display_name)` — empty string clears.
- `admin_update_student_certificate_name(p_student_id, p_certificate_name)` — empty string clears.

Reuse: `admin_update_grading_submission_slot`, `admin_update_grading_result`.

**`get_public_grading_list`** — extend return shape with:
- `student_id uuid`, `branch_id uuid`
- `student_name` resolves to `COALESCE(gr.display_name, students.name)` for registrations
- `certificate_name text` — resolved via the default chain above. NULL for submissions
- `first_name`, `last_name` (so the dialog can show what the default would be even when `certificate_name` is already overridden)

### 2. Service layer (`gradingPaymentSubmissionService.ts`)

Extend `PublicGradingListRow` with `student_id`, `branch_id`, `certificate_name`, `first_name`, `last_name`. Add:
- `adminUpdateGradingRegistrationSlot`
- `adminUpdateGradingRegistrationBranch`
- `adminUpdateGradingRegistrationDisplayName`
- `adminUpdateStudentCertificateName`

### 3. Per-row Edit dialog (Pencil on every row)

Replace the slot-only Pencil with a unified `RowEditDialog` available on **both registrations and submissions**.

Fields (registration rows):
- **Display name** (text) — both passwords. Writes to `grading_registrations.display_name`. Blank = clear override. Does NOT touch the student record.
- **Certificate name** (text) — both passwords. Prefills with `r.certificate_name` (already resolved by the RPC: explicit student override → `first_name + last_name` → `students.name`). If the registration is matched to a student, Save writes to `students.certificate_name` (shared across all of that student's grading registrations). Blank = clear the student override (next load falls back to first+last). If the registration has no student match, this field is disabled with a tooltip.
- **Branch**, **Slot**, **Result** — as previously planned.

Submission rows: dialog shows Branch + Slot only.

Save runs one RPC per changed field, then invalidates `public-grading-list`. The inline Result dropdown remains as a quick-edit.

### 4. Mass Edit button (beside Mass Certificates)

`<Pencil/> Edit (N)` in the edit-mode header. `MassEditDialog` with optional toggled fields:
- **Result** — applied to registration rows only.
- **Slot** — limited to slots on selected rows' grading_date(s); disabled with hint if selection spans multiple dates.
- **Branch** — all branches.

Iterates selected rows, calls the relevant per-row RPC by `source`, reports `Updated X / Skipped Y`.

### 5. Checkbox on all rows

- Checkbox renders for every row in edit mode (drop the `isCertEligible` gate).
- "Select all in slot" toggles every row in the group.
- `handleDownloadSelectedCertificates` filters internally to pass/double rows and reports the skipped count.

### 6. Certificate generation

`rowToCertInput` uses `r.certificate_name` directly (already resolved by the RPC default chain). Filename helper uses the same string.

### 7. Out of scope

- No change to PDF page layout, unlock UI, or scorecard auto-compute.
- Display-name override is per-registration; certificate-name override is per-student (shared across all their gradings).
- No propagation of either name to invoices, payments, or other records.

### Technical notes

```text
Certificate name default (resolved server-side in get_public_grading_list):
  students.certificate_name
    ↳ TRIM(students.first_name || ' ' || students.last_name)
        ↳ students.name
            ↳ gr.display_name / row student_name text

RowEditDialog (registration)                    MassEditDialog (N rows)
┌──────────────────────────────────┐            ┌──────────────────────────┐
│ Display name [__________________]│            │ ☐ Change Result  [▼]     │
│ Cert. name   [__________________]│            │ ☐ Change Slot    [▼]     │
│ Branch       [▼ Balmoral]        │            │ ☐ Change Branch  [▼]     │
│ Slot         [▼ 10:00]           │            │       [Cancel][Apply to N]│
│ Result       [▼ Pass]            │            └──────────────────────────┘
│                  [Cancel][Save]  │
└──────────────────────────────────┘
Display name → grading_registrations.display_name (this registration only)
Cert. name   → students.certificate_name           (all registrations for this student)
```
