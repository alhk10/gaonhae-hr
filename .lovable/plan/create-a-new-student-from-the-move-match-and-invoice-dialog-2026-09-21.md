# Create a new student from the "Move match and invoice" dialog

When staff move a payment to the correct student but that student doesn't exist yet, they currently have to leave the screen. This adds a way to create the student right there.

## What changes

In the Move match and invoice dialog (Match history > Undo matching), next to the student search:

- A "New student" button appears beside the search box.
- It opens the same Add Student form already used on the Students tab of /access, prefilled from the payment submission: first and last name, date of birth, email, mobile, branch, and belt where the submission has them. Staff can adjust anything before saving.
- Saving creates the student immediately, with the existing duplicate warning ("a student with this name and birth date already exists — add anyway?").
- The newly created student is then selected automatically in the search list, so staff just press "Move invoice".

Nothing else about the move behaviour changes: payment, items, totals and verification stay as they are.

## Technical notes

- Reuse `src/components/grading-list/AddStudentDialog.tsx` (already backed by the `admin_create_student_public` RPC). Extend it with optional `initialValues` and change `onCreated` to receive the created student id so the caller can preselect it. The RPC already returns the new id; `createStudentPublic` in `src/services/studentDirectoryService.ts` will be adjusted to surface it if it doesn't already.
- `src/components/dashboard/MatchHistoryDialog.tsx`: add the button and dialog state, map fields from the loaded `get_submission_match_event_detail` payload (submitted name, DOB, email, phone, branch, belt) into the prefill, and on create set `replacementId` plus seed the search box with the new student's name so it appears in the results list.
- No database changes required.
