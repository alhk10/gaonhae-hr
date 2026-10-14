# Update /perthcomp competition deadline to 6 November 2026, 23:59 GMT+8

## Change
The competition registration deadline moves from 10 November 2026 to **6 November 2026, 23:59 (GMT+8)**. Perth is UTC+8, so this is enforced as 23:59 on 6 Nov in Perth time.

## Steps

1. **Page text** (`src/pages/public/PublicPerthComp.tsx`, competition card)
   - Change "Registration closes 10 Nov 2026" to "Registration closes 6 Nov 2026, 11:59pm GMT+8".

2. **Server-side enforcement** (new migration)
   - Redefine `get_perth_event_availability()`: closed when Perth time is past timestamp `2026-11-06 23:59`.
   - Redefine `submit_perth_event_registration(jsonb)`: reject competition events after `2026-11-06 23:59` Perth time, with message "Competition registration closed on 6 November 2026".
   - Keep all other rules (eligibility, caps, student matching, pricing) unchanged.

3. **Update project memory** — the Perth Comp 2026 note's deadline line to 6 Nov 2026 23:59 GMT+8.

## Verification
- Confirm the migration applies and the availability function reports the new closed flag correctly.
- Rebuild and confirm the page shows the new date.
