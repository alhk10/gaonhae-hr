# Show Kang Klass to York and manage age limits from School Fees settings

## Why it's missing
Kang Klass is switched on at Bukit Merah ($50/week), but it's set for ages 6 to 14 only. York Leung is 15, so /hello hides it from him. His 4th Poom belt is allowed.

## What changes
1. **Remove the Kang Klass age limit now** — any Bukit Merah student with Green belt or above will see it, York included. The belt rule stays.
2. **Age limits in /access > School Fees > settings** — each class gets editable "Age from" and "Age to" boxes next to the existing price and on/off switch. Leave blank for no limit. Saving takes effect on /hello straight away.
   - Age limits belong to the class itself, so changing them applies at every branch (price and on/off stay per branch). The dialog will say this.

## Technical details
- Data change: `products.min_age` / `max_age` set to null for Kang Klass (`cb313a99-…`).
- New SECURITY DEFINER RPC `admin_set_class_product_age_range(p_product_id, p_min_age, p_max_age, p_actor)`: lesson products only, validates 0–99 and min <= max, logs the actor; granted to anon/authenticated like the existing pricing RPC.
- Settings list RPC returns `min_age`/`max_age`; `SchoolFeeProductSettingsDialog.tsx` adds two small number inputs per row, saved alongside `admin_set_class_product_branch_pricing`.
- `/hello` product filtering already respects these fields — no change needed there.
