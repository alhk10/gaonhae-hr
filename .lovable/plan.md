# Fix certificate download icons in student profile Grading

## Problem
In the profile Grading list (e.g. Stella Park, 19/09/2026, Yellow, Double) the medal shows as a faded, non-clickable icon, and Double rows show one icon instead of two.

## Likely causes (to confirm first)
1. The grading record's "from" belt is empty, so no certificate belts are worked out and the faded placeholder appears.
2. The live site (gaonhae.app) may still run an older version without the download buttons — the update needs publishing.

## Changes
- Work out the certificate belts from the grading fee line ("White >> Yellow Tip") when the stored "from" belt is missing; as a last resort, step back from the final belt (Double → two belts back, Pass → one back).
- Double always shows two clickable medals, each labelled with its belt (e.g. White, Yellow Tip); Pass shows one.
- Keep icons clickable even when an uploaded certificate image exists (show the view-image icon alongside).
- Backfill missing "from" belts on existing grading records from their fee line.
- Check Stella Park's record in the data, then click both medals in the preview to confirm two PDFs download.

## Technical details
- `src/utils/gradingOutcome.ts`: add `certificateBeltsFor(history)` using `fee_name` → `gradingOutcome` → fallback via previous-belt lookup in `beltLevels`; add tests (White>>Yellow Tip double → [White, Yellow Tip]; null from + belt_to Yellow + double → two belts).
- `GradingRecordsSection.tsx`: use the new helper; render medals and FileImage side by side.
- Migration: update `grading_history.belt_from` where null using `_grading_effective_belts` of the linked registration.
