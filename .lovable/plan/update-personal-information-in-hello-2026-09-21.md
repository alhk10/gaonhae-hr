# Update Personal Information in /hello

Add an "Update Personal Information" option to the menu a recognised student sees in the /hello chat (below View Past Invoices), opening a short form.

## What the parent can edit

- First name, last name
- Toggle: show last name first on certificates
- Date of birth (day / month / year pickers)
- Contact 1 and Contact 2 (mobile numbers)
- Email 1 and Email 2

The form opens pre-filled with what is already on record. Each extra contact/email can be removed with an x.

## What saves when

- Saved immediately: Contact 1, Contact 2, Email 1, Email 2, and the certificate name-order toggle.
- Needs approval: first name, last name, date of birth. These are submitted as a request that appears in the existing student-update approvals on the branch dashboard and superadmin dashboard. Until approved, the record keeps the old values and the chat shows "Waiting for staff approval".

If the parent changes both kinds in one save, the contact changes apply straight away and a confirmation says the name/birth date changes were sent for approval.

## Checks

- School/staff email addresses stay blocked (existing block list).
- Emails must look valid; duplicates and blanks are ignored.
- Names are stored in uppercase, matching the rest of the system.
- Birth date can be changed, with a note that the new date must be used next time to be recognised.

## Technical notes

- New SECURITY DEFINER RPC `update_chat_student_personal_info(p_session_id, p_student_id, ...)` validating the chat session against the student (same pattern as `getChatStudentCredit` / `_validate_public_chat_session`), which:
  - writes primary + alternate emails/phones onto `students.email`, `alt_emails`, `phone`, `alt_phones` (normalised, deduplicated, blocked addresses rejected);
  - recomputes `students.certificate_name` as "LAST FIRST" or "FIRST LAST" from the current names based on the toggle;
  - inserts a row in `student_update_requests` with only the pending fields (`first_name`, `last_name`, `date_of_birth`) when those differ;
  - logs to `student_change_logs`.
- Toggle state is derived from whether `certificate_name` currently starts with the last name; no new column.
- Anonymous execute granted on the RPC only (session-validated); no direct table access from the public client.
- Frontend: new `personal_info` stage in `src/pages/public/PublicHelloChat.tsx` with the form card and menu button; service function in `src/services/publicChatService.ts`; a small query to load current contacts for prefill.
- Approvals UI needs no change — `StudentUpdateApprovals` already lists pending `student_update_requests` and applies the changes on approval.
