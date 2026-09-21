# Expand match history and safely undo matches

## Match history details

- Make every history card clickable, with a clear expand indicator and keyboard-accessible open/close behavior.
- Expand the card in place to show the available original submission details: reference, submitted name, date of birth, email/contact, branch, amount, payment method, matched student, previous student, confidence, staff member, notes, and linked invoice.
- Load details only when a row is expanded so the history window remains fast on mobile.
- Keep the compact current layout when collapsed and ensure long values wrap cleanly on narrow screens.

## Undo or correct a match

- Add an **Undo matching** action inside expanded details.
- Show a confirmation explaining everything that will move.
- If no invoice has been created, undo returns the submission to **Unmatched**.
- If an invoice already exists, require staff to select the correct student, then atomically move the submission and invoice to that student. Also move source-linked records such as grading registration or entitlements where applicable, so the invoice and activity never point to different students.
- Preserve the invoice number, payment, verification state, line items, and totals; this is a reassignment, not a deletion or refund.
- Prevent unsafe partial changes: if any required linked record cannot be moved, roll back the entire operation and show the reason.

## Audit and future matching

- Append an audit event for every undo or reassignment, recording the old student, new student or unmatched state, acting staff member, time, and linked invoice.
- Update remembered matching rules so the incorrect student is blocked for that submitted identity; when a replacement is chosen, remember the corrected student as preferred.
- Refresh both match history and the combined approvals list immediately after success.

## Technical details

- Add a security-definer Supabase RPC for history detail lookup and a second transaction-safe RPC for undo/reassignment across grading, competition, seminar, school fees, and uniforms/guards.
- Enforce existing staff/branch access checks in the RPCs; do not expose unrestricted table updates.
- Extend the match-history service with detail and undo methods, then add expandable state, loading/error states, replacement-student search, and confirmation UI to the existing history dialog.
- Verify pre-invoice undo, imported-invoice reassignment, prior-student restoration, remembered-match updates, audit entries, duplicate protection, mobile layout, and each submission source end to end.
