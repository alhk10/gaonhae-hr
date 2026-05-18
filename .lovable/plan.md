## Goal

When no fuzzy match and no search result fits, allow staff to create a new student directly from the submission, then auto-match the submission to the new student.

## UI changes — `src/components/dashboard/PublicGradingSubmissionApprovals.tsx`

Inside the existing Match dialog, add a third section at the bottom: **"Create new student from submission"**.

- Header + helper text: "No matching student? Create one using the submission details."
- Toggle button "Create new student" reveals a compact inline form.
- Form fields, prefilled from `matchingSub`:
  - First Name (required) — `matchingSub.first_name`, auto-uppercase on save
  - Last Name (required) — `matchingSub.last_name`, auto-uppercase
  - Date of Birth (required) — `matchingSub.date_of_birth`, DD/MM/YYYY via existing date helpers
  - Email (required) — `matchingSub.email`
  - Branch (required) — preselected to `matchingSub.branch_id`, editable via `branches` dropdown
  - Gender (optional) — male/female/other select (left blank if not provided)
  - Current belt (optional, readonly hint) — carried over from `matchingSub.current_belt`
- Inline validation: all 5 required fields must be present; email basic format; DOB not in future.
- Submit button "Create & Match" (single action) and Cancel collapses the form.

## Logic

New handler `handleCreateAndMatch()`:
1. Validate required fields.
2. Call `createStudent` (from `@/services/studentService`) with:
   - `first_name`, `last_name` (uppercased)
   - `certificate_name` and `display_name` defaulted to `"${first} ${last}"` uppercase
   - `date_of_birth`, `email`, `branch_id`, `gender`, `current_belt`
   - `status: 'active'`
3. On success, call existing `matchGradingSubmission(matchingSub.id, newStudent.id)`.
4. Toast success, close dialog, invalidate queries (same as `handleMatch`).
5. On error, surface message; keep form open.

No backend / schema changes. No edits to other pages.

## Verification

- Open an unmatched submission → Match dialog → expand "Create new student" → fields prefilled → submit → student appears in DB and submission flips to "Matched" badge with the new student.
- Re-open same submission: shows now matched; "Verify & Import" enabled.
- Required-field validation blocks submit with clear errors.
- Names persisted uppercase (per project memory).
