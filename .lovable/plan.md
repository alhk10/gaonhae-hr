# Bill Foundation 1, 2 and 3 gradings together

## What changes
In Create/Edit Invoice, staff can add several grading items on one invoice when every grading item is a Foundation step:
- Foundation 1 >> Foundation 2
- Foundation 2 >> Foundation 3
- Foundation 3 >> next belt (e.g. Yellow Tag)

Rules:
- Any mix of these foundation steps is allowed together, each once, all for the same grading slot.
- Any non-foundation grading still stays "only 1 grading per invoice". Mixing a foundation step with a non-foundation grading is blocked.
- The same foundation step added twice is still blocked.
- Each line creates its own grading registration, so the grading list shows each step.

## Checks after building
- Kaden Hao En Koh case: Foundation 1>>2 plus Foundation 2>>3 on one invoice saves, totals add up, grading list picks up both.
- Server-side duplicate-grading safeguards (same student + same slot) are checked so the second foundation line is not rejected; if they block it, they get the same foundation exception.
- Small test for the "can these grading items share an invoice" rule.

## Technical details
- Add `isFoundationGradingProduct(name)` / `canCombineGradingItems(names)` helper (reuses `SG_FOUNDATION`, the existing `/hello` multi-foundation logic).
- Replace the check at `InvoiceDialog.tsx` line ~960 and the save-time duplicate check (~line 1100) with the helper.
- Review the duplicate grading insert trigger and `syncGradingRegistrationsForInvoice`; extend to allow multiple foundation registrations per student/slot if needed.
