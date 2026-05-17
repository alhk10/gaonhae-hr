# Public Grading Payment Module

Two new fully-public pages within this app (route to subdomains via DNS) plus a backend queue + matcher.

## Routes (public, no auth)
- `/pay` → mounted on `payment.gaonhae.app`
- `/grading-list` → mounted on `gradinglist.gaonhae.app`

(SPA routing already handles deep links; subdomains are wired via Lovable custom-domain settings, both pointed at the same project.)

## Page 1 — `/pay` (Public Grading Payment)
Single-screen form, mobile-first, no login.

Fields:
1. **Student name** (uppercased on save)
2. **Branch** — select from active branches (`useBranches`)
3. **Date of birth** — DD/MM/YYYY picker (shadcn datepicker)
4. **Current belt** — uses `beltLevels` filtered by branch country (`useBranchCountry`)
5. **Grading product** — auto-resolved server-side from (branch, current belt) using existing grading-fee lookup pattern (mem: `grading-fee-product-lookup-pattern`). Show resolved product name + price read-only; if no match, show "No grading fee configured — contact branch".
6. **Payment method** — PayNow only (matches student-portal restriction; Cash hidden).
7. **PayNow QR** — reuse `PaymentInfoDisplay` with branch's active `invoice_templates.paynow_qr_url`.
8. **Proof of payment** — reuse `ProofOfPaymentUpload` (image/* only, mem: proof rules).

Submit → inserts a `grading_payment_submissions` row (status `pending_verification`) + uploads proof to `payment-proofs` bucket. Shows confirmation screen with reference number.

## Page 2 — `/grading-list` (Public Grading List)
Read-only list of upcoming grading registrations, **sorted by grading slot date + start_time, then branch**.

For each slot, list: branch, slot date/time, then students with:
- Name (uppercase)
- Branch
- Belt transition (current → target)
- **Paid status badge**: `Pending verification` / `Paid` / `Unmatched`

Data source: union of
- existing `grading_registrations` (joined with student + slot)
- `grading_payment_submissions` not yet matched to a student (shown with "Unmatched – add profile" tag)

Filters: branch, date range. No PII beyond name/branch/belt.

## Backend

### New table `grading_payment_submissions`
| col | type |
|---|---|
| id | uuid pk |
| student_name | text (uppercased) |
| branch_id | text (fk branches) |
| date_of_birth | date |
| current_belt | text |
| resolved_product_id | uuid nullable |
| resolved_grading_slot_id | uuid nullable (auto-matched: next upcoming slot for branch where `belt_levels` contains current_belt) |
| amount | numeric |
| payment_method | text default 'paynow' |
| proof_url | text |
| matched_student_id | uuid nullable |
| matched_invoice_id | uuid nullable |
| status | text — `pending_verification` | `verified` | `rejected` | `needs_profile` |
| reference_number | text unique (`GP-YYYYMM-####`) |
| created_at, updated_at, reviewed_by, reviewed_at |

RLS:
- `INSERT`: allow anon (public payment).
- `SELECT`: superadmin + branch staff via `has_branch_access(branch_id)`; **public grading-list page uses a SECURITY DEFINER RPC** `get_public_grading_list(branch_id?, from?, to?)` that returns only the safe columns (name, branch, belt transition, paid status, slot time). No direct anon select.
- `UPDATE`: superadmin only.

Storage: extend `payment-proofs` bucket policy to allow anonymous insert under prefix `public-grading/`.

### Auto-matching logic (on submission)
1. Resolve grading product by (branch, current_belt) via existing helper.
2. Resolve grading slot: earliest `grading_slots` where `branch_id` matches (or branch in `available_branch_ids`), `grading_date >= today`, status active, and `current_belt = ANY(belt_levels)`.
3. Match student: case-insensitive name match on `students` + same `date_of_birth` + same `branch_id`.
   - **Match found** → create invoice (status `pending_verification` per mem `invoice-status-verified`), single line item = resolved grading product, payment record attached with proof_url, link `matched_invoice_id` + `matched_student_id`, also insert `grading_registrations` row (existing invoice flow already does this when category=grading).
   - **No match** → status `needs_profile`; surfaces in Approvals queue for staff to either (a) create student, (b) link to existing student (fuzzy suggestions by name only), (c) reject.

### Approvals integration
Add a new section "Grading Payment Submissions" in superadmin Approvals (mem: `approval-sections`). Two queues: `pending_verification` (verify/reject proof) and `needs_profile` (link or create student). Verifying flips linked invoice to `verified`.

## Technical Plan

```
supabase/migrations/<ts>_grading_payment_module.sql
src/pages/public/PublicGradingPayment.tsx        // /pay
src/pages/public/PublicGradingList.tsx           // /grading-list
src/services/gradingPaymentSubmissionService.ts  // insert + matcher + RPC reads
src/components/approvals/GradingPaymentApprovalsSection.tsx
src/utils/gradingSlotAutoMatch.ts
```

Reuse: `PaymentInfoDisplay`, `ProofOfPaymentUpload`, `useBranches`, `useBranchCountry`, `beltLevels`, existing invoice creation (`invoiceService.createInvoice`) which already auto-creates `grading_registrations` for grading-category items.

Add routes in `App.tsx`. Render outside main authed layout (no sidebar/navbar) — minimal public shell with logo.

## Out of scope
- No subdomain DNS config in code (user wires custom domains in Lovable).
- No automated proof verification (always manual via Approvals).
- No edits to existing grading flow for logged-in students.
- No payment gateway integration — PayNow QR + manual proof only.

## Required user action after build
Add `payment.gaonhae.app` and `gradinglist.gaonhae.app` as custom domains pointing to this project; both resolve to the same app and React Router uses `window.location.hostname` to land on the right default route (or simply share the bare paths `/pay` and `/grading-list`).