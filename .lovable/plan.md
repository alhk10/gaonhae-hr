# Move Leah Giam to the Geup 1 event and block wrong Poom/Dan entries

## What changes
1. **Fix Leah's entry:** Leah Giam (1 Geup) is currently entered in "Poom/Dan – Taegeuk 8 Jang". Move her to "Geup 1 – Taegeuk 8 Jang", the same form, so she competes with Kayden Hii's group. Her payment and other details stay the same.
2. **Stop it happening again:** the public form already blocks geup students from Poom/Dan events. Add the same check when entries are saved, including staff Add/Edit entry, so a geup student can't be saved into a Poom/Dan event and a Poom/Dan holder can't be saved into a geup event.
3. **Check other entries:** look for any other entries with the same mismatch and report them before changing anything.

## Technical details
- Data update: `perth_event_registrations` row for LEAH GIAM, change `comp_events` from `{pd_t8}` to `{g1}`.
- Add the eligibility rule to the registration save functions (`submit_perth_registration`, `admin_perth_upsert_registration`): `pd_*` events only when grade = `poomdan`; `g*` events only when grade is not `poomdan` and the event grade is at or above the student's grade. Same-grade pairs (Geup 10 & 9, Geup 8 & 7) stay the same.
- Run a check query for other mismatched rows.
