# Let all-branch password and superadmin skip payment proof

## Current state
- Signed-in superadmin (Record Payment in dashboards) can already save PayNow/bank transfer payments without proof.
- `/access` Record Payment and External Invoices payment both require proof for PayNow/bank transfer, and the server function `access_record_payment` also refuses without proof.

## Changes
1. **Server**: update `access_record_payment` so the proof requirement is skipped when the password's scope is all-branch (Hp97533488). Branch passwords still require proof. PDF rejection stays.
2. **/access Record Payment dialog**: when unlocked with all-branch access, proof becomes optional (label "optional"), Save no longer blocked.
3. **/access External Invoices payment**: same optional-proof behaviour for all-branch access (and its server path, if it uses a separate check).
4. Payments saved without proof get a note "Proof bypassed by all-branch/superadmin" for audit.

## Not changed
- Public forms (/hello, /perthcomp, /rental) still require proof from customers.
- Auto-verification rules unchanged: a non-cash payment without proof stays pending until verified.
