## Move the "documents required" preamble above name fields

### What to change
In `src/pages/public/PublicCompetitionPayment.tsx`, move the `Alert` block (lines 578–630) that shows "Before you submit — documents required" from its current position (below coaching fees / extras / total) to just above the first name / last name grid (line 358), still inside the `{selectedEvent && ( ... )}` conditional.

### Why
Participants should see the document checklist before they start filling in personal details, so they know in advance what files to prepare.

### Technical details
- Cut the entire `<Alert>` block at lines 578–630.
- Insert it after the `Event` selector (line 354) and before the first name / last name grid (line 358).
- No logic changes; the block already references `selectedEvent` safely.

No database, API, or other file changes required.