# /guards purchase flow + /guardspurchase-list admin view

## Goal
Sell two protection items to parents/students through a public form (mirroring `/pay` / `/hello` style), capture buyer details for database growth, and give superadmin a way to verify payments, match to students, create invoices, and track collection.

## 1. Public page `/guards` (mirror of `/hello` payment flow)

New file: `src/pages/public/PublicGuardsPurchase.tsx`. Route added in `App.tsx` (`<Route path="/guards" element={<PublicGuardsPurchase />} />`).

**Step 1 – Buyer details** (same field set as `/hello` identify step):
- First name, Last name (auto-uppercased on submit)
- Date of birth (Day / Month / Year selects, DD/MM/YYYY display)
- Branch (dropdown from `branches`)
- Gender (male / female / other)
- Current belt (dropdown; "No belt" → null)
- Email + Phone

**Step 2 – Product selection** (chat-style cards):
- **Gaonhae Protection Guard Set** — $137.61 before GST / **$150.00** after 9% GST (SG)
  - Bundle of: Gaonhae Arm Guards + Gaonhae Shin Guards + Gaonhae Groin Guard
- **Adidas Chest Guard + Head Gear Set** — **$284.30**
- Checkbox + qty per item (default 1). At least one required.
- Subtotal shown live.

**Step 3 – Payment** (reuse `/pay` pattern):
- Singapore branch → automatically include **9% GST** in displayed total (already baked into $150 for Gaonhae set; computed for Adidas set).
- Default **PayNow** for SG, otherwise Bank Transfer. Both supported.
- Proof of payment upload required (image/* only — reject PDFs).
- Submit creates `guards_purchases` row with status `pending_verification`, uploads proof, shows thank-you screen.

## 2. New table `guards_purchases`

Domain-specific columns:
- first_name, last_name, dob, branch_id, gender, current_belt
- email, phone
- items (jsonb: `[{product_key, name, qty, unit_price}]`)
- subtotal, gst_amount, total
- payment_method (`paynow` | `bank_transfer`)
- proof_url
- sale_status (`pending_verification` | `verified` | `rejected` | `cancelled`)
- collected (bool), collected_at, collected_by
- matched_student_id, invoice_id (nullable fks)
- notes

RLS: public INSERT; SELECT/UPDATE/DELETE superadmin only. Storage bucket `guards-proofs` (public upload, superadmin read via signed URL).

## 3. Admin page `/guardspurchase-list`

New file: `src/pages/public/PublicGuardsPurchaseList.tsx`. Mirrors `PublicGradingList.tsx`.

**Gate**: Password prompt (hardcoded `Hp97533488`), stored in `sessionStorage`, with Lock button to clear.

**Filters**: Branch, Sale Status, Collection (collected/not), search by name/phone/email.

**Table columns**:
1. Submitted at (DD/MM/YYYY HH:mm)
2. Buyer (name, DOB, gender, belt)
3. Branch
4. Contact (email + phone)
5. Items (names + qty)
6. Total (GST breakdown tooltip)
7. Payment (method + proof preview/zoom)
8. Sale status (badge + Verify / Reject)
9. **Collected** (checkbox + timestamp)
10. Student match + Invoice link

Mobile: stacked card layout.

## 4. Student matching + invoice creation

Click **Match Student** on a row:
- Auto-suggest students by fuzzy match on (first_name + last_name) AND DOB, narrowed to selected branch. Up to 5 candidates shown with name/DOB/branch/belt/phone.
- **Confirm Match** → sets `matched_student_id`, then **Create Invoice**:
  - Line items map to existing products in `products` table:
    - **Gaonhae Protection Guard Set** → adds 3 line items: Gaonhae Arm Guards, Gaonhae Shin Guards, Gaonhae Groin Guard. Sum of their list prices likely ≠ $137.61, so a negative **"Bundle discount – Gaonhae Protection Set"** adjustment line is added to make the pre-GST subtotal equal **$137.61** exactly.
    - **Adidas Chest Guard + Head Gear Set** → adds the two existing Adidas products; same approach — auto-add a bundle discount line if their summed list prices differ from $284.30 / 1.09 = $260.83 pre-GST. Use the existing Adidas headgear+chestguard bundle discount logic where applicable.
  - SG branch: 9% GST applied to subtotal, producing $150 (Gaonhae set) / $284.30 (Adidas set) totals matching what the buyer paid.
  - Invoice marked `paid` / `verified` since payment received, proof attached, `invoice_id` saved on purchase row.
- **No match** → "Create New Student" dialog prefilled with buyer fields → creates `students` row (default status `trial`) → continues to Create Invoice.

Verify / Reject buttons follow existing Payment Verification flow.

## 5. Wiring

- Resolve product UUIDs for Gaonhae Arm/Shin/Groin guards and the two Adidas items from `products` table; store as constants at top of the admin page (after lookup during build).
- Reuse: `PaymentInfoDisplay`, `ProofOfPaymentUpload`, `useBranches`, `useBranchCountry`, `formatDate`, belt constants.
- New service `src/services/guardsPurchaseService.ts` for CRUD, matching, and invoice creation helpers.

## Technical notes
- SG GST 9% mirrors `/pay`. Gaonhae set price entered as $137.61 pre-GST = $150 after; Adidas set entered so post-GST equals $284.30.
- Storage `guards-proofs`, max 5MB, image/* only.
- Password gate is client-side only; backed by RLS so data isn't readable without superadmin auth. Public `/guards` only INSERTs.
- All dates via `@/utils/dateFormat` helpers.
