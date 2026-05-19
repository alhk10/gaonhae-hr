# Accessories Payment Module

Public self-service payment flow for the "Protection Guards & Accessories" product category, mirroring the existing `/pay` (grading) flow.

## Scope

### 1. Public payment page — `/accessories`
Mirror of `PublicGradingPayment.tsx`. User keys in:
- First name, Last name (auto-uppercased)
- Branch (dropdown from `get_public_branches`)
- Date of birth (DD/MM/YYYY via dateFormat helpers)
- Current belt — **optional** dropdown
- Products: select **one or more** items from the **Protection Guards & Accessories** category (id `117cdc13-1296-4651-bc4b-f0449873cbf1`), with qty per item. Prices use `price_rules` branch overrides. Total auto-calculated.
- Payment method: PayNow QR / Bank Transfer (same `invoice_templates` lookup, same `PaymentInfoDisplay` blue/purple cards)
- Proof-of-payment upload — image/* only, no PDF (per global rule)

On submit → row in new `accessory_payment_submissions` with `status='pending_verification'`, reference `AP-YYYYMM-####`, proof stored in existing `payment-proofs` bucket.

### 2. Admin/public list page — `/accessories-list`
Mirror of `/grading-list` (PublicGradingList.tsx) layout & approval flow. Table of submissions:
- Columns: Reference, Date, Branch, Student name, Products (summary), Amount, Paid status (pending / verified / rejected), Match badge
- Two top-of-page dropdown filters: **Branch** (default "All branches") and **Product** (default "All products")
- Row actions follow the same approval pattern as `/pay` + `/grading-list`:
  - View proof
  - **Verify** → on click, auto-match by `(UPPER(first+last), date_of_birth, branch_id)`:
    - Match found → create one **combined invoice** under that student with all line items (branch-priced), mark paid, link `proof_url`, set `matched_student_id` + `matched_invoice_id`. Status → `verified`.
    - No match → status stays `pending_verification`, row shows "No matching profile — **Suggest Add Student**" CTA (same UX as grading-list unmatched flow) which opens the public `/register` form prefilled with name / branch / DOB.
  - **Reject** (with reason)

### 3. Auto-invoice on match
Single combined invoice per submission:
- Line items = submitted products × qty at branch-overridden prices
- Marked paid, payment method = submission.payment_method, proof_url linked
- Stored on submission: `matched_student_id`, `matched_invoice_id`

## Technical Details

### New DB objects
- Table `public.accessory_payment_submissions`:
  - `reference_number` (AP-YYYYMM-####)
  - `first_name`, `last_name`, `display_name`
  - `branch_id`, `date_of_birth`, `current_belt` (nullable)
  - `email` (nullable)
  - `items jsonb` — `[{product_id, name, qty, unit_price, line_total}]`
  - `amount`, `payment_method`, `proof_url`
  - `matched_student_id`, `matched_invoice_id`
  - `status` (pending_verification | verified | rejected), `notes`, `result`
  - `reviewed_by`, `reviewed_at`, created_at/updated_at
- Trigger + `generate_accessory_payment_reference()` (same pattern as grading)
- RLS:
  - Anonymous INSERT allowed (public submission)
  - SELECT/UPDATE only for `has_branch_access(branch_id)` or `superadmin`
- RPCs:
  - `get_public_accessory_products(p_branch_id text)` → active products in category `117cdc13…` with branch-priced overrides
  - `admin_verify_accessory_submission(p_id uuid, p_verified_by text)` (mirrors grading verify)

### New code
- `src/pages/public/PublicAccessoriesPayment.tsx`
- `src/pages/public/PublicAccessoriesList.tsx`
- `src/services/accessoryPaymentSubmissionService.ts` (submit, list, verify with auto-match → combined invoice, reject)
- Routes added to `src/App.tsx`: `/accessories`, `/accessories-list`

### Reuses
- `payment-proofs` storage bucket
- `invoice_templates` for PayNow QR / bank info
- `PaymentInfoDisplay`, `ProofOfPaymentUpload`
- `productService` + `priceRulesService` for branch-priced product fetch
- Existing invoice creation service for matched-student combined invoice
- `/register` for the "Suggest Add Student" prefilled flow

## Out of Scope
- Editing/cancelling submissions by the public user
- Stock decrement (can layer later)
- Push/email notifications on submission
