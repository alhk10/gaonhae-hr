# /hello: continue the chat after every completed transaction

## What changes
After any successful submission in /hello, the confirmation bubble (with the transaction code) stays, and the chat continues with:

> Is there anything else I can help you with?

followed by the same main menu buttons the student saw after being recognised (Pay fees, Grading, Uniforms, Guards, Competition, Past invoices, Update personal information, lessons, etc.).

Applies to:
- All payments: school fees, grading, uniforms & apparel, guards & accessories, competition registration, paying outstanding invoices (single or Pay all).
- Lesson booking requests.
- Non-recognised flows (callback request, registration, trial): show the same question with the "Others" options menu again.

## Behaviour details
- Picking a menu option starts a fresh transaction: cart, chosen products, proof screenshot and scan result are cleared, and a new duplicate-protection reference is used (existing safeguards against double payment stay).
- Credit balance and outstanding invoices are refreshed so the menu shows up-to-date figures. The "Outstanding invoices" popup will not re-appear for invoices just paid (pending verification) in the same visit.
- No need to re-enter student details.

## Technical
- `src/pages/public/PublicHelloChat.tsx`: extract the recognised-student menu buttons from the `matched` stage into a reusable block; render it under the terminal stages (`payment_done`, `lesson_request_done`) with the new bot bubble; for `callback_done`/`register_done`/`trial_done` render the `others` options.
- Add a `resetTransactionState()` helper (cart, payCategory, proof files, scans, selected invoices) called when a follow-up option is chosen; invalidate credit and outstanding-invoice queries; keep `outstandingDismissedFor` set so the popup stays closed.
- No database changes.
