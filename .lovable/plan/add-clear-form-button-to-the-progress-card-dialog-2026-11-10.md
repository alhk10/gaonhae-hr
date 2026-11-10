# Add "Clear form" button to the Progress Card dialog

## What changes
- A **Clear form** button appears at the bottom left of the Progress Card dialog, beside Cancel / Save.
- Pressing it asks "Clear all ratings and comments on this card?" to confirm.
- On confirm, it empties every rating (Taekwondo Skills and Character Development), the Ready for Grading Test answer, and any comment fields.
- Name, Age, Current Belt, Report Date and Term stay filled in.
- Nothing is saved until Save is pressed; Cancel still discards the changes.

## Technical details
- Edit `src/components/attendance/ProgressCardDialog.tsx` only: add an outline/ghost button in the footer that resets the ratings, readiness and comment state to empty, with an AlertDialog confirm.
