## Goal
Show the grading slot **title** in the public grading payment dropdown instead of the `DD/MM/YYYY HH:MM` text. Location/branch suffix remains.

## Changes

1. **DB migration** — update `get_public_grading_slots` RPC to also return `gs.title`.
2. **Service type** (`src/services/gradingPaymentSubmissionService.ts`) — add `title: string | null` to `PublicGradingSlot`.
3. **Dropdown** (`src/pages/public/PublicGradingPayment.tsx`, ~line 515-525) — render `{title || dateLbl+timeLbl} — {where}`. Fallback to existing date/time format when title is missing so legacy slots still display.

No other UI or business logic changes.