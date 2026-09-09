# "Save $10" label and smarter default term

Two small changes to the school fees step.

## 1. Show the saving next to the price

On the **Full term** option, show a green "Save $10" chip right next to the price whenever discounts apply. The amount is the real total saved (early payment $10, sibling $20 — or $10 at Yishun — so it can read "Save $30"). The wordy "early payment + sibling discount" line is replaced by this chip, with a small caption naming which discounts are included.

The **4 weeks** option shows no saving chip, since discounts don't apply to it.

## 2. Default to the next term

Today the fees step pre-selects the first unpaid term, which is usually the term already running. Instead:

- Default to the **next upcoming term** (the earliest unpaid term that hasn't started yet).
- If there is no upcoming term, fall back to the current term as today.
- If the student is locked to the 4-week plan for a term (they already paid 4 weeks), keep defaulting to the **current** term, because they must keep paying 4 weeks within it.
- The user can still change the term freely from the dropdown.

## Where this applies

Same behaviour on the Hello chat fees step, the student portal "Pay School Fees" dialog, and the public fees page, so all three read the same.

## Technical detail

- In `PublicHelloChat.tsx` `ProductRow`: replace `defaultTerm = selectableTerms[0]` with a helper picking the earliest term whose `start_date > today`, falling back to the current/first unpaid term; skip the upcoming preference when `lockedPlans[currentTermId] === 'four_weeks'`.
- Render `Save $${(early + sibling).toFixed(2)}` as a badge in the full-term card when the total is > 0.
- Mirror the same default-term selection and Save badge in `PaySchoolFeesDialog.tsx` and `PublicSchoolFeesPayment.tsx` (the latter's early-payment discount only; sibling stays staff-applied there).
