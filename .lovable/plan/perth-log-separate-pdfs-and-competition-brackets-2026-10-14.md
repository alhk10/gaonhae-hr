# Perth log: separate PDFs and competition brackets

## What changes
1. **Two separate PDF downloads** in the /perthcomp registration log:
   - **Download Seminar Log PDF** — one section per seminar (PS1, KS1, PS2, KS2), each with its participants and count out of 60.
   - **Download Competition Log PDF** — competition entries only, grouped as below.
2. **Competition grouped by category** (both on screen and in the PDF). Each competitor appears once per event they entered (max 2), under a heading such as:
   `7–8 Years · Female · Geup 8 – Taegeuk 2 Jang — 5 competitors`
3. **Competition order**:
   - Age division youngest first (4–6, 7–8, 9–11, 12–14, 15–17, 18+)
   - Then event from lowest belt upward (Geup 10 → Geup 1, then Poom/Dan Taegeuk 7 → Taebaek)
   - Then gender (Female, then Male)
   - Within a group, competitors sorted by name
4. The on-screen log gets two tabs, "Seminars" and "Competition", each with its own download button; the counts stay at the top.

## Technical details
- Only `src/pages/public/PublicPerthComp.tsx` (log dialog) changes; no database changes.
- Split `downloadPdf` into `downloadSeminarPdf` and `downloadCompetitionPdf` (files `perth-2026-seminar-log.pdf`, `perth-2026-competition-log.pdf`).
- Build competition groups by expanding `comp_events` per registration, keyed by `age_division|event|gender`, sorted by `AGE_DIVISIONS` index, `COMP_EVENTS` index, then gender.
