# "Others" option in /hello and a combined "For Action" section

## /hello
- Add an **Others** option at the bottom of the menu shown after a student is recognised (below Update Personal Information).
- Tapping it opens the same message form as **Help**. The message is saved with the student linked and confirmed with the usual "message sent" screen.

## Messages for staff
- Every /hello message (from Others or Help, recognised or not) appears in the new **For Action** section:
  - Superadmin dashboard: all branches.
  - /access Summary: only the branches the password unlocks.
- Each message row shows the date, student name (opens student details), branch, contact details and message text. It has a **Mark done** button with an optional note. Done messages leave the list.
- Unmatched messages keep their current match/create-student actions for superadmin.

## "For Action" section
- On /access Summary, rename "Approvals & verifications" to **For Action**. It holds, oldest first:
  1. Approvals and verifications (current list, unchanged)
  2. Payment shortages (moved in, same Record payment / Resolve buttons)
  3. Messages from /hello
- The type filter gains "Payment shortage" and "Message".
- The superadmin dashboard gets the same **For Action** grouping: approvals, payment shortages and /hello messages together under one heading.

## Technical details
- In `PublicHelloChat.tsx`, add an Others menu button that calls the existing `openCallback`, with type `general_callback` and the matched `student_id`.
- Add password-gated SECURITY DEFINER RPCs `access_list_chat_messages(p_password)` (branch-scoped with `_scope_has`; superadmin sees all) and `access_resolve_chat_message(p_password, p_id, p_note)`. Both set status/resolved fields on `public_chat_callback_requests` and are revoked from anon where they aren't needed.
- Add a new `ChatMessagesList` component, used in both dashboards.
- In `SummaryTab.tsx`, wrap the approvals list, `PaymentShortageList` and `ChatMessagesList` under one "For Action" card with a shared filter. In `SuperadminDashboard.tsx`, group the same three, plus `PublicHelloCallbackApprovals`, under "For Action".
