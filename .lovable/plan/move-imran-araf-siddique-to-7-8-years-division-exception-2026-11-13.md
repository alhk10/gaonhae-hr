# Move IMRAN ARAF SIDDIQUE to 7-8 Years division (exception)

## What changes
- Update only Imran's Perth 2026 registration (Gaonhae, Geup 8, Male, Taegeuk 2 Jang) so his division is **7-8 Years** instead of 9-11 Years.
- He will then appear in the registered-competitors PDF and staff log under "7-8 Years · Geup 7 & 8 · Male · Taegeuk 2 Jang" alongside XIN HOWE LIM.
- His date of birth, grade, event, price and payment status stay unchanged.

## Technical details
- One data update: `perth_event_registrations` row `5bfd6bc2-...` set `age_division = '7-8'`.
- Check afterwards that no database trigger recalculated it back to 9-11 from DOB; if one does, confirm the stored value persists and note that a later staff edit of his entry may reset it to 9-11.
