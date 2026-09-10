# Past invoices: show "Paid & Verified" status

## What changes

In the /hello "View Past Invoices" list, invoices with status `verified` currently show a badge reading "Verified". Change the badge text to **Paid & Verified** (keeps the same green styling). All other statuses (paid, unpaid, partially paid, overdue) stay as they are.

## Technical notes

- `src/pages/public/PublicHelloChat.tsx` (~line 1424–1434, `past_invoices` stage): render `inv.status === 'verified' ? 'Paid & Verified' : inv.status` in the badge. The `capitalize` class may be removed for this custom label.

## Verification

- Open /hello, sign in as a returning student with a verified invoice: the badge reads "Paid & Verified".
