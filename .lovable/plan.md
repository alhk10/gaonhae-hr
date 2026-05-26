## Competition Payments (`/comps`) — Singapore Open Poomsae

Mirror of `/pay` for competition registration, with a new submissions table, a tab on the public grading list, and a Superadmin approval flow that matches the submitter to a student profile and auto-generates an invoice.

---

### 1. Products (Sales > Products)

Real products tagged with a new `kind = 'competition'` flag:

| Product name | Base price (SGD) | With 9% GST |
|---|---|---|
| Singapore Open Poomsae — Coaching Fee | 100.00 | 109.00 |
| Singapore Open Poomsae — Category: Individual | 90.00 | 98.10 |
| Singapore Open Poomsae — Category: Pair | 90.00 | 98.10 |
| Singapore Open Poomsae — Category: Team | 90.00 | 98.10 |

Products are looked up by the new `kind` column so future competitions can be added without code changes.

### 2. Public page `/comps`

Visually mirrors `/pay` (same `Card`, `DobPicker`, `PaymentInfoDisplay`, `ProofOfPaymentUpload`).

Form fields:
- First name (uppercase on save)
- Last name (uppercase on save)
- Email
- Branch (Singapore branches; locks PayNow/bank info)
- Date of birth (DobPicker)
- Current belt (filtered by age, same rules as `/pay`)
- **Certificate upload** — only when current belt is Poom or Dan, required in that case (image/* only)
- **Coaching fee** — pre-checked, mandatory, $109.00 incl. GST
- **Event categories** — multi-select chips for Individual / Pair / Team, at least one required, $98.10 each incl. GST
- Payment method: PayNow (default) / Bank Transfer
- Proof of payment upload (image/* only)

Live total card shows line items, subtotal, 9% GST, total. Submit uploads proof + certificate to `payment-proofs` bucket under `public-comps/<branch_id>/...` and shows the same success state as `/pay`.

### 3. Grading list tab

Wrap `PublicGradingList` content in Tabs:
- **Grading** (existing, unchanged)
- **Competitions** — new tab listing submissions with Name, Branch, Current belt, Categories, Coaching paid, Categories paid, Certificate, Status. Driven by `get_public_competition_list`.

### 4. Superadmin approval

New "Competition Registrations" section in `BranchDashboard` approvals, mirroring `PublicGradingSubmissionApprovals`:
- Lists pending competition submissions
- Inline edit of name / DOB / belt / branch before matching
- **Match to student** via fuzzy-match RPC
- **Approve** calls `admin_import_competition_submission`:
  1. Resolves matched student
  2. Creates draft invoice with coaching line + one line per selected category
  3. Attaches proof and posts a pending non-cash payment
  4. Stores certificate on student profile if provided
  5. Marks submission `imported`, links `matched_invoice_id`
- Reject mirrors grading reject.

### 5. Routing & nav

- `/comps` route in `App.tsx`
- Small "Singapore Open Poomsae" link on `/grading-list` directing to `/comps`

---

### Technical details

**Migration**

- `ALTER TABLE products ADD COLUMN kind text` ('grading' | 'competition' | null)
- New `competition_payment_submissions` table with: reference_number, first_name, last_name, email, branch_id, date_of_birth, current_belt, coaching_product_id, category_product_ids uuid[], amount, payment_method ('paynow'|'bank_transfer'), proof_url, certificate_url, status ('pending_verification' default), matched_student_id, matched_invoice_id, notes, reviewed_at, reviewed_by. RLS enabled — public insert, branch staff / superadmin read/update.

**RPCs** (security definer, mirror grading equivalents):
- `submit_competition_payment`
- `get_public_competition_list`
- `find_competition_submission_student_matches`
- `admin_match_competition_submission`
- `admin_import_competition_submission`
- `admin_reject_competition_submission`
- `admin_update_competition_submission_*` (name / branch / belt / categories)

**Frontend files**
- `src/pages/public/PublicCompetitionPayment.tsx` (new)
- `src/services/competitionPaymentSubmissionService.ts` (new)
- `src/components/dashboard/PublicCompetitionSubmissionApprovals.tsx` (new)
- `src/pages/public/PublicGradingList.tsx` — wrap in Tabs, add Competitions tab
- `src/components/dashboard/BranchDashboard.tsx` — mount approvals section
- `src/App.tsx` — add `/comps` route

No changes to existing grading flow.
