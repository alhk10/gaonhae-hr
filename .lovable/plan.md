# External Invoices: no password re-entry, own-branch only

## What changes
1. **No second password box.** The "Please re-enter your staff password" box is removed. The tab uses the password you typed when you unlocked the staff page.
2. **Old sessions:** if a page was unlocked before the password was saved, it locks itself once when opened. Staff then unlock as usual. After that, nothing asks for the password again until they lock the page.
3. **Own branch only:**
   - Branch staff see the Branch field fixed to their branch and can't change it. Their list only shows their branch's invoices, and their product list only loads their branch's prices and stock.
   - The server already refuses invoices, payments and cancellations for another branch. Every action keeps that check.
   - The all-branch password can still pick any branch.

## Technical details
- `ExternalInvoicesTab.tsx`: remove the `hasPw` state, the password prompt and `savePw`. Queries run whenever edit mode is on.
- `PublicGradingList.tsx`: on load, if `guards_list_unlocked_v1` is set but `access_pw_v1` is missing, clear the unlock keys so the normal unlock screen appears.
- In the create dialog, set `branchId` to `lockedBranchId` and disable the Branch select whenever the page is branch-locked.
- No database changes. `create_external_invoice`, `record_external_invoice_payment`, `cancel_external_invoice` and `list_external_invoice_products` already reject other branches for branch passwords.
