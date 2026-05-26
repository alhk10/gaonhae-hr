
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
- **Certificate upload** — only shown when current belt is in `POOM_BELTS` or `DAN_BELTS`, required in that case (image/* only)
- **Coaching fee** — pre-checked, mandatory, $109.00 incl. GST
- **Event categories** — multi-select chips for Individual / Pair / Team, **at least one required**, $98.10 each incl. GST
- Payment method: PayNow (default) / Bank Transfer
- Proof of payment upload (image/* only)

Live total card shows: line items, subtotal, 9% GST, total.

Submit calls the new `submit_competition_payment` RPC, uploads proof + certificate to `payment-proofs` bucket under `public-comps/<branch_id>/...`, and shows the same success state as `/pay`.

### 3. Grading list tab

`PublicGradingList.tsx` already renders a single list. Wrap its content in a `Tabs` component with two tabs:
- **Grading** (existing list, unchanged)
- **Competitions** — new tab showing one row per competition submission, grouped by event date, with columns: Name, Branch, Current belt, Categories, Coaching paid, Categories paid, Certificate (link if uploaded), Status.

Driven by a new `get_public_competition_list` RPC.

### 4. Superadmin approval

New approval section "Competition Registrations" in `BranchDashboard` approvals, mirroring `PublicGradingSubmissionApprovals`:
- Lists pending competition submissions for the branch
- Inline edit of name / DOB / belt / branch before matching
- **Match to student** — uses the same fuzzy-match RPC pattern as grading (`find_competition_submission_student_matches`)
- **Approve** action calls `admin_import_competition_submission`, which:
  1. Resolves the matched student
  2. Creates a draft invoice in the student's branch with the coaching fee line + one line per selected category
  3. Attaches uploaded payment proof to the invoice and posts a payment record (PayNow / bank transfer, pending verification — same flow as existing non-cash submissions)
  4. Stores the certificate file on the student profile if provided
  5. Marks the submission `imported` and links `matched_invoice_id`
- Reject action mirrors `admin_reject_grading_submission`.

### 5. Routing & nav

- Add `<Route path="/comps" element={<PublicCompetitionPayment />} />` in `App.tsx`.
- Add a small "Singapore Open Poomsae" link/card on `/grading-list` directing users to `/comps`.

---

### Technical details

**Migration**

```sql
-- Tag competition products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS kind text;          -- 'grading' | 'competition' | null

-- Submissions
CREATE TABLE public.competition_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE NOT NULL DEFAULT ('COMP-' || to_char(now(),'YYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  first_name text NOT NULL,
  last_name  text NOT NULL,
  email text,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  date_of_birth date,
  current_belt text,
  coaching_product_id uuid REFERENCES public.products(id),
  category_product_ids uuid[] NOT NULL DEFAULT '{}',
  amount numeric(10,2),
  payment_method text NOT NULL CHECK (payment_method IN ('paynow','bank_transfer')),
  proof_url text NOT NULL,
  certificate_url text,                         -- required app-side for Poom/Dan
  status text NOT NULL DEFAULT 'pending_verification',
  matched_student_id uuid REFERENCES public.students(id),
  matched_invoice_id uuid REFERENCES public.invoices(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
ALTER TABLE public.competition_payment_submissions ENABLE ROW LEVEL SECURITY;
-- Public insert; superadmin/branch staff read/update (mirror grading policies).
```

Plus RPCs (security definer, mirror grading equivalents):
- `submit_competition_payment(_rows jsonb)`
- `get_public_competition_list(p_branch_id uuid)`
- `find_competition_submission_student_matches(p_id uuid)`
- `admin_match_competition_submission(p_id, p_student_id)`
- `admin_import_competition_submission(p_id, p_verified_by)`
- `admin_reject_competition_submission(p_id, p_reason, p_reviewed_by)`
- `admin_update_competition_submission_*` (name / branch / belt / categories)

**Frontend files**

- `src/pages/public/PublicCompetitionPayment.tsx` (new)
- `src/services/competitionPaymentSubmissionService.ts` (new)
- `src/components/dashboard/PublicCompetitionSubmissionApprovals.tsx` (new)
- `src/pages/public/PublicGradingList.tsx` — wrap in Tabs, add Competitions tab
- `src/components/dashboard/BranchDashboard.tsx` — mount approvals section
- `src/App.tsx` — add `/comps` route

No changes to existing grading flow.
