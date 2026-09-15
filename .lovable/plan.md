# Switch on Kang's Class at Bukit Merah

## Why it's missing

Kang's Class already exists and is set up correctly: $50 per week, ages 6 to 14, Green belt and above. What it does not have is a branch price anywhere — a class only appears in the Hello chat at branches where a branch price has been set. With none set, it is hidden everywhere, which is why ANISSA KOH saw only the Black Tip & Above options and Ad-Hoc Lesson.

## What to do

- Switch Kang's Class on at Bukit Merah at $50 per week.
- Leave it off at Yishun, Kembangan, Balmoral and Jurong West.
- Each branch can turn it on and set its own weekly price later from Branch Dashboard > Branch setup > Products & Pricing — no code change needed for that.

## Result

A Bukit Merah student aged 6 to 14 with a Green belt or above will see Kang's Class in the School Fees list, priced like the other weekly packages (4 weeks or full term). Students outside that age or belt range, and students at other branches, will not see it.

## Technical note

Insert one active `price_rules` row for product Kang Klass (`cb313a99-f83c-47e0-bc7e-311c6a972fdb`) with `branch_id` = Bukit Merah and `price_override` = 50, via a data change (not a migration). No schema or frontend changes.
