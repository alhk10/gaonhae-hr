# Open a student card from any /access list

On /access, tapping a student's name in School Fees, Students, Grading, Competitions, Seminars and Uniforms & Guards opens a single student card showing who they are and their invoices.

## What the user sees

- Student names in those six lists become tappable (underline on hover, clear tap target on mobile).
- Tapping opens a dialog with:
  - Name, student number, branch, belt, status, birth date and age
  - Contact details: main email and phone plus any additional parent emails/numbers
  - Current term enrolment (term, class type, package, days) and credit balance
  - Invoices list: invoice number, date, status badge, total, amount paid, balance — newest first
  - Tapping an invoice expands its line items and recorded payments in place
- If a row has not been matched to a student yet (common on unmatched submissions), the name is not tappable and a small note says the payment is not linked to a student yet. Matching it first makes the name tappable.
- The card is read-only. Editing stays where it is today (Edit in the Students tab, behind the password).

## Technical details

Database (one migration):
- New `public.get_public_student_profile(p_student_id uuid)` — SECURITY DEFINER, `search_path = public`, granted to `anon` and `authenticated`. Returns a single JSON object:
  - `student`: id, student_number, first/last name, certificate_name, current_belt, status, gender, date_of_birth, branch_id, branch_name, email, phone, alt_emails, alt_phones, credit_balance
  - `enrolment`: current-term row derived the same way `get_public_student_directory` does (term_name, class_type, tier_name, enrolled_weekdays)
  - `invoices`: id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total_amount, amount_paid, balance_due, branch_name, plus nested `items` (description, quantity, unit_price, line_total, term name where present) and `payments` (payment_number, payment_date, amount, method, verification status), ordered newest first
  - No auth.uid() use; read-only, exposes only what the existing /access lists already surface.
- `get_public_grading_list` already returns `student_id`; school fees returns `student_id`; seminars and guards return `matched_student_id`. `get_public_competition_list` does not — extend it with `matched_student_id uuid` (column exists on `competition_payment_submissions`). Function signature stays the same, so the frontend types regenerate.

Frontend:
- New `src/components/grading-list/StudentProfileDialog.tsx`: props `{ studentId, open, onOpenChange }`, loads the RPC with react-query (`['public-student-profile', studentId]`), skeleton while loading, compact mobile-first layout matching the existing /access dialogs (text-xs, `max-w-[95vw] sm:max-w-2xl`, `max-h-[85vh]` scroll), dates via `@/utils/dateFormat`, money via `formatCurrency`, invoice rows expandable with a chevron.
- New `getPublicStudentProfile(studentId)` in `src/services/studentDirectoryService.ts`.
- Wire a shared `openStudent(id)` handler into:
  - `src/components/grading-list/StudentsTab.tsx` (desktop rows and mobile cards)
  - `src/components/grading-list/SchoolFeesTab.tsx` (`row.student_id`)
  - `src/components/grading-list/SeminarsTab.tsx` (`matched_student_id`)
  - `src/pages/public/PublicGradingList.tsx` grading, competitions and guards tables (`student_id` / `matched_student_id`), for both desktop table cells and mobile card headers
- Names render as a `button` styled as a link when an id exists, plain text otherwise; the click stops propagation so existing row actions (edit, select checkbox) keep working.

## Out of scope

- Editing student data from the new card.
- Invoice PDF download from the card.
