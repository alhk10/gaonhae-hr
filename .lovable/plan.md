# Fix branch not saving on a grading registration

## What's wrong

Two separate problems are stacked on this row.

1. **The branch never saves.** For registrations, the save routine ignores the branch you picked entirely — it only tries to move the person to a grading slot at that branch on the same date. If no such slot exists (there is no Kembangan slot on 27/09/2026 for this belt), nothing changes at all.
2. **Even if it saved, the list would still show Yishun.** The grading list shows the *student's* home branch first, falling back to the slot's branch. This registration is attached to the student CHAN JIA LOK, whose home branch is Yishun — so Yishun is shown no matter what you choose in the dialog.

On top of that, JORDAN CHAN JIA LE is a different person from CHAN JIA LOK, but this registration sits on Chan Jia Lok's account with only the displayed name changed.

## What will change

**Branch on a grading registration becomes a real, saved value**

- A branch can be stored on each grading registration.
- Saving the dialog stores the branch you chose, and — as you asked — also moves the person to a grading slot at that branch on the same date when one exists. If no matching slot exists, the branch is still saved and the existing time slot is kept, with a note telling you no slot at that branch was found on that date.
- The grading list, printouts and branch filter use the registration's saved branch when one is set, otherwise the student's home branch as today.

**Correcting this specific entry**

- Add a way to move a registration onto the correct student from the same edit dialog (search and pick a student), so entries filed under the wrong person can be corrected without deleting and re-entering.
- Jordan Chan Jia Le has no student record yet. Once you create him (or tell me to create him under Kembangan), I can move this 27/09/2026 Red Tip >> Red registration onto his account. Until then I'll set the registration's branch to Kembangan so the list reads correctly.

## Technical notes

- Migration: add `branch_id text` (nullable, FK to `branches`) to `grading_registrations`.
- Rewrite `admin_update_grading_registration_branch` to set `branch_id` and only reassign `grading_slot_id` when a same-date slot exists at the target branch; return whether a slot was found so the UI can show the note.
- `get_public_grading_list`: change the registration branch expression from `COALESCE(s.branch_id, gs.branch_id)` to `COALESCE(gr.branch_id, s.branch_id, gs.branch_id)` and join branches on that value; keep column order and positions unchanged.
- New `admin_update_grading_registration_student(p_registration_id, p_student_id)` (SECURITY DEFINER) plus a student picker in the grading edit dialog, reusing the existing search used by the match dialogs.
- Frontend: `gradingPaymentSubmissionService.ts` and the grading edit dialog in the `/access` grading list.
