## Redesign `/guardspurchase-list`

Make the table compact and move secondary info into a Details dialog. Remove the student-matching flow (will live in superadmin dashboard later).

### Table columns (compact)
1. Submitted (date + reference, small)
2. Branch
3. Student (first + last name, DOB small)
4. Items (qty × label, stacked)
5. Amount (total, GST line small)
6. Proof — clickable thumbnail (~40px) opening existing proof lightbox; "—" if none
7. Collected — checkbox + collected date
8. Status — badge + verify/reject buttons (kept, staff workflow)
9. Actions — "Details" button

Tighter row padding (`py-1.5 px-2`), `text-xs`, sticky header optional.

### Details dialog (new)
Opens from row "Details" button. Shows all fields currently in the table that we removed:
- Buyer full info (name, DOB, gender, current belt)
- Contact (email, phone)
- Payment method + proof thumbnail
- Items breakdown with prices
- Total / GST
- Reference number, created_at, branch
- Notes if any
Read-only; no edit actions inside.

### Removals
- Remove "Match" button column behavior + `openMatch`, match dialog, `matches`, `matchLoading`, `findStudentMatches`, `createStudentFromPurchase`, `createInvoiceForPurchase`, `handleConfirmMatch`, `handleCreateStudentAndInvoice` imports/usages from this page only (service functions stay for future superadmin use).
- Remove the "Invoiced" badge column (matching is superadmin-only now).

### Files
- `src/pages/public/PublicGuardsPurchaseList.tsx` — refactor as above.

No DB changes, no service changes.
