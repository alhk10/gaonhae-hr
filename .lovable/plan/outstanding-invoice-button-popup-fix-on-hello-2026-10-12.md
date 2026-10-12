# Outstanding invoice button + popup fix on /hello

## Root cause of the missing popup
- `/hello` already has an outstanding-invoice popup after recognition, but its filter excludes invoices with status `draft`.
- Ellie Xu's only unpaid invoice (INV-2026-00512, $214.00) is a **draft**, so the list came back empty and no popup appeared. The database lookup returns drafts; only the screen filter hides them.

## Changes (single file: `src/pages/public/PublicHelloChat.tsx`)

1. **Count draft invoices as outstanding** — remove `draft` from the excluded statuses in the `outstandingInvoices` filter (keep excluding `cancelled` and `refunded`). This makes the existing popup appear for Ellie and any student with a draft/unpaid invoice.

2. **Add an "Outstanding Invoice" button above Pay Term Fees** — shown only when the student has outstanding invoices:
   - Label shows count and total, e.g. `Outstanding Invoice (1) · $214.00`, in the red/destructive style so it stands out.
   - Tapping it re-opens the existing outstanding-invoices popup (clears the dismissed state), where the parent can tap **Pay now** (standard payment flow) or view/download each invoice.

3. No changes to the popup itself, the database, or the student portal (its login popup already works).

## Verification
- Typecheck/build.
- Confirm via database that Ellie Xu's popup would now trigger (draft, $214 balance).
