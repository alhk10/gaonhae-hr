# Remove restrictions on entering grading information

Right now the invoice screen only offers grading slots whose belt list and age range match the student, which is why YUZHOU HE (Yellow Tip, Morley) sees "No grading slots" even though a Morley grading event exists — that event's fee list skips White/Yellow, so nothing matches.

## What changes

- The Term/Slot picker on an invoice lists **every active grading slot at the branch**, regardless of the student's belt or age. Slots that fall outside the usual belt/age criteria are still shown, marked in amber so it's obvious it's an exception.
- The Add (+) button is no longer blocked when no "matching" slot exists.
- The grading fee (product) dropdown likewise stops hiding fees that don't match the student's current belt, so staff can enter the correct grading themselves.
- Assigning a slot from the branch dashboard Grading tab uses the same unrestricted list, so "Not Assigned" rows can always be given a slot.
- If a branch genuinely has no active grading event, the message stays "No grading slots — create one in Sales → Grading".

Nothing else about grading changes: fees, GST, invoices, registrations and results behave exactly as today.

## Technical detail

- `src/components/sales/InvoiceDialog.tsx`: `getFilteredGradingSlots()` keeps only the branch filter (branch_id or available_branch_ids); belt and age filters are dropped. Grading product filtering (`isGradingProductForBelt`) no longer excludes non-matching fees — those IDs are added to the existing out-of-criteria amber set instead. Add-button disabled condition drops the grading-slot check.
- Slot assignment UI used by the branch dashboard Grading tab (`BranchGradingList.tsx` / the slot-assign dialog it opens) drops its belt/age filter the same way, keeping the branch filter.
- Auto-select of a single slot still applies when exactly one branch slot exists.
- No database or schema change.
