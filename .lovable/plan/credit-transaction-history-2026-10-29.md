# Credit transaction history

## 1. Fix the history icon on each student row
- First, find out why it fails: open Credit Management signed in as superadmin, click the clock icon, and check the error and the data that comes back (for example, a permission block on credit records, or empty or unexpected rows).
- Fix whatever is causing it, so the pop-up lists every credit change for that student.
- Improve the pop-up:
  - Wider window
  - Full description instead of a cut-off one
  - A running balance after each line
  - A clickable invoice number (opens the invoice details) wherever a credit came from or was used on an invoice
  - Who made each change

## 2. Full history list page
- Add an "All transactions" view inside Credit Management, next to the student balances (switch between Balances and Transactions).
- Show one list of every credit change for all students, newest first: Date, Student (click to open details), Type, Amount (+/-), Invoice (click to open), Description, By.
- Filters: search by student name, type (added / used / refund / overpayment), and a date range.
- Export to CSV.
- Phones show each row on two lines.

## Technical details
- Data comes from `student_credits`, joined to `students` for names and to `invoices` for invoice numbers when there is a reference. Older rows are loaded page by page to get past the 1000-row limit.
- If the cause turns out to be access rules, update the superadmin read policy through a migration.
- Dates use the DD/MM/YYYY helpers. The running balance is worked out in the app from oldest to newest.
