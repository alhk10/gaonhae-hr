# Add "Per Lesson" and Kang's Class to the Hello fee options

## What changes for students

On /hello, after picking School Fees, the list of packages will also be able to show:

- **Per Lesson** — the existing Ad-Hoc Lesson item, charged per lesson (branch prices: Bukit Merah $43.75, Yishun and Jurong West $45, Kembangan $46.25, Balmoral $50). The student chooses how many lessons; no 4-week / full-term multiplication and no term discounts.
- **Kang's Class** — priced $50 a week, charged like the other packages (4 weeks or full term).

Both only appear at branches that run them, and Kang's Class only for the belts you allow. Age limits are also respected.

## What changes for staff

Branch Dashboard > Branch setup > **Products & Pricing** tab gains, for lesson products, an editable **Age** range (from / to) and **Belts** selector alongside the existing branch price and visibility switch. Leaving them blank means no restriction. A student is only offered a lesson product if their age is inside the range and their belt is in the list — everywhere the packages are offered (Hello chat and the standalone fees page).

Note: age and belt limits are a property of the product itself, so editing them from a branch changes them for every branch. Branch price and the visibility switch stay per branch.

## Setup done as part of this work

- Kang Klass base price set to $50 per week (currently $200 flat, no branch prices), kept hidden at branches until you switch it on.
- Per Lesson (Ad-Hoc Lesson) already has branch prices and stays as it is.

## Technical notes

- `get_public_chat_products_for_student`: drop `Ad-Hoc Lesson` from the excluded-name list (keep `Trial Lesson` and `Private Lesson` excluded), and add `min_age` / `max_age` filtering against the student's date of birth alongside the existing `allowed_belt_levels` check. Products still need an active branch `price_rules` row to show, which is what keeps them branch-scoped.
- `PublicHelloChat.tsx`: products returned with `is_term_based = false` (ad-hoc) render with a lesson-quantity stepper and a line total of `branch_price x lessons`; they skip the 4 Weeks / Full Term selector, the sibling and early-payment discounts and the four-week lock. Kang Klass is term-based like the belt packages and needs no special case.
- `schoolFeePlan.ts`: sort groups extended — Little Gaonhae, Foundation to Red, Black Tip & Above, Kang Klass, Per Lesson, then the rest.
- `ProductsPricingTab.tsx`: load `min_age`, `max_age`, `allowed_belt_levels`, `is_lesson`; show the two extra columns for lesson rows only; save via an `update` on `products` in the existing Save Changes pass (branch price/visibility keeps going through `upsertBranchPrice`).
- Data change (run_sql, not a migration): Kang Klass `base_price` 200 -> 50.
