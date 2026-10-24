# Competitions: verify without a grading card, with a reminder

## What you'll see
- Clicking **Verify** (the green tick) on a competition entry no longer fails with "Grading card upload is required before verification".
- If the entry has no grading card yet, a reminder window opens first: "No grading card uploaded for <name> yet. Please upload it now, or verify and upload later." It has three buttons:
  - **Upload & verify**: add files (browse or paste), then verify in one step.
  - **Verify without card**: verifies straight away. The upload icon stays on the row so the card can be added later.
  - **Cancel**: closes the window and changes nothing.
- Entries that already have a grading card verify straight away, as now.
- Automatic verification (an exact screenshot match) no longer waits for the grading card either.

## Technical details
- Database, in a migration:
  - Remove the `require_grading_card` check from `admin_verify_competition_submission`.
  - Remove the grading-card skip from `_auto_verify_scanned_submission`.
  - The event setting stays, and is now used only for the reminder.
- `PublicGradingList.tsx` (Competitions section): `handleVerify(id)` looks up the row. If `grading_card_urls` is empty, it opens `GradingCardUploadDialog` with `pendingVerify: true`; otherwise it calls `doVerify`.
- `GradingCardUploadDialog.tsx`: in `pendingVerify` mode, show the reminder text plus a "Verify without card" button that calls `onVerifyAfter` and closes the dialog. "Upload & verify" keeps the existing behaviour.
