## Remove date/time subtitle under slot title

In `src/pages/public/PublicGradingList.tsx`, the slot card title currently renders the title plus a muted subtitle line (`28/06/2026 · 10:00`) when a `slot_title` is present. Drop the subtitle block so only the slot title shows.

### Out of scope
- No changes to the PDF export, edit mode, or data sources.
