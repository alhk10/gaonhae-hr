# Two parents per student: remember every email and mobile

Today a student record holds one email and one phone. Extra emails are already quietly
collected when staff match a payment by hand (they are kept in a hidden "other emails"
list and used when suggesting matches), but phone numbers are not kept at all and
neither list is visible or editable anywhere in the app.

This change makes both parents' contact details first-class: saved on the student
profile, visible and editable by staff, learnt automatically whenever staff match a
payment by hand, and used when suggesting matches for future payments.

## What changes for users

- Student profile (Edit student) gains **Additional emails** and **Additional phone
  numbers** — add or remove as many as needed, typically the second parent's. The
  main Email and Phone stay as the primary contact.
- The student details view lists the extra emails and numbers under the contact block.
- When staff manually link a payment to a student, the email (and mobile, where the
  form collected one) used on that payment is added to that student's additional
  contacts automatically — no duplicates, and never a blank or invalid entry.
- Future payments sent from either parent's email or mobile are recognised and
  suggested for that student.
- Safety kept as-is: a contact shared by siblings still scores nothing on its own, so
  the name and birth date remain the deciding factors and a sibling is never linked
  silently.

## Technical notes

Database (one migration):
- `students.alt_phones text[] NOT NULL DEFAULT '{}'`.
- New `public._remember_student_phone(uuid, text)`, mirroring the existing
  `_remember_student_email`: normalises the number (digits only, keeps country code,
  ignores anything shorter than 7 digits), appends only when it differs from `phone`
  and every existing entry.
- New `public.admin_remember_student_contact(p_student_id uuid, p_email text,
  p_phone text)` — SECURITY DEFINER wrapper calling both helpers, for match paths that
  run from the client (guards purchases, school fees) with a branch-access check.
- `admin_match_grading_submission`, `admin_match_competition_submission`,
  `admin_match_seminar_submission` and `admin_match_school_fees_submission` also call
  the phone helper (school fees reads email/phone from the linked
  `public_chat_sessions` row; grading/competition/seminar have email only).
- The four `find_*_submission_student_matches` functions gain phone handling in the
  same shape as email: `phone_match` against `s.phone` and `s.alt_phones`, worth 0.15
  when the number is not shared, 0 and reason "shared family mobile" when it is.
  `MAX_MATCH_SCORE` in `submissionMatchConfidence.ts` moves 1.35 → 1.50; the 77%
  auto-match threshold and 10-point gap stay unchanged.

Frontend:
- `EditStudentDialog.tsx` / `AddStudentDialog.tsx`: repeatable inputs for
  `alt_emails` and `alt_phones` (email validation, `PhoneInput` for numbers, trimmed
  and lower-cased on save, blanks dropped, primary value never duplicated).
- `StudentDetailsDialog.tsx`: render both lists under Phone/Email.
- `guardsPurchaseService.ts`: candidate lookup and scorer also consider `alt_phones`
  (phone worth 1 when unshared, same treatment as email), and the manual-match path
  calls `admin_remember_student_contact`.
- `submissionApprovalSources.ts` / `UnifiedSubmissionApprovals.tsx`: after a manual
  match, call `admin_remember_student_contact` for sources whose RPC does not already
  do it, alongside the existing `rememberMatch`.
- Identity keys in `buildIdentityKeys` stay name+DOB based — unchanged, so remembered
  matches still cannot jump between siblings.
