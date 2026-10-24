# /access Students tab: tidy rows + term payment filter

## 1. Standardise row formatting
- Every column left-aligned and vertically centred, with matching header alignment (Credit stays right-aligned as a money column).
- Same text size in every column: main line in normal size, second line (student number/DOB, phone, term, amount due) in small grey text.
- Name and DOB line kept together (student number on one line, DOB beside it where space allows) so rows have a consistent height.
- Belt and Branch shown as single tidy text lines; badges (status, term payment) the same height and style.
- Edit/invoice icons aligned to the right edge.
- The mobile card layout gets the same order and text sizes.

## 2. Add "Term payment" filter
New dropdown next to Branch and Status:
- All term payments
- No invoice
- Draft
- Unpaid / Sent / Overdue (amount due)
- Partially paid
- Paid (awaiting verification)
- Paid & Verified

It works with search, branch and status filters, and the "Showing N students" count updates.

## Technical details
- File: `src/components/grading-list/StudentsTab.tsx`. Replace inherited centred alignment with explicit `text-left align-middle` classes on `TableHead`/`TableCell`.
- Filter applies on the client to `invoice_status` (null = No invoice) on the loaded rows. The list loads at most 200 students, so with very broad searches the filter only covers those 200 (the existing notice still shows).
