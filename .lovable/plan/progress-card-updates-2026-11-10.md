# Progress Card updates

## 1. Simplify the card
- Remove "Nearly Ready" (only Yes / No) from the dialog, PDF and labels; existing "nearly" values show as No.
- Remove the Comments (optional) box from the dialog and PDF.

## 2. Auto-tick Ready for grading
- Saving a card with Yes ticks the student's Ready for grading badge for that term (same server state used by Attendance/Students/`/hello`). Saving No does not untick it (staff can still untick by hand).

## 3. Badge in Students list
- When Progress Card is on for the branch, each row in `/access` Students shows a Progress card badge (filled when a card exists for the current term, outline when not); clicking opens the card dialog.

## 4. View as PDF
- `/access` Grading tab: a Progress card button on each row opens/downloads that student's card PDF for the grading's term.
- `/hello`: inside the Grading section, a "Progress cards" list per recognised student, each opening its PDF.

## 5. `/hello` sign-in pop-up
- When a recognised student has a saved card they have not viewed, show a pop-up after sign-in with: View progress card, Register for grading test, Upload payment proof (both reuse the existing grading registration and proof flows). Viewing marks the card as seen. Fits into existing popup order after unpaid invoices.

## Technical details
- `student_progress_cards`: add `viewed_at timestamptz`.
- `access_progress_card_upsert`: when readiness = 'yes', call the existing ready-for-grading setter for student/term. Validate readiness in ('yes','no').
- New session-validated SECURITY DEFINER RPCs: `hello_progress_cards(session)` (list for recognised students) and `hello_mark_progress_card_viewed(session, card_id)`.
- Reuse `progressCardPdf.ts` to generate a single-card PDF; add `access_progress_card_list` usage in StudentsTab and grading rows.
- Update `progressCard.ts` types/labels and existing tests.
