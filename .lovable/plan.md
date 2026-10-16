# Show /hello orders and registrations in the /access staff tabs

The old public forms (/pay, /grading, /fees, /comps, /guards) are already removed. /hello is the only place students order and register now, so staff need to see everything from /hello in /access. School Fees already does this. The other tabs will work the same way.

## Changes
1. **Uniforms & Guards tab**: show uniform/apparel and protection guard orders made in /hello, together with older form orders. Includes items, sizes, amount, proof, payment status, the collect checkbox and invoice link.
2. **Competitions tab**: show competition registrations made in /hello, including categories, photos/certificates, credit used, and cancelled/refunded status.
3. **Grading tab**: show grading registrations made in /hello, including slot, belt, credit used and payment status.
4. Each /hello row gets a small "Hello" tag. It uses the same statuses, clickable student name, invoice link, verify, edit, refund and delete-approval actions as the other rows. Branch passwords still only show their own branch.
5. Summary counts and CSV/print exports include /hello rows. Nothing is listed twice: if a /hello entry already became a regular row, it shows only once.
6. /hello itself is not changed.

## Technical details
- First, check how each /hello flow saves data (shared submission tables vs. hello-specific tables and invoices) and what each tab reads.
- Where a flow already writes to the tab's table, fix the tab's filters only. Where it doesn't, add read-only, session-validated `/access` functions that combine the /hello data, with a `source: 'hello'` field (the same pattern as School Fees).
- Remove duplicates by invoice/submission id. Keep the current permissions, refund flow and approval flow.
- Check: place one test order of each type in /hello, then confirm it appears once in the right /access tab with working actions.
