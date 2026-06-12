## Changes to `src/pages/public/PublicCompetitionPayment.tsx`

### 1. Reorder sections inside the `selectedEvent` form
New order after Belt selection:
1. **Participant Photo** (if `require_photo`) — moved up
2. **Certificate Upload (Poom/Dan)** (if `certificateRequired`)
3. **Indemnity Clause** section (text + accept checkbox + signature) — moved up under Certificate
4. Coaching Fee
5. Additional Items
6. Total (with GST line)
7. Passport / Identification (if required)
8. Indemnity Form Upload (if required)
9. Payment Method + Payment Info + Proof of Payment
10. Submit

### 2. Standardise upload fields on `ProofOfPaymentUpload`
Replace the local `FileField` component usage with `ProofOfPaymentUpload` for:
- Participant Photo (`acceptPdf={false}`, label "Participant Photo", help "Clear face photo (passport-style).")
- Passport / Identification (`acceptPdf` true, label "Passport / Identification")
- Indemnity Form Upload (`acceptPdf` true, label "Indemnity Form Upload")

Certificate already uses `ProofOfPaymentUpload`. Keep `FileField` definition removable (delete it).

### 3. GST inclusive breakdown
- Derive GST rate from `selectedBranch.country`: Singapore → 9%, Australia → 10%, otherwise 0%.
- Treat the existing total as **GST-inclusive**.
- Compute `gstAmount = totalAmount - totalAmount / (1 + rate)`.
- In the Total card show:
  - `Total  $190.00`
  - small muted line below: `Includes GST (9%): $15.69` (only when rate > 0 and total > 0)

No DB / service changes — display only, since prices are already inclusive.

## Out of scope
- No changes to submission payload, edge functions, or DB schema.
- Other public payment pages untouched.