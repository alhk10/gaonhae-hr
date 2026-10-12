# Outstanding invoice button on /hello

## What exists today
- `/hello` already shows a popup right after a student is recognized: "X has N unpaid invoice(s)" with each invoice listed (number, date, amount) and **Pay now** / **View all invoices** / **Later** buttons. Tapping **Later** dismisses it for that student.
- The student portal login already shows a similar "Outstanding Invoices" popup with a **Pay** button per invoice using the standard payment flow.
- What is missing: once the popup is dismissed, there is no way to get back to it — the menu only shows Pay Term Fees, grading, competition, etc.

## Change
In `src/pages/public/PublicHelloChat.tsx`, on the recognized-student menu:

- Add an **Outstanding Invoice** button directly above **Pay Term Fees**, shown only when the student has unpaid invoices (the same `outstandingInvoices` list the popup already uses).
- Button shows the count and total, e.g. `Outstanding Invoice (1) · $265.00`, styled in the red/destructive style so it stands out.
- Tapping it re-opens the existing outstanding-invoices popup (clears the dismissed state), where the parent can tap **Pay now** to pay through the standard payment flow, or view/download each invoice.
- No change to the popup itself or to the student portal popup — both already work as requested.

## Technical details
- Single file edit: `src/pages/public/PublicHelloChat.tsx` (menu section around line 1686).
- Reuses existing `outstandingInvoices`, `outstandingDismissedFor` state and the existing Dialog — no new queries or database changes.
- Verify with typecheck/build; visual check of the menu with a student who has an unpaid invoice.
