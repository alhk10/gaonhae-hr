# Standardise payment status across all lists

Today each list on /access shows its own wording and colours: grading and competitions say "pending verification"/"paid", seminars say "pending"/"paid", school fees say "Pending"/"Verified", uniforms & guards say "verified", and invoices say "draft"/"unpaid"/"paid"/"verified". Same meaning, five different words.

## One shared status vocabulary

| Shown | Meaning | Colour |
|---|---|---|
| Pending verification | Payment submitted, staff have not confirmed it yet | Amber |
| Paid | Money received / invoice settled, not yet staff-confirmed | Green |
| Paid & Verified | Staff confirmed the payment | Green |
| Rejected | Staff rejected the submission | Red |
| Cancelled | Cancelled record | Grey |
| No invoice | Nothing raised yet | Grey |

Invoice-only extras keep the same colour rule:
- Draft, Unpaid, Overdue - red
- Partially paid - amber

## Where it applies

One shared status badge used by: School fees, Students (invoice column), Grading, Competitions, Seminars, Uniforms & guards, and the invoice lists and student profile dialog.

Status filter dropdowns in each tab are aligned to the same four options: All, Pending verification, Paid & Verified, Rejected (invoices keep their extra options).

## Technical notes

- Add `src/components/grading-list/StatusBadge.tsx` plus a `normalizeStatus()` helper that maps every raw value (`pending_verification`, `pending verification`, `pending`, `paid`, `verified`, `rejected`, `cancelled`, `partially_paid`, `draft`, `sent`, `unpaid`, `overdue`, null) to one canonical key with label and colour classes.
- Replace the local `statusVariant` / `statusClass` / `statusLabel` / `invoiceBadge` / `invoiceLabel` functions in `PublicGradingList.tsx`, `SeminarsTab.tsx`, `SchoolFeesTab.tsx`, `StudentsTab.tsx`, `PublicGuardsPurchaseList.tsx`, `StudentProfileDialog.tsx`, and the unified submissions list with the shared badge.
- Presentation only: no database changes, no change to stored status values, and existing filter/action conditions keep reading the raw values so behaviour is unchanged.
