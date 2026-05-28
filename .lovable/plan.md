# Seminars Booking & Admin Verification

Mirror the existing Competition (`/comps`) flow for Seminar bookings, plus a new Seminars tab in `/grading-list`.

## 1. Public booking page `/seminars`

New file `src/pages/public/PublicSeminarPayment.tsx`, mounted at `/seminars`. Visual/UX mirror of `PublicCompetitionPayment.tsx`.

**Form fields (visitor input):**
- First name, Last name
- Email
- Date of birth (Day/Month/Year pickers — reuse `DobPicker`)
- Branch (defaults to Bukit Merah; uses `getPublicBranches`)
- Gender (Male / Female / Other)
- Current belt (uses `getBeltLevelsForCountry`, filtered by age)

**Seminar package selection (radio, single choice):**
1. Sat 13 Jun 2026, 4:00 PM — Bukit Merah — **$81.75**
2. Sat 20 Jun 2026, 4:00 PM — Bukit Merah — **$81.75**
3. Sat 13 & 20 Jun 2026, 4:00 PM — Bukit Merah — **$130.80**

Packages stored as a static constant `SEMINAR_OPTIONS` for now (label + amount + session dates). Submission persists which option was chosen and the resolved amount.

**Payment:** Reuse `PaymentInfoDisplay` (PayNow / Bank Transfer for SG) and `ProofOfPaymentUpload`. Submit button disabled until name, DOB, branch, gender, belt, package and proof are all set.

On submit, calls a new RPC `submit_seminar_payment(_row jsonb)` that inserts into `seminar_payment_submissions`. Shows the same green success card as `/comps`.

## 2. Database

New migration creates one table + supporting RPCs (mirrors the competition submission set).

- `public.seminar_payment_submissions`
  - first_name, last_name, email, dob (date), branch_id, gender, current_belt
  - package_code (`single_13`, `single_20`, `combo`), amount (numeric), session_dates (date[])
  - payment_method, proof_url
  - sale_status (`pending` | `paid` | `rejected`) default `pending`
  - collected (bool, default false), collected_at, collected_by
  - matched_student_id, invoice_id, verified_by, verified_at, rejection_reason
  - created_at, updated_at
- GRANTs for anon (insert via RPC only), authenticated (select via RPC), service_role (all)
- RLS enabled; no direct-table policies for anon — all access through SECURITY DEFINER RPCs.
- RPCs:
  - `submit_seminar_payment(_row jsonb)` — anon-callable insert
  - `get_public_seminar_list(p_branch text default null, p_status text default null)` — list rows for admin tab
  - `find_seminar_submission_student_matches(p_id uuid)` — fuzzy match by name + dob + branch (mirror competition impl)
  - `admin_match_seminar_submission(p_id uuid, p_student_id uuid)` — link existing student
  - `admin_import_seminar_submission(p_id uuid, p_verified_by text)` — create new student from submission
  - `admin_create_seminar_invoice(p_id uuid)` — once a student is linked, create an invoice for the chosen seminar product(s); set submission `invoice_id`, `sale_status='paid'`, `verified_by`, `verified_at`
  - `admin_mark_seminar_collected(p_id uuid, p_collected bool)` — toggle collected flag
  - `admin_reject_seminar_submission(p_id uuid, p_reason text)`
  - `admin_delete_seminar_submission(p_id uuid)` and `admin_seminar_submission_delete_context(p_id uuid)`

Invoice creation uses the existing `Self-Defense Seminar` product (or a new "Unarmed Combat Seminar" product if one is added later — TBD by user). For the combo package, two line items are added.

## 3. `/grading-list` — new Seminars tab

Edit `src/pages/public/PublicGradingList.tsx`:
- Add `<TabsTrigger value="seminars">Seminars</TabsTrigger>` next to Guards
- New `<TabsContent value="seminars">` rendering a new component `SeminarsTab` (sibling to existing `CompetitionsTab`)

New file `src/components/grading-list/SeminarsTab.tsx`:
- Branch filter dropdown (All + distinct branches from rows)
- Sale-status filter dropdown (All / Pending / Paid / Rejected)
- Table columns: Date submitted · Student name · DOB · Branch · Belt · Package · Amount · Proof · Sale status · Match/Invoice · **Collected** (checkbox, editable when unlocked) · Actions
- Action buttons gated by existing unlock levels:
  - Standard unlock (`Hp97533488`) → can verify/match, create invoice, toggle Collected, reject
  - Full unlock (`Hp84311884`) → also shows Trash delete button feeding the existing `DeleteRowConfirmDialog` (extend `PendingDelete` union with `{ kind: 'seminar' }` and handle in `handlePendingDelete`)

**Match / invoice UX (mirrors competitions):**
- Row shows status badge.
- "Find match" opens a dialog listing `find_seminar_submission_student_matches` results.
- If a match is selected → call `admin_match_seminar_submission` then `admin_create_seminar_invoice`; toast shows the new invoice number.
- If no matches → button "Create new student from details" calls `admin_import_seminar_submission` then `admin_create_seminar_invoice`.
- Once invoiced, row shows invoice number + amber chip and disables further matching.

## 4. Routing

`src/App.tsx`:
- `const PublicSeminarPayment = lazy(() => import('./pages/public/PublicSeminarPayment'));`
- `<Route path="/seminars" element={<PublicSeminarPayment />} />`

## 5. Service layer

New `src/services/seminarPaymentSubmissionService.ts` exporting typed wrappers around all RPCs above, matching the shape of `competitionPaymentSubmissionService.ts`.

## Technical notes

- Reuses `getPublicBranches`, `getPublicPaymentOptions`, `PaymentInfoDisplay`, `ProofOfPaymentUpload`, `DobPicker`, belt filters.
- `DeleteRowConfirmDialog` `PendingDelete` union gains a `'seminar'` kind; add the matching branch in `handlePendingDelete`.
- All seminar prices stored in code AND echoed by `admin_create_seminar_invoice` for safety (server is source of truth for amount).
- Auto-uppercase names on insert via RPC (project convention).
- Dates displayed via `@/utils/dateFormat` helpers (DD/MM/YYYY).

## Open questions

1. Should the seminar use the existing `Self-Defense Seminar` product (`bde7a567…`, base $50) re-priced per package, or should a new product **"Unarmed Combat Seminar"** be created (base $81.75) plus a bundle SKU for $130.80? Pricing won't line up with the existing product otherwise.
2. Should the Collected column appear on the Guards tab too, or only Seminars?
