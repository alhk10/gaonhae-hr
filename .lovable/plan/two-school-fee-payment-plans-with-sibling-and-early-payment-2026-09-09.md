# Two school fee payment plans, with sibling and early-payment discounts

School fees become a choice between two clearly priced options, and the discount rules are applied consistently everywhere fees are paid.

## What changes for the person paying

When they pick a class, only that class stays selected — picking another one replaces it, and the open details collapse. One class at a time.

Under the chosen class, two options appear side by side:

- **4 weeks** — weekly price x 4. No discounts.
- **Full term** — weekly price x the term's teaching weeks, with discounts applied.

Each option shows its own total, so the difference is visible before choosing. A short note under the 4-week option says: once you pay for 4 weeks, you continue on the 4-week plan for the rest of the term.

## Discounts (full term only)

- **Sibling**: $20 off when two or more active students share the same email. Yishun students get $10 instead.
- **Early payment**: $10 off when payment is made on or before the term start date.

Both can apply together. Neither applies to the 4-week option.

## The 4-week lock

Once a 4-week payment has been recorded for a student in a term, only the 4-week option is offered to that student for the remainder of that term. The full-term option is hidden with a short note explaining why. Staff creating an invoice see the same note but are not blocked.

## Where this applies

- The /hello chat school fees step
- The student portal "Pay School Fees" dialog
- The public /fees page
- Staff invoice creation (school fee line items)

## Technical detail

- Add a `payment_plan` value (`four_weeks` | `term`) to the school fee line item metadata alongside the existing `weeks`, `early_payment_discount` and `sibling_discount` keys, so a student's plan for a term can be read back.
- Extend `getSiblingDiscount` in `src/services/invoiceService.ts` to accept/derive the student's branch and return 10 for `yishun`, 20 otherwise; keep the "2+ active students sharing an email" rule.
- Add a shared helper (e.g. `src/utils/schoolFeePlan.ts`) exposing: teaching-week count for a term, the two plan totals, the discount calculation (term-only), and a `getLockedPlanForTerm(studentId, termId)` lookup that inspects paid/verified invoice items' metadata.
- Add a matching database function for the public flows (chat and /fees) that returns the locked plan for a student/term, since those run anonymously through SECURITY DEFINER RPCs.
- `PublicHelloChat.tsx`: make the fee product rows single-select (picking one clears the other drafts), replace the free-text weeks input with the two plan buttons, and drive `qty` and the discount line from the chosen plan. Show the discount lines in the payment summary before GST.
- `PaySchoolFeesDialog.tsx`: replace the current implicit full-term calculation with the same two-option control, reusing the shared helper for both totals and discounts.
- `PublicSchoolFeesPayment.tsx` (/fees): add the same two options; discounts require a matched student, so where no student is matched only the undiscounted term price is shown.
- Staff invoice dialog: add the plan choice on school fee line items, defaulting to full term, with the existing discount metadata written unchanged.
