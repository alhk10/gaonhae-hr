# Fix: term badge missing for Ashley Leong and Coco Kuo

## Why
Ashley and Coco came in as payment submissions, not as staff-added grading registrations. The new term lookup only checks registrations, so they get no term badge at all.

## Fix
- Update `access_grading_term_status` to also include grading payment submissions: use `matched_student_id`, `resolved_grading_slot_id` and their `branch_id`, and resolve the term the same way (event year/term tag, then grading date).
- Unmatched submissions (no student) still show no term badge.
- No frontend change needed: rows already look up by slot + student.

## Check
- Query the 08/10/2026 grading and confirm Ashley and Coco now return a T3 status, then confirm on screen.
