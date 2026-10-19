# Fix: Bukit Merah products not showing in External Invoices

## What I found
- The product list itself is fine: asking the server for Bukit Merah products with the Bukit Merah password (or the all-branch password) returns all 107 products.
- The same request with **no password** is refused ("Staff password required").
- The page only remembers the staff password when you unlock it. Your session was unlocked before that change was added, so the form is sending no password. The refusal is then shown as "No product found" (and the list shows "External Invoices (0)") instead of a clear message.
- This is the most likely cause, but I haven't reproduced your exact session yet. The first step below confirms it.

## What changes
1. **Confirm first:** reproduce in the preview (an old unlocked session versus a fresh unlock) to confirm the missing password is the cause.
2. **Ask for the password when needed:** if the External Invoices tab has no saved staff password, it shows a small "Re-enter staff password" box instead of an empty list. Entering it saves it for the session and loads invoices and products.
3. **Show real errors:** if the server refuses or fails, the list and the product picker show the actual message (for example "Staff password required" or "Not your branch") instead of "No product found" or "(0)".
4. **Label fix:** the picker says "Loading products…" while loading, and "Choose a branch first" only when no branch is selected.

## Technical details
- In `ExternalInvoicesTab.tsx`, read `access_pw_v1`. When it is empty, render a password prompt that validates the password by calling `list_external_invoices`, then stores it in sessionStorage and refetches.
- Surface `error` / `isLoading` from both queries in the table and in `ProductPicker` (passing `loading`, `error` and `hasBranch` props).
- No database changes.
